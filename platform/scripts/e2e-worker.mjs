/**
 * E2E worker harness — boots the REAL application worker inside Miniflare.
 *
 *   - entry:    platform/src/index.ts (bundled with esbuild → ESM, placed in a
 *               temp file so Miniflare loads it as an ESModule via modulesRules).
 *   - config:   platform/wrangler.jsonc → Miniflare options (workers-oauth-provider,
 *               Hono, REST, DO/MCP, D1, KV, R2) via wrangler's config parser.
 *   - secrets:  platform/.dev.vars merged in as plain-text bindings — exactly
 *               like `wrangler dev`.
 *   - Google:   the ONLY external seam stubbed via outboundService → inline
 *               `google-mock` worker (token + userinfo endpoints). Every other
 *               hop runs real worker code.
 *   - HTTP:     raw node:http server → mf.dispatchFetch(redirect:"manual")
 *               so 302s reach the browser untouched.
 *
 * Run from platform/: `node scripts/e2e-worker.mjs`
 */
import { createServer } from "node:http";
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { splitSqlStatements } from "./sql-split.mjs";
import { tmpdir } from "node:os";
import { Miniflare } from "miniflare";
import { unstable_getMiniflareWorkerOptions } from "wrangler";
import esbuild from "esbuild";

const PORT = Number(process.env.E2E_WORKER_PORT ?? 8787);
const OUTBOUND = [
  "https://oauth2.googleapis.com/token",
  "https://www.googleapis.com/oauth2/v2/userinfo",
];

// --- Bundle the worker entry so Miniflare can load it as ESM ----------------
const entry = join(process.cwd(), "src/index.ts");
const result = await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: "esm",
  target: "es2022",
  platform: "node",
  // Cloudflare runtime aliases are provided natively by workerd/Miniflare.
  external: ["cloudflare:workers", "cloudflare:email", "cloudflare:html"],
});
const workerCode = result.outputFiles[0].text;

// Write bundle to a temp .mjs so Miniflare resolves it as an ESModule path.
const tmpDir = mkdtempSync(join(tmpdir(), "baka-e2e-"));
const bundlePath = join(tmpDir, "worker.mjs");
writeFileSync(bundlePath, workerCode);
console.log(`[e2e-worker] bundled ${entry} (${workerCode.length} bytes → ${bundlePath})`);

// Inline google-mock as an ESM module file (outboundService entrypoint needs it).
const googleMockPath = join(tmpDir, "google-mock.mjs");
writeFileSync(googleMockPath, `
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const isToken    = url.origin === "https://oauth2.googleapis.com" && url.pathname === "/token";
    const isUserInfo = url.origin === "https://www.googleapis.com" && url.pathname === "/oauth2/v2/userinfo";
    if (isToken) {
      const form = new URLSearchParams(await request.text());
      const code = form.get("code") ?? "";
      const sub = code.startsWith("e2e-") ? code.slice(4) : (code || "probe");
      return Response.json({ access_token: "at-" + sub, refresh_token: "rt-" + sub, expires_in: 3600, scope: "openid email profile", token_type: "Bearer" });
    }
    if (isUserInfo) {
      const auth = request.headers.get("Authorization") ?? "";
      const sub = auth.startsWith("Bearer at-") ? auth.slice("Bearer at-".length) : "unknown";
      return Response.json({ id: sub, sub, name: "E2E User " + sub, email: sub + "@example.com" });
    }
    return new Response("not found", { status: 404 });
  },
};
`);
console.log(`[e2e-worker] wrote google-mock → ${googleMockPath}`);

// --- Fake Google (outboundService target) -----------------------------------
//   POST https://oauth2.googleapis.com/token                 (code exchange)
//   GET  https://www.googleapis.com/oauth2/v2/userinfo       (profile)
// The E2E test controls the subject via code=e2e-<sub>; the fake maps the code
// into the access token so userinfo returns that subject — real per-user isolation.

// --- wrangler config → Miniflare options (same path `wrangler dev` uses) ----
const { workerOptions } = unstable_getMiniflareWorkerOptions("wrangler.jsonc");

// devVars: config + .dev.vars secrets (the probe showed these come back as scalar
// bindings) overlaid with our local E2E values (APP_ORIGIN/CORS point at :8787).
// TEST_LOCAL=1 allows non-Secure cookies for local dev/test (Secure flag requires HTTPS).
const devVars = {
  ...(workerOptions.bindings ?? {}),
  APP_ORIGIN: "http://localhost:8787",
  CORS_ALLOWED_ORIGINS: "http://localhost:5173",
  SYNC_LOCK_TTL_SECONDS: "60",
  TEST_LOCAL: "1",
};

const mf = new Miniflare({
  workers: [
    {
      name: "bakatracker-platform",
      compatibilityDate: workerOptions.compatibilityDate,
      compatibilityFlags: workerOptions.compatibilityFlags,
      modulesRules: workerOptions.modulesRules,
      // Bundled ESM entry as a single module.
      modules: [{ type: "ESModule", path: bundlePath }],
      bindings: devVars,
      kvNamespaces: workerOptions.kvNamespaces,
      d1Databases: workerOptions.d1Databases,
      r2Buckets: workerOptions.r2Buckets,
      durableObjects: workerOptions.durableObjects,
      // Every outbound fetch from the worker goes to the fake Google worker.
      outboundService: "google-mock",
    },
    {
      name: "google-mock",
      // ESM module (export default fetch handler) so outboundService's
      // default entrypoint resolves. Loaded via modulesRules like the app worker.
      modules: [{ type: "ESModule", path: join(tmpDir, "google-mock.mjs") }],
    },
  ],
});

// --- Apply D1 migrations (wrangler dev does this; Miniflare does not) -------
// The authoritative migration source is platform/migrations/*.sql. Miniflare's
// D1 `exec()` rejects comment-leading multi-statement SQL, so statements are
// split by the shared adapter (scripts/sql-split.mjs) — a transport/runtime
// compatibility detail, never a second schema source (see db-verify.mjs).
const db = await mf.getD1Database("BAKA_DB");
const migrationsDir = join(process.cwd(), "migrations");
for (const file of readdirSync(migrationsDir).sort()) {
  if (!file.endsWith(".sql")) continue;
  const sql = readFileSync(join(migrationsDir, file), "utf8");
  const statements = splitSqlStatements(sql);
  await db.batch(statements.map((s) => db.prepare(s)));
  console.log(`[e2e-worker] applied migration ${file} (${statements.length} statements)`);
}

// --- HTTP proxy: browser → mf.dispatchFetch (3xx passed through) ------------
// redirect:"manual" keeps worker 302s (→ Google, → SPA) in the response so the
// browser follows the real chain.
const server = createServer(async (req, res) => {
  try {
    const rawUrl = req.url ?? "/";
    const url = new URL(rawUrl, `http://localhost:${PORT}`);
    // Build headers for the upstream request — copy all, drop host.
    const inHeaders = Object.fromEntries(
      Object.entries(req.headers).filter(([, v]) => v !== undefined && v !== null),
    );
    delete inHeaders.host;
    delete inHeaders.connection;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    // dispatchFetch accepts (input: string | Request, init?) — pass the URL string
    // + init directly (no double Request wrapping, which breaks URL parsing).
    const upstream = await mf.dispatchFetch(url.toString(), {
      method: req.method,
      headers: inHeaders,
      body,
      redirect: "manual",
    });
    // Collect ALL response headers (including set-cookie) BEFORE writeHead,
    // since node's writeHead finalizes the header block.
    const setCookies = upstream.headers.getSetCookie() || [];
    const otherHeaders = [...upstream.headers.entries()].filter(
      ([k]) => k.toLowerCase() !== "set-cookie",
    );
    res.writeHead(upstream.status, [...otherHeaders, ...setCookies.map((c) => ["set-cookie", c])]);
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (upstream.status >= 400 && upstream.status < 600) {
      console.error(`[proxy] ${req.method} ${url.pathname} → ${upstream.status}:`, buf.toString().slice(0, 500));
    } else {
      console.log(`[proxy] ${req.method} ${url.pathname} → ${upstream.status}`);
    }
    res.end(buf);
  } catch (err) {
    console.error("[e2e-worker] proxy error:", err);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(String(err));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[e2e-worker] listening on http://localhost:${PORT} (real worker, fake Google via outboundService)`);
  console.log("[e2e-worker] Google endpoints stubbed:", ...OUTBOUND);
});