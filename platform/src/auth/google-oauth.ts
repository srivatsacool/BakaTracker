/**
 * Upstream (Google) OAuth client helpers.
 * The Worker acts as an OAuth *client* to Google, and as an OAuth *provider*
 * to MCP clients — see https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/
 */

export interface GoogleUserInfo {
  sub: string;
  name?: string;
  email?: string;
}

/** Build Google's authorization URL (OAuth 2.1 + PKCE via state; offline for refresh tokens). */
export function getGoogleAuthorizeUrl({
  client_id,
  redirect_uri,
  scope,
  state,
}: {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state?: string;
}): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", client_id);
  u.searchParams.set("redirect_uri", redirect_uri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", scope);
  u.searchParams.set("access_type", "offline"); // gives refresh_token for long-lived MCP sessions
  u.searchParams.set("prompt", "consent");
  if (state) u.searchParams.set("state", state);
  return u.href;
}

/**
 * Exchange the authorization code at Google's token endpoint.
 * Google returns JSON (unlike GitHub's form-encoded body).
 */
export async function fetchGoogleToken({
  client_id,
  client_secret,
  code,
  redirect_uri,
}: {
  client_id: string;
  client_secret: string;
  code: string | undefined;
  redirect_uri: string;
}): Promise<[GoogleToken, null] | [null, Response]> {
  if (!code) return [null, new Response("Missing code", { status: 400 })];
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      code,
      redirect_uri,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!resp.ok) {
    console.error("Google token exchange failed:", await resp.text());
    return [null, new Response("Failed to fetch access token", { status: 500 })];
  }
  const body = (await resp.json()) as GoogleToken;
  if (!body.access_token) return [null, new Response("Missing access token", { status: 400 })];
  return [body, null];
}

export interface GoogleToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

/** Fetch the user's Google profile (sub, name, email). */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const resp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo?alt=json", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Google userinfo failed: ${resp.status}`);
  // NOTE: the v2 userinfo endpoint returns the subject as `id`, NOT `sub`
  // (the `sub` claim only exists in the OIDC id_token / v1 userinfo).
  // Normalize: honor `sub` if present, else map `id` -> `sub`.
  const body = (await resp.json()) as GoogleUserInfo & { id?: string };
  return { sub: body.sub ?? body.id ?? "", name: body.name, email: body.email };
}