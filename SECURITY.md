# BakaTracker Security — v2

This document summarizes the security model of BakaTracker v2. It replaces
the v1 (Auth0/JWT + static token) model — auth is now Google OAuth issued by
the Worker itself, and all data is owner-scoped.

---

## Authentication

- **Google OAuth 2.0 (Authorization Code + PKCE)** via
  `@cloudflare/workers-oauth-provider` (`platform/src/auth/`).
- The Worker is the OAuth **authorization server** (`/.well-known/oauth-authorization-server`),
  validates the Google code at `/callback`, and issues its own access tokens.
- Every `/api/v1/*` request is authenticated: `Authorization: Bearer <token>`
  is unwrapped with `unwrapToken` into `{ sub, name, email }`. **No token → 401.**
- `redirect_uri` is always `canonicalAppOrigin(APP_ORIGIN) + "/callback"` and
  is validated to be byte-identical at `/authorize` and `/callback`.

## Authorization

- **Single-user by design.** All repositories scope reads and writes to the
  authenticated `sub` (owner). There is no multi-tenancy surface.
- **Guest/demo mode** (`bt_demo_mode`, guest provider in `features/auth`)
  is frontend-only local data; it never reaches the Worker API.

## Secrets

- Never committed: `.env*`, `platform/.dev.vars`, `platform/wrangler.prod.jsonc`
  are gitignored.
- Production secrets live in **Wrangler secrets** (encrypted at rest by
  Cloudflare), referenced as `env.GOOGLE_CLIENT_SECRET`, etc.
- Logging is secret-safe: the AI service strips tokens/keys from logs by design.

## Data Protection

- **D1** (notes, habits, tasks, journal, stats) — owner-scoped queries.
- **R2** (binaries) — file ids are owner-scoped; no public bucket access.
- **KV** — OAuth state/tokens and notification settings per user
  (`baka:notif:*:{sub}`).
- **PWA/service worker** — precaches only static assets from the build.

## Development Safety

- `REST_DEV_BYPASS=1` (in `.dev.vars`) trusts an `X-User-Sub` header so the
  UI can exercise the API before OAuth is wired. **This is a local-only
  escape hatch — it must never be set in production.** The production gate
  (`test:pages`) additionally asserts the built `index.html` contains no
  `localhost` or source-tree references.

## Reporting

Found a vulnerability? Open a GitHub issue with the **private** report flag,
or contact the maintainer via the repository. Do not open a public issue for
security-critical findings.
