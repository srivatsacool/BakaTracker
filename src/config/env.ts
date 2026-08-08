export const config = {
  auth: {
    // Google OAuth is handled BY the Cloudflare Worker (workers-oauth-provider):
    // the SPA redirects to the worker's /authorize, and the worker talks to
    // Google. The SPA only needs the worker URL + the Google client id to show
    // the correct marker in the UI.
    clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '',
    redirectUri: window.location.origin,
  },
  api: {
    // Cloudflare Worker URL (wrangler dev → http://localhost:8787).
    baseUrl: (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8787',
    version: 'v2',
  },
};