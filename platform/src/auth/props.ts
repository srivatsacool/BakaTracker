/** Authenticated identity carried from the OAuth flow into the MCP Durable Object. */
export interface Props extends Record<string, unknown> {
  /** Google `sub` (stable user id). */
  sub: string;
  name?: string | null;
  email?: string | null;
  /** Google access token — available to tools that need to call Google APIs. */
  accessToken?: string;
  /** Present only if the user granted offline access (refresh_token). */
  refreshToken?: string;
}