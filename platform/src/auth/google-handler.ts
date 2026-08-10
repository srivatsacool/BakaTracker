/**
 * Google OAuth handler — the "login with Google" side of BakaTracker.
 *
 * Mounted as the OAuth provider's default handler. It:
 *   1. renders an approval dialog (or redirects straight through for approved clients)
 *   2. redirects to Google's consent screen
 *   3. on callback, exchanges the code, reads the user's profile, and hands the
 *      identity to workers-oauth-provider via completeAuthorization().
 *
 * SECURITY (production pass):
 *   - redirect_uri is ALWAYS `canonicalAppOrigin(APP_ORIGIN) + "/callback"` —
 *     never derived from the incoming request URL/host, so the value Google
 *     validated at /authorize is byte-identical at /callback.
 *   - APP_ORIGIN is required; a missing/invalid value fails closed (500),
 *     there is no silent fallback to the request origin.
 *
 * LOCAL-ONLY COOKIE RELAXATION (TEST_LOCAL):
 *   Test/local environments run the OAuth flow over plain-HTTP loopback
 *   (wrangler dev, the E2E harness), where `__Host-` + Secure cookies cannot
 *   be set. testLocalEnabledForRequest() relaxes cookie names/flags ONLY when
 *   TEST_LOCAL is set AND the request origin is a loopback host — a
 *   production origin always keeps `__Host-` + Secure, even with the env var.
 */
import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import type { Env } from "../env";
import {
  addApprovedClient,
  bindStateToSession,
  createOAuthState,
  generateCSRFProtection,
  isClientApproved,
  OAuthError,
  renderApprovalDialog,
  testLocalEnabledForRequest,
  validateCSRFToken,
  validateOAuthState,
} from "../workers-oauth-utils";
import type { Props } from "./props";
import { getGoogleAuthorizeUrl, fetchGoogleToken, fetchGoogleUserInfo } from "./google-oauth";
import { oauthCallbackUri } from "./app-origin";

export const GOOGLE_SCOPES = "openid email profile";

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  const { clientId } = oauthReqInfo;
  if (!clientId) return c.text("Invalid request", 400);

  const testLocal = testLocalEnabledForRequest(c.env.TEST_LOCAL, c.req.url);

  // Already approved -> skip the dialog but still create + bind state.
  if (await isClientApproved(c.req.raw, clientId, c.env.COOKIE_ENCRYPTION_KEY!, testLocal)) {
    const { stateToken } = await createOAuthState(oauthReqInfo, c.env.OAUTH_KV);
    const { setCookie: sessionCookie } = await bindStateToSession(stateToken, testLocal);
    return redirectToGoogle(c.req.raw, stateToken, { "Set-Cookie": sessionCookie }, c.env);
  }

  const { token: csrfToken, setCookie } = generateCSRFProtection(testLocal);
  return renderApprovalDialog(c.req.raw, {
    client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
    csrfToken,
    server: {
      name: "BakaTracker",
      description: "Local-first personal AI productivity OS — sign in with Google.",
      logo: "https://lh3.googleusercontent.com/a/AItbvmlkXLnRwsFm1AAfEXOFwLqCzG4VycSkQMYxQm8l=s96-c",
    },
    setCookie,
    state: { oauthReqInfo },
  });
});

app.post("/authorize", async (c) => {
  try {
    const testLocal = testLocalEnabledForRequest(c.env.TEST_LOCAL, c.req.url);
    const formData = await c.req.raw.formData();
    validateCSRFToken(formData, c.req.raw, testLocal);

    const encodedState = formData.get("state");
    if (!encodedState || typeof encodedState !== "string") return c.text("Missing state", 400);
    let state: { oauthReqInfo?: AuthRequest };
    try {
      state = JSON.parse(atob(encodedState));
    } catch (_e) {
      return c.text("Invalid state data", 400);
    }
    if (!state.oauthReqInfo?.clientId) return c.text("Invalid request", 400);

    const approvedCookie = await addApprovedClient(
      c.req.raw, state.oauthReqInfo.clientId, c.env.COOKIE_ENCRYPTION_KEY!, testLocal,
    );
    const { stateToken } = await createOAuthState(state.oauthReqInfo, c.env.OAUTH_KV);
    const { setCookie: sessionCookie } = await bindStateToSession(stateToken, testLocal);

    const headers = new Headers();
    headers.append("Set-Cookie", approvedCookie);
    headers.append("Set-Cookie", sessionCookie);
    return redirectToGoogle(c.req.raw, stateToken, Object.fromEntries(headers), c.env);
  } catch (error: any) {
    console.error("POST /authorize error:", error);
    return error instanceof OAuthError ? error.toResponse() : c.text(`Internal server error: ${error.message}`, 500);
  }
});

function redirectToGoogle(
  request: Request,
  stateToken: string,
  headers: Record<string, string> = {},
  requestEnv?: Env,
) {
  // Strict redirect_uri: ALWAYS the configured origin's callback. Never
  // derived from request.url — the Worker may be reached via the dev proxy
  // port or a custom domain, and a request-derived origin would both break
  // Google's exact-match registration and enable redirect malleability.
  const redirectUri = oauthCallbackUri(requestEnv?.APP_ORIGIN);
  if (!redirectUri) {
    return new Response("Server misconfigured: APP_ORIGIN is invalid or missing", { status: 500 });
  }
  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      location: getGoogleAuthorizeUrl({
        client_id: requestEnv?.GOOGLE_CLIENT_ID ?? "",
        redirect_uri: redirectUri,
        scope: GOOGLE_SCOPES,
        state: stateToken,
      }),
    },
  });
}

app.get("/callback", async (c) => {
  let oauthReqInfo: AuthRequest;
  let clearSessionCookie: string;
  try {
    const result = await validateOAuthState(
      c.req.raw,
      c.env.OAUTH_KV,
      testLocalEnabledForRequest(c.env.TEST_LOCAL, c.req.url),
    );
    oauthReqInfo = result.oauthReqInfo;
    clearSessionCookie = result.clearCookie;
  } catch (error: any) {
    return error instanceof OAuthError ? error.toResponse() : c.text("Internal server error", 500);
  }
  if (!oauthReqInfo.clientId) return c.text("Invalid OAuth request data", 400);

  // Strict: token exchange must use the SAME canonical callback URI that was
  // sent to Google at /authorize (down to the exact origin) — a mismatch here
  // makes Google reject the exchange outright. Never the request host.
  const redirect_uri = oauthCallbackUri(c.env.APP_ORIGIN);
  if (!redirect_uri) return c.text("Server misconfigured: APP_ORIGIN is invalid or missing", 500);

  // Exchange code for tokens.
  const [token, err] = await fetchGoogleToken({
    client_id: c.env.GOOGLE_CLIENT_ID!,
    client_secret: c.env.GOOGLE_CLIENT_SECRET!,
    code: c.req.query("code"),
    redirect_uri,
  });
  if (err) return err;

  // Identity.
  const user = await fetchGoogleUserInfo(token.access_token);

  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    metadata: { label: user.name ?? user.email ?? user.sub },
    props: { sub: user.sub, name: user.name, email: user.email, accessToken: token.access_token, refreshToken: token.refresh_token } as Props,
    request: oauthReqInfo,
    scope: oauthReqInfo.scope,
    userId: user.sub,
  });

  const headers = new Headers({ Location: redirectTo });
  if (clearSessionCookie) headers.set("Set-Cookie", clearSessionCookie);
  return new Response(null, { status: 302, headers });
});

export { app as GoogleHandler };