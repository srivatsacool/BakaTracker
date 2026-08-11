# Phase 5 — Cloudflare Pages Readiness (frontend deployment contract)

Status: COMPLETE (development/verification phase — production untouched)

## Problem

The v2 frontend had no explicit deployment story for Cloudflare Pages:

- The SPA depended on a single hardcoded mode: `wrangler dev`/Vite dev with
  `http://localhost:8787` and default `base: '/'` assumptions.
- No mechanism forced `VITE_API_BASE_URL` to be configured in production —
  a missing value silently leaked `localhost` into the production bundle.
- SPA deep routes (`/journey`, `/habits`, `/tasks`, …) 404'd on any static
  host that does not rewrite unknown paths to `index.html`.
- No test suite proved the Pages deployment contract (bundle origin, no
  localhost, no secrets, SPA fallback files) before publishing.
- The `CORS_ALLOWED_ORIGINS` allowlist had no first-class way to admit a
  Pages/UI origin during `npm run setup`.

## Current architecture

```
                BakaTracker
                     │
      ┌──────────────┴──────────────┐
      │                             │
 Cloudflare Pages              API Worker (platform/)
      │                             │
  dist/ (SPA + PWA)           D1 · KV · R2
      │                             │
  _redirects                        │
      │                             │
  SPA fallback ────────────► VITE_API_BASE_URL
                                      │
                                 /api/v1/*
```

The frontend is a pure static React SPA (Vite build). All backend traffic —
REST, OAuth, MCP — goes to the Cloudflare Worker whose origin is baked into
the bundle at build time as `VITE_API_BASE_URL`. The SPA never talks to
Google directly; the Worker owns the OAuth conversation.

## Two frontend deployment paths

There are TWO supported ways to serve the exact same `dist/` artifact. They
are independent and use different SPA-fallback mechanisms — do not merge them.

### PATH A — Cloudflare Pages (dashboard / static hosting)

```
dist/
  ├── index.html
  ├── assets/
  └── _redirects        ← SPA fallback
```

- Pages serves static files exactly; any unmatched path is rewritten by
  `public/_redirects` → `/* /index.html 200` (copied verbatim into `dist/`
  by Vite).
- No dashboard setting needed: the `_redirects` file makes SPA fallback
  work identically for every Pages project using this repo.

### PATH B — Wrangler Workers Assets (root assets-only Worker)

```
dist/
  ├── index.html
  └── assets/

root wrangler.jsonc
  assets.not_found_handling: single-page-application
```

- The root `wrangler.jsonc` is an assets-only Worker (no `main` handler).
  `@cloudflare/vite-plugin` (vite.config.ts) writes `dist/wrangler.json`
  with `assets.directory: "."` at build time, so `wrangler dev` /
  `wrangler deploy` from the repo root serve `dist/` as Workers Assets.
- `assets.not_found_handling: single-page-application` rewrites unmatched
  paths to `index.html` — the Workers Assets equivalent of `_redirects`.
- `dist/wrangler.json` is excluded from published assets via
  `.assetsignore` (build manifest, not site content).

On PATH A, `_redirects` is active and `single-page-application` is inert;
on PATH B the reverse is true. Keeping both configured costs nothing and
makes either deployment shape correct out of the box.

## Build

```bash
npm run build        # tsc -b && vite build
```

Produces `dist/` (gitignored): `index.html`, `assets/`, PWA artifacts
(`manifest.webmanifest`, `sw.js`, `registerSW.js`), and `_redirects`.
All asset references are root-absolute (`base: '/'`), so the artifact
works at the origin root on both deployment paths.

## Environment variables

### Public browser configuration (build-time, set in Pages env)

| Variable | Meaning |
|---|---|
| `VITE_API_BASE_URL` | Worker origin serving REST + OAuth + MCP (e.g. `https://bakatracker-platform.<sub>.workers.dev`). Required in production — missing value is a **hard error** (`src/config/env.ts` fails loud instead of leaking `localhost`). |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID — used only as a UI marker ("Google login configured") and the `authConfig` gate. The SPA never holds the secret. |

Local dev convenience: with `VITE_API_BASE_URL` unset and `import.meta.env.DEV`
true, the SPA falls back to `http://localhost:8787`. This fallback is
build-time dead code in production builds (pages-check asserts it never
appears in `dist/`).

### Worker secrets (never browser-visible)

`GOOGLE_CLIENT_SECRET`, `COOKIE_ENCRYPTION_KEY`, `GEMINI_API_KEY` are set via
`wrangler secret put` (production) or `platform/.dev.vars` (local). The
secrets never enter the bundle; pages-check greps the built JS for secret
patterns to prove it.

## OAuth

The SPA is an OAuth **client of the Worker** (RFC 7591 DCR + RFC 7636 PKCE).
There is no SPA `/callback` route — the Worker's `/callback` is where Google
redirects, and the SPA's `redirect_uri` is `window.location.origin` (the code
arrives on the app with `?code=…&state=…`, handled by `AuthProvider` on any
route):

```
SPA
 ├─ POST /register        (DCR: public client, PKCE only, redirect_uris=[SPA origin])
 ├─ GET  /authorize       (client_id, code_challenge S256, state, redirect_uri=SPA origin)
 │        └─ Worker → Google consent → Worker /callback
 ├─ code arrives at SPA origin (?code&state)  ← verified against sessionStorage state
 └─ POST /token           (code + code_verifier) → access token
        └─ GET /api/v1/whoami  with Authorization: Bearer <token>
```

Security model:

- `APP_ORIGIN` is the Worker's own origin (`setup.mjs --domain` or
  workers.dev subdomain). It is the strict anchor for CORS and the source
  of the exact Google redirect URI `{APP_ORIGIN}/callback`.
- The code→state binding and PKCE verifier live in sessionStorage; the
  single-use code is exchanged exactly once (even under StrictMode double
  mounts).
- Unauthenticated REST → deterministic `401 {"error":"unauthorized",…}`
  — verified, not assumed.
- Production cookie handling keeps `__Host-`/Secure; only loopback
  (`TEST_LOCAL=1`) relaxes that for local dev.

## CORS

Setup is the only writer of the production CORS allowlist:

```bash
npm run setup -- --ui-origin https://app.pages.dev     # repeatable
```

`setup.mjs` canonicalizes each value with `new URL(v).origin` and joins them
into `CORS_ALLOWED_ORIGINS` in the generated `platform/wrangler.prod.jsonc`
(comma-separated). The runtime helper (`platform/src/auth/app-origin.ts`)
always allows `APP_ORIGIN` itself, so `--ui-origin` is only for OTHER
browser origins (Pages, custom UI domains). No wildcards, no reflection —
requests with no `Origin` header (curl, MCP, same-origin) pass through
untouched. `--dry-run` prints the allowlist without touching anything.

## `_redirects`

`public/_redirects` ships the SPA fallback as a tracked file:

```
/*  /index.html  200
```

Why it exists alongside the Wrangler fallback:

- Pages deployments (PATH A) only rewrite via `_redirects`; the Wrangler
  setting is invisible to them. This file makes a Pages project correct
  with zero dashboard configuration.
- Wrangler Workers Assets (PATH B) use `not_found_handling`; `_redirects`
  is then inert static content (harmless).
- Exact static files (assets/*, sw.js, icons) are served directly by both
  paths and never pass through the rewrite.

## Pages deployment-contract verification

```bash
npm run test:pages        # 10 tests — node:test, no browser, no network
```

Each run executes the REAL build (`npm run build`) with a test origin and
asserts:

1. production-shaped build compiles; `dist/assets` has JS bundles
2. the bundle embeds the configured `VITE_API_BASE_URL` — and NOT
   `http://localhost:8787`
3. the bundle embeds `VITE_GOOGLE_CLIENT_ID`
4. no server-only secrets in the bundle (client secret, cookie key, CF
   token, Gemini key, `wrangler.prod`, `.dev.vars`)
5. Pages SPA fallback: `public/_redirects` has the `/* /index.html 200`
   rule and survives the build into `dist/`
6. Wrangler assets worker: root `wrangler.jsonc` sets
   `single-page-application`
7. `dist/index.html` is root-relative, source-tree-free, localhost-free
8. PWA artifacts present (`manifest.webmanifest`, `sw.js`, `registerSW.js`)
9. `setup --dry-run --ui-origin` reports the Pages origin in the CORS
   allowlist (and never a wildcard)
10. `setup --dry-run` default reports no extra UI origins

## Local Pages-like verification (Todo 7 — actual procedure & result)

Goal: prove the production-shaped chain locally without faking Pages —
production build → static serving → configured API origin → real Worker →
real auth boundary. The only stubbed seam is Google's external endpoints
(the E2E harness stubs them; nothing else is faked).

```bash
# 1. Production build pointed at the LOCAL worker (the same fail-loud path
#    Pages uses, just with a local origin)
VITE_API_BASE_URL=http://localhost:8787 \
VITE_GOOGLE_CLIENT_ID=todo7-verify.apps.googleusercontent.com \
npm run build

# 2. Real API Worker (platform/scripts/e2e-worker.mjs — real worker, real
#    D1, only Google stubbed). E2E_CORS_ORIGINS mirrors what setup.mjs
#    --ui-origin writes in production.
cd platform
E2E_CORS_ORIGINS="http://localhost:4173,http://localhost:5173" \
  node scripts/e2e-worker.mjs          # → http://localhost:8787

# 3. Pages-like static server honoring the REAL dist/_redirects (PATH A)
cd ..
node scripts/pages-like-server.mjs 4173    # → http://localhost:4173
```

Results (all captured 2026-08-11):

| Check | Command | Result |
|---|---|---|
| API auth boundary, no auth | `curl http://localhost:8787/api/v1/whoami` | **401** `{"error":"unauthorized","hint":"missing bearer token"}` |
| CORS allowlist (Pages-like origin) | `curl -H "Origin: http://localhost:4173" …/api/v1/whoami` | **401** + `access-control-allow-origin: http://localhost:4173` |
| Browser-native connectivity | in-page `fetch('http://localhost:8787/api/v1/whoami')` from `http://localhost:4173` | **401**, JSON body readable → CORS passed, auth boundary rejected |
| Deep SPA route (PATH A) | `curl http://localhost:4173/journey` | **200** `<!doctype html>` (index.html via `_redirects`) |
| More real routes | `/habits`, `/tasks`, `/` | all **200** |
| Static assets | `assets/index-*.js`, `sw.js` | served directly, correct MIME |
| Client render at deep route | browser → `http://localhost:4173/journey` | SPA boots, React Router handles the route (unauthenticated → Landing), **zero console errors** |
| PATH B — Wrangler assets | `npx wrangler dev --port 8788` (root) then `curl http://localhost:8788/journey` | **200** text/html via `single-page-application` (Workers Assets headers) |

Nothing was bypassed: no token was injected, no auth was disabled, the
`/api/v1/whoami` 401 is the real Worker's real auth boundary.

## Tests (this phase)

- `scripts/pages-check.test.mjs` — 10 deployment-contract tests
  (`npm run test:pages`), listed above.
- `scripts/pages-like-server.mjs` — the Pages-like static server used by
  the local verification above (PATH A only; PATH B uses wrangler).
- `platform/scripts/e2e-worker.mjs` — gained `E2E_CORS_ORIGINS` so a
  Pages-like static origin can be put on the CORS allowlist for the same
  real-worker boot the browser E2E suite uses.

## Gates

Full regression after this phase (see phase doc gates for baselines):
platform pool 45/45, migration CLI 7/7, Playwright E2E 5/5, Pages 10/10,
`tsc` clean, lint baseline unchanged, `npm run build` green, root
`wrangler deploy --dry-run` green.

## Production safety

Nothing in this phase touched production: no Worker deploy, no remote D1
migration, no KV/R2 writes, no DNS or OAuth configuration changes. The
phase ends at *deployment-ready and locally verified* — deployment itself
is a later, explicit step.