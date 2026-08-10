import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import {
  canonicalAppOrigin,
  isAllowedCorsOrigin,
  isLocalDevOrigin,
  oauthCallbackUri,
} from "../src/auth/app-origin";
import {
  bindStateToSession,
  cookieNames,
  createOAuthState,
  testLocalEnabledForRequest,
  timingSafeEqual,
  validateOAuthState,
} from "../src/workers-oauth-utils";

/**
 * Production security pass — auth, CORS, redirect_uri, CSRF/state, expiry.
 *
 * These tests target the boundaries the security model depends on. They run
 * against the same cloudflare:test pool as the main suite (R2 + D1 + KV), so
 * they execute the REAL handlers, not mocks.
 *
 * NOTE: the pool loads .dev.vars (REST_DEV_BYPASS=1 + APP_ORIGIN=localhost),
 * so the REST API accepts X-User-Sub. The security-relevant assertions are
 * structural: CORS allowlist behavior, invalid-bearer rejection, and the
 * loopback gate on the dev bypass. The bypass itself is exercised by the rest
 * of the suite; here we prove it CANNOT work when APP_ORIGIN is not local.
 */

// ---------------------------------------------------------------------------
// 1. redirect_uri === canonical APP_ORIGIN (exact origin, no prefix/substring)
// ---------------------------------------------------------------------------
describe("redirect_uri strict validation (app-origin)", () => {
  it("canonicalizes to the exact origin — strips path/query/trailing slash", () => {
    expect(canonicalAppOrigin("https://baka.example.com")).toBe("https://baka.example.com");
    expect(canonicalAppOrigin("https://baka.example.com/")).toBe("https://baka.example.com");
    expect(canonicalAppOrigin("https://baka.example.com/app")).toBe("https://baka.example.com");
    expect(canonicalAppOrigin("https://baka.example.com/app?x=1#h")).toBe("https://baka.example.com");
    // explicit port is preserved (dev)
    expect(canonicalAppOrigin("http://localhost:8787")).toBe("http://localhost:8787");
    expect(canonicalAppOrigin("http://localhost:8787/callback")).toBe("http://localhost:8787");
  });

  it("rejects non-http(s) schemes and unparseable input", () => {
    expect(canonicalAppOrigin("javascript:alert(1)")).toBeNull();
    expect(canonicalAppOrigin("file:///etc/passwd")).toBeNull();
    expect(canonicalAppOrigin("")).toBeNull();
    expect(canonicalAppOrigin("   ")).toBeNull();
    expect(canonicalAppOrigin("not a url")).toBeNull();
    expect(canonicalAppOrigin(undefined)).toBeNull();
  });

  it("builds the callback URI from the canonical origin only", () => {
    expect(oauthCallbackUri("https://baka.example.com")).toBe("https://baka.example.com/callback");
    expect(oauthCallbackUri("https://baka.example.com/")).toBe("https://baka.example.com/callback");
    expect(oauthCallbackUri("bogus")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. CORS allowlist — exact origins only, no wildcard/reflection
// ---------------------------------------------------------------------------
describe("CORS allowlist", () => {
  const APP = "https://baka.example.com";

  it("allows the configured app origin exactly", () => {
    expect(isAllowedCorsOrigin(APP, APP, undefined)).toBe(true);
    expect(isAllowedCorsOrigin(`${APP}/app`, APP, undefined)).toBe(true); // origin-compare, path is inert
    expect(isAllowedCorsOrigin("https://baka.example.com.evil.com", APP, undefined)).toBe(false);
    expect(isAllowedCorsOrigin("https://evil-baka.example.com", APP, undefined)).toBe(false);
    expect(isAllowedCorsOrigin("http://baka.example.com", APP, undefined)).toBe(false); // scheme matters
    expect(isAllowedCorsOrigin("https://baka.example.com:8443", APP, undefined)).toBe(false); // port matters
  });

  it("allows extra origins from CORS_ALLOWED_ORIGINS (comma-separated, exact)", () => {
    const extra = "http://localhost:5173,https://ui.pages.dev";
    expect(isAllowedCorsOrigin("http://localhost:5173", APP, extra)).toBe(true);
    expect(isAllowedCorsOrigin("https://ui.pages.dev", APP, extra)).toBe(true);
    expect(isAllowedCorsOrigin("https://evil.pages.dev", APP, extra)).toBe(false);
    expect(isAllowedCorsOrigin("null", APP, extra)).toBe(false);
  });

  it("rejects missing/blank origins and wildcards", () => {
    expect(isAllowedCorsOrigin(undefined, APP, "*")).toBe(false);
    expect(isAllowedCorsOrigin("*", APP, "*")).toBe(false);
    expect(isAllowedCorsOrigin("", APP, "*")).toBe(false);
    expect(isAllowedCorsOrigin("https://any.thing", APP, "*")).toBe(false); // no wildcard semantics
  });

  it("enforces the allowlist on live preflight requests", async () => {
    // Allowed origin (from the dev template vars) → ACAO echoed.
    const okPreflight = await SELF.fetch("http://localhost/api/v1/whoami", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "GET" },
    });
    expect(okPreflight.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");

    // Disallowed origin → NO ACAO header (browser blocks the read).
    const evilPreflight = await SELF.fetch("http://localhost/api/v1/whoami", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example.com", "Access-Control-Request-Method": "GET" },
    });
    expect(evilPreflight.headers.get("access-control-allow-origin")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Bearer validation + expiry — deterministic 401, no legacy fallback
// ---------------------------------------------------------------------------
describe("bearer token validation (expiry)", () => {
  it("rejects a garbage/expired bearer with 401 even when X-User-Sub is present", async () => {
    const res = await SELF.fetch("http://localhost/api/v1/whoami", {
      headers: {
        Authorization: "Bearer definitely-not-a-real-token",
        "X-User-Sub": "attacker-claimed-sub",
      },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
  });

  it("rejects a non-Bearer Authorization scheme with 401", async () => {
    const res = await SELF.fetch("http://localhost/api/v1/whoami", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing credentials with 401 (no anonymous access)", async () => {
    const res = await SELF.fetch("http://localhost/api/v1/whoami");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 4. Dev bypass must never run on a non-local APP_ORIGIN
// ---------------------------------------------------------------------------
describe("REST_DEV_BYPASS loopback gate", () => {
  it("isLocalDevOrigin: loopback hosts only", () => {
    expect(isLocalDevOrigin("http://localhost:8787")).toBe(true);
    expect(isLocalDevOrigin("http://127.0.0.1:8787")).toBe(true);
    expect(isLocalDevOrigin("https://baka.example.com")).toBe(false);
    expect(isLocalDevOrigin("https://bakatracker-platform.srivatsagorti.workers.dev")).toBe(false);
    expect(isLocalDevOrigin(undefined)).toBe(false);
  });

  it("live: X-User-Sub with APP_ORIGIN=localhost (pool .dev.vars) IS honored", async () => {
    const res = await SELF.fetch("http://localhost/api/v1/whoami", {
      headers: { "X-User-Sub": "dev-bypass-sub" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sub).toBe("dev-bypass-sub");
  });
});

// ---------------------------------------------------------------------------
// 5. Constant-time comparisons (CSRF token + state hash)
// ---------------------------------------------------------------------------
describe("timingSafeEqual", () => {
  it("matches exact strings, rejects any difference", () => {
    expect(timingSafeEqual("abc123", "abc123")).toBe(true);
    expect(timingSafeEqual("abc123", "abc124")).toBe(false);
    expect(timingSafeEqual("abc123", "abc12")).toBe(false); // different length
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("handles unicode + long digests (SHA-256 hex) without throwing", () => {
    const digest = "a".repeat(64);
    expect(timingSafeEqual(digest, digest)).toBe(true);
    expect(timingSafeEqual(digest, "b".repeat(64))).toBe(false);
    expect(timingSafeEqual("üñïçødé-トークン", "üñïçødé-トークン")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. OAuth state lifecycle — bound to the flow, validated exactly once
// ---------------------------------------------------------------------------
describe("OAuth state lifecycle", () => {
  const oauthReqInfo = {
    clientId: "test-client",
    redirectUri: "http://localhost/callback",
    scope: "mcp__test",
    responseType: "code",
  };

  function buildCookie(value: string): string {
    return `__Host-CONSENTED_STATE=${value}`;
  }

  it("accepts a valid, session-bound state exactly once (then deletes it)", async () => {
    const { stateToken } = await createOAuthState(oauthReqInfo, env.OAUTH_KV);
    const { setCookie } = await bindStateToSession(stateToken);
    const hash = setCookie.split("=")[1].split(";")[0];

    const req = new Request(`http://localhost/callback?state=${stateToken}`, {
      headers: { Cookie: buildCookie(hash) },
    });
    const result = await validateOAuthState(req, env.OAUTH_KV);
    expect(result.oauthReqInfo.clientId).toBe("test-client");
    expect(result.clearCookie).toContain("Max-Age=0"); // cookie cleared → one-time use

    // Replay: state was deleted from KV → rejected.
    const replay = new Request(`http://localhost/callback?state=${stateToken}`, {
      headers: { Cookie: buildCookie(hash) },
    });
    await expect(validateOAuthState(replay, env.OAUTH_KV)).rejects.toThrow(/Invalid or expired state/);
  });

  it("rejects missing state", async () => {
    const req = new Request("http://localhost/callback");
    await expect(validateOAuthState(req, env.OAUTH_KV)).rejects.toThrow(/Missing state/);
  });

  it("rejects state never issued by this server (not in KV)", async () => {
    const req = new Request("http://localhost/callback?state=attacker-supplied-state", {
      headers: { Cookie: buildCookie("deadbeef") },
    });
    await expect(validateOAuthState(req, env.OAUTH_KV)).rejects.toThrow(/Invalid or expired state/);
  });

  it("rejects a valid KV state with a mismatched session cookie (cross-browser CSRF)", async () => {
    const { stateToken } = await createOAuthState(oauthReqInfo, env.OAUTH_KV);
    const req = new Request(`http://localhost/callback?state=${stateToken}`, {
      headers: { Cookie: buildCookie("some-other-sessions-hash") },
    });
    await expect(validateOAuthState(req, env.OAUTH_KV)).rejects.toThrow(/does not match session/);
  });

  it("rejects missing session cookie", async () => {
    const { stateToken } = await createOAuthState(oauthReqInfo, env.OAUTH_KV);
    const req = new Request(`http://localhost/callback?state=${stateToken}`);
    await expect(validateOAuthState(req, env.OAUTH_KV)).rejects.toThrow(/Missing session binding cookie/);
  });
});

// ---------------------------------------------------------------------------
// 7. Cookie attributes on the OAuth flow (Secure/HttpOnly/SameSite/Path)
// ---------------------------------------------------------------------------
describe("OAuth cookie attributes", () => {
  it("CSRF cookie is __Host- prefixed with full security attributes", async () => {
    // Register a real client so /authorize reaches the approval dialog.
    const reg = await SELF.fetch("http://localhost/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "security-spec-client",
        redirect_uris: ["http://localhost/callback"],
        scopes: ["mcp__test"],
      }),
    });
    expect(reg.status).toBe(201);
    const client = (await reg.json()) as { client_id: string };

    // GET /authorize renders the approval dialog with a fresh CSRF cookie.
    const res = await SELF.fetch(
      `http://localhost/authorize?client_id=${client.client_id}&redirect_uri=${encodeURIComponent("http://localhost/callback")}&response_type=code&scope=mcp__test&state=abc`,
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/__Host-CSRF_TOKEN=/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toMatch(/Max-Age=600/);
  });
});

// ---------------------------------------------------------------------------
// 8. TEST_LOCAL loopback gate — relaxation is env AND loopback origin.
//    Production cookie semantics (__Host- + Secure) must survive even if
//    TEST_LOCAL=1 is set on a production deployment.
// ---------------------------------------------------------------------------
describe("TEST_LOCAL cookie relaxation loopback gate", () => {
  it("cookieNames: production = __Host- + Secure; relaxed = plain + no Secure", () => {
    const prod = cookieNames(false);
    expect(prod.csrf).toBe("__Host-CSRF_TOKEN");
    expect(prod.state).toBe("__Host-CONSENTED_STATE");
    expect(prod.approved).toBe("__Host-APPROVED_CLIENTS");
    expect(prod.secureFlag).toContain("Secure");

    const relaxed = cookieNames(true);
    expect(relaxed.csrf).toBe("CSRF_TOKEN");
    expect(relaxed.state).toBe("CONSENTED_STATE");
    expect(relaxed.approved).toBe("APPROVED_CLIENTS");
    expect(relaxed.secureFlag).toBe("");
  });

  it("relaxes ONLY for loopback HTTP origins when TEST_LOCAL=1", () => {
    expect(testLocalEnabledForRequest("1", "http://localhost:8787/authorize")).toBe(true);
    expect(testLocalEnabledForRequest("1", "http://127.0.0.1:8787/authorize")).toBe(true);
    expect(testLocalEnabledForRequest("1", "https://localhost:8787/callback")).toBe(true);
  });

  it("NEVER relaxes on a non-loopback origin, even with TEST_LOCAL=1 (prod invariant)", () => {
    expect(testLocalEnabledForRequest("1", "https://baka.example.com/authorize")).toBe(false);
    expect(testLocalEnabledForRequest("1", "http://baka.example.com/authorize")).toBe(false);
    expect(
      testLocalEnabledForRequest("1", "https://bakatracker-platform.srivatsagorti.workers.dev/callback"),
    ).toBe(false);
    expect(testLocalEnabledForRequest("1", "https://baka.example.com.evil.com/authorize")).toBe(false);
  });

  it("never relaxes without the env opt-in, regardless of origin", () => {
    expect(testLocalEnabledForRequest(undefined, "http://localhost:8787/authorize")).toBe(false);
    expect(testLocalEnabledForRequest("0", "http://localhost:8787/authorize")).toBe(false);
    expect(testLocalEnabledForRequest("", "http://localhost:8787/authorize")).toBe(false);
    expect(testLocalEnabledForRequest("false", "http://localhost:8787/authorize")).toBe(false);
  });

  it("live: pool has no TEST_LOCAL → /authorize keeps __Host- + Secure on a loopback URL", async () => {
    // The vitest pool loads .dev.vars WITHOUT TEST_LOCAL, so even the loopback
    // URL must yield full production cookie semantics. (The E2E harness is the
    // only place TEST_LOCAL=1 is injected, and it is loopback — its cookie
    // relaxation is verified by the browser E2E, not here.)
    const reg = await SELF.fetch("http://localhost/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: "testlocal-gate-client",
        redirect_uris: ["http://localhost/callback"],
        scopes: ["mcp__test"],
      }),
    });
    expect(reg.status).toBe(201);
    const client = (await reg.json()) as { client_id: string };

    const res = await SELF.fetch(
      `http://localhost/authorize?client_id=${client.client_id}&redirect_uri=${encodeURIComponent("http://localhost/callback")}&response_type=code&scope=mcp__test&state=abc`,
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/__Host-CSRF_TOKEN=/);
    expect(setCookie).toContain("Secure");
  });
});