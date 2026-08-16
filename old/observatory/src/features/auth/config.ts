import { config as envConfig } from '../../config/env';

/**
 * v2 auth configuration.
 *
 * In v2 the Cloudflare Worker owns Google OAuth (workers-oauth-provider).
 * The React app is an OAuth CLIENT of the Worker: it redirects to the
 * Worker's /authorize, exchanges the returned code at /token, and then calls
 * REST with `Authorization: Bearer <worker-issued token>`.
 *
 * `domain` is kept (as the Worker base URL) so the frozen UI gate
 * `Boolean(authConfig.domain && authConfig.clientId)` still decides
 * "Google login is configured" exactly as before.
 */
export const authConfig = {
  domain: envConfig.api.baseUrl,
  clientId: envConfig.auth.clientId,
  audience: '',
  redirectUri: envConfig.auth.redirectUri,
};