/**
 * APP_ORIGIN canonicalization + CORS allowlist (production security pass).
 *
 * APP_ORIGIN is the single source of truth for the app's public origin. It is
 * used for:
 *   - the Google OAuth redirect_uri (exact origin match, never prefix/request-derived)
 *   - the CORS allowlist (which browser origins may read API responses)
 *   - gating the local-dev auth bypass (REST_DEV_BYPASS only on localhost)
 *
 * `new URL(...).origin` gives `scheme://host[:port]` — no path, no query, no
 * trailing slash, no username/password — the EXACT match semantics the OAuth
 * spec wants.
 */

/** Parse + canonicalize a raw origin string. Returns null when unusable. */
export function canonicalAppOrigin(raw: string | undefined | null): string | null {
  if (!raw || raw.trim().length === 0) return null;
  try {
    const u = new URL(raw.trim());
    // Only http(s) is ever acceptable (wrangler dev / production / preview).
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // new URL().origin drops path/query/hash → exact origin by construction.
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * The Google OAuth callback URI for this instance.
 * ALWAYS built from the canonical origin — never from the incoming request
 * URL/host, so the redirect target is identical on every code path and matches
 * the redirect_uri Google validated at authorize time.
 */
export function oauthCallbackUri(rawOrigin: string | undefined | null): string | null {
  const origin = canonicalAppOrigin(rawOrigin);
  return origin ? `${origin}/callback` : null;
}

/** True when the canonical origin is a local loopback host (dev only). */
export function isLocalDevOrigin(raw: string | undefined | null): boolean {
  const origin = canonicalAppOrigin(raw);
  if (!origin) return false;
  const host = origin.replace(/^[a-z]+:\/\//i, "").split(":")[0].toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

/**
 * CORS allowlist: the app's own origin always allowed, plus any comma-separated
 * extra origins from `CORS_ALLOWED_ORIGINS` (e.g. the Pages/UI origin in prod,
 * or http://localhost:5173 for the Vite dev server). Exact-origin compare only —
 * no wildcards, no prefix/substring matching.
 */
export function isAllowedCorsOrigin(
  candidate: string | undefined | null,
  appOriginRaw: string | undefined | null,
  extraRaw: string | undefined | null,
): boolean {
  if (!candidate) return false;
  const target = canonicalAppOrigin(candidate);
  if (!target) return false;

  const appOrigin = canonicalAppOrigin(appOriginRaw);
  if (appOrigin && target === appOrigin) return true;

  if (extraRaw) {
    for (const raw of extraRaw.split(",")) {
      const extra = canonicalAppOrigin(raw);
      if (extra && target === extra) return true;
    }
  }
  return false;
}