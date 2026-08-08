/**
 * Google OAuth handler — the "login with Google" side of BakaTracker.
 *
 * Mounted as the OAuth provider's default handler. It:
 *   1. renders an approval dialog (or redirects straight through for approved clients)
 *   2. redirects to Google's consent screen
 *   3. on callback, exchanges the code, reads the user's profile, and hands the
 *      identity to workers-oauth-provider via completeAuthorization().
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
  validateCSRFToken,
  validateOAuthState,
} from "../workers-oauth-utils";
import type { Props } from "./props";
import { getGoogleAuthorizeUrl, fetchGoogleToken, fetchGoogleUserInfo } from "./google-oauth";

export const GOOGLE_SCOPES = "openid email profile";

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  const { clientId } = oauthReqInfo;
  if (!clientId) return c.text("Invalid request", 400);

  // Already approved → skip the dialog but still create + bind state.
  if (await isClientApproved(c.req.raw, clientId, c.env.COOKIE_ENCRYPTION_KEY!)) {
    const { stateToken } = await createOAuthState(oauthReqInfo, c.env.OAUTH_KV);
    const { setCookie: sessionCookie } = await bindStateToSession(stateToken);
    return redirectToGoogle(c.req.raw, stateToken, { "Set-Cookie": sessionCookie }, c.env);
  }

  const { token: csrfToken, setCookie } = generateCSRFProtection();
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
    const formData = await c.req.raw.formData();
    validateCSRFToken(formData, c.req.raw);

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
      c.req.raw, state.oauthReqInfo.clientId, c.env.COOKIE_ENCRYPTION_KEY!,
    );
    const { stateToken } = await createOAuthState(state.oauthReqInfo, c.env.OAUTH_KV);
    const { setCookie: sessionCookie } = await bindStateToSession(stateToken);

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
  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      location: getGoogleAuthorizeUrl({
        client_id: requestEnv?.GOOGLE_CLIENT_ID ?? "",
        // Use the stable configured origin (APP_ORIGIN) for the Google redirect_uri
        // rather than request.url, so it is identical whether the worker is reached
        // via the wrangler dev proxy port (8787) or its direct internal port.
        // Google requires an exact, pre-registered redirect URI match.
        redirect_uri: `${requestEnv?.APP_ORIGIN ?? new URL(request.url).origin}/callback`,
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
    const result = await validateOAuthState(c.req.raw, c.env.OAUTH_KV);
    oauthReqInfo = result.oauthReqInfo;
    clearSessionCookie = result.clearCookie;
  } catch (error: any) {
    return error instanceof OAuthError ? error.toResponse() : c.text("Internal server error", 500);
  }
  if (!oauthReqInfo.clientId) return c.text("Invalid OAuth request data", 400);

  // Exchange code for tokens.
  const [token, err] = await fetchGoogleToken({
    client_id: c.env.GOOGLE_CLIENT_ID!,
    client_secret: c.env.GOOGLE_CLIENT_SECRET!,
    code: c.req.query("code"),
    // Must match the redirect_uri sent to Google at /authorize (stable APP_ORIGIN),
    // never request.url's host/port which varies between proxy and direct hits.
    redirect_uri: `${c.env.APP_ORIGIN}/callback`,
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