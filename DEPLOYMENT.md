# BakaTracker Deployment Guide — v2 (Cloudflare)

This guide covers deploying BakaTracker v2: Cloudflare resources, Google
OAuth, the Worker API, and the frontend on Cloudflare Pages. The v1
Cloud Run / Apps Script deployment is archived in `extra/` and no longer
applies.

---

## Architecture at a Glance

| Piece | Target |
|---|---|
| Backend API (REST + OAuth + MCP + AI) | Cloudflare Worker (`platform/`) |
| Database | Cloudflare D1 (`bakas_db`) |
| Binary storage | Cloudflare R2 |
| OAuth state / notifications | Cloudflare KV (`OAUTH_KV`) |
| Frontend | Cloudflare Pages (build `dist/`) |
| Scheduled tasks | Worker `scheduled` handler + cron |

---

## Prerequisites

- Node.js ≥ 20
- A Cloudflare account (free tier works)
- A Google Cloud project with an **OAuth 2.0 Client ID** (Web application)
- (Optional) a GitHub account for Pages CI

---

## 1. Install

```bash
git clone <your fork of BakaTracker>
cd BakaTracker
npm install
(cd platform && npm install)
```

## 2. One-Command Setup (recommended)

```bash
export CLOUDFLARE_API_TOKEN=<your-api-token>   # or: cd platform && npx wrangler login
npm run setup
```

`scripts/setup.mjs` interactively:

1. Validates a `wrangler login` session (or `CLOUDFLARE_API_TOKEN`).
2. Creates the D1 database and KV namespace, applies migrations
   (`platform/migrations/`).
3. Creates the R2 bucket (optional).
4. Writes the gitignored `platform/wrangler.prod.jsonc`.
5. Stores secrets via `wrangler secret put`
   (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_ORIGIN`, …).
6. **Prints the exact Google redirect URI** to register in Google Cloud.

> Dry run first: `npm run setup:dry-run` — it prints everything it would do
> without creating resources.

### Google OAuth configuration

In Google Cloud Console → APIs & Services → Credentials → **OAuth client ID**:

- **Authorized redirect URI** = the exact URI printed by setup
  (`https://<your-worker-domain>/callback`), byte-identical to the one the
  Worker validates.
- **Authorized JavaScript origins** = your Pages domain (`APP_ORIGIN`).

The Worker implements the authorization-code flow with PKCE and never sees
your Google client secret in the browser.

## 3. Deploy the Worker

```bash
npm run deploy        # npm run build (frontend) + wrangler deploy (platform)
# or, Worker only:
cd platform && npm run deploy
```

After first deploy, apply migrations to the remote D1 if setup didn't:

```bash
cd platform && npm run db:migrate:remote
```

Verify the API responds:

```bash
curl https://<your-worker-domain>/registry
curl https://<your-worker-domain>/.well-known/oauth-authorization-server
```

## 4. Publish the Frontend (Cloudflare Pages)

Connect the repo to Cloudflare Pages (or `wrangler pages deploy dist/`):

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables (production):**
  - `VITE_API_BASE_URL=https://<your-worker-domain>`
  - `VITE_GOOGLE_CLIENT_ID=<your-google-client-id>`

The SPA fallback is configured (`public/_redirects` → `/index.html` 200) and
the `test:pages` suite asserts it survives into `dist/`.

## 5. Production Gate Checks

```bash
npm run build          # tsc + vite build — must pass
npm run test:pages     # 10 checks: SPA fallback, no localhost refs, PWA artifacts
cd platform && npm test  # vitest + db-verify
```

---

## Manual / Alternative Deploy (Mode B)

Advanced users can skip `npm run setup`:

1. Create resources by hand:
   ```bash
   cd platform
   npx wrangler d1 create bakas_db
   npx wrangler kv namespace create OAUTH_KV
   ```
2. Copy `platform/wrangler.jsonc` → `platform/wrangler.prod.jsonc` and fill
   in `d1_databases`, `kv_namespaces`, `r2_buckets`, and
   `vars.APP_ORIGIN` / `REST_DEV_BYPASS` (leave unset in prod!).
3. Set secrets:
   ```bash
   npx wrangler secret put GOOGLE_CLIENT_ID --config wrangler.prod.jsonc
   npx wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.prod.jsonc
   ```
4. Migrate + deploy as above.

---

## Rollback

Workers keep previous versions:

```bash
cd platform && npx wrangler versions list --config wrangler.prod.jsonc
npx wrangler rollback --config wrangler.prod.jsonc
```

For Pages: redeploy the previous deployment from the Pages dashboard.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `401` on `/api/v1/*` | Not signed in (or expired token). In local dev only, set `REST_DEV_BYPASS=1` in `platform/.dev.vars`. |
| OAuth callback mismatch | Redirect URI in Google Cloud must be **byte-identical** to the Worker's `/callback` origin (see `auth/google-handler.ts`). |
| `test:pages` "must not reference localhost" | A dev script leaked into `index.html`; strip it and rebuild. |
| D1 table missing | `cd platform && npm run db:migrate:remote`. |
| CORS errors in the browser | `APP_ORIGIN` must exactly match the Pages origin; check `auth/app-origin.ts` allow-list. |
| AI endpoints 502/503 | `AI_ENABLED=false` kill switch, model name, or Workers AI quota. Check Worker logs; failures are graceful by design. |

---

## Environment Variables Reference

| Variable | Where | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | shell | Wrangler auth (or `wrangler login`) |
| `GOOGLE_CLIENT_ID` | Worker secret | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Worker secret | Google OAuth client secret |
| `APP_ORIGIN` | Worker var/secret | Canonical frontend origin (CORS + redirect URI base) |
| `AI_ENABLED` | Worker var | Kill switch for AI features (default on) |
| `AI_MODEL` / `AI_EMBED_MODEL` | Worker var | Workers AI model overrides |
| `REST_DEV_BYPASS` | `.dev.vars` only | Local dev auth bypass — **never in production** |
| `VITE_API_BASE_URL` | Pages env | Worker origin the PWA calls |
| `VITE_GOOGLE_CLIENT_ID` | Pages env | Google client id for the UI sign-in |
