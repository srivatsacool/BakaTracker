/**
 * Frontend environment configuration.
 *
 * The values come from Vite env vars (`import.meta.env`), which are
 * injected at BUILD time:
 *
 *   - local dev:      .env or shell vars (see .env.example)
 *   - production:     Cloudflare Pages environment variables
 *                     (VITE_API_BASE_URL, VITE_GOOGLE_CLIENT_ID)
 *
 * VITE_API_BASE_URL is the Cloudflare Worker origin that serves REST +
 * OAuth (e.g. https://bakatracker-platform.<your-sub>.workers.dev).
 * In production builds a missing value is a hard error — we must never
 * silently route traffic to localhost.
 */

function apiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  // Local dev convenience: `wrangler dev` listens on 8787 by default.
  if (import.meta.env.DEV) return "http://localhost:8787";

  // Production build without configuration — fail loudly instead of
  // silently pointing the app at localhost.
  throw new Error(
    "VITE_API_BASE_URL is not set. Configure it as a Cloudflare Pages " +
      "environment variable (your Worker's origin, e.g. " +
      "https://<worker-name>.<account-subdomain>.workers.dev), or set it " +
      "in .env for local builds.",
  );
}

export const config = {
  auth: {
    // Google OAuth is handled BY the Cloudflare Worker (workers-oauth-provider):
    // the SPA redirects to the worker's /authorize, and the worker talks to
    // Google. The SPA only needs the worker URL + the Google client id to show
    // the correct marker in the UI.
    clientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || "",
    redirectUri: window.location.origin,
  },
  api: {
    // Cloudflare Worker URL (wrangler dev → http://localhost:8787).
    baseUrl: apiBaseUrl(),
    version: "v2",
  },
};