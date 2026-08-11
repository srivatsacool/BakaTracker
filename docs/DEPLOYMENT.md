# 🚢 Deployment Guide

BakaTracker is a **self-hostable, single-user application**. Every instance is fully
independent: its own Cloudflare Worker, its own D1 database, its own KV namespace,
its own Google OAuth client. There is no shared backend and no multi-tenant SaaS —
you deploy *your* copy of BakaTracker into *your* Cloudflare account.

There are two supported deployment modes:

| Mode | Command | Use when… |
|------|---------|-----------|
| **A — Quick Setup** (recommended) | `npm run setup` → `npm run deploy` | You want a working instance in minutes |
| **B — Manual** | raw `wrangler` commands | You know Wrangler and want full control |

Both produce the same result. Everything below assumes you have **never seen the
repo before**.

---

## 0. Prerequisites

| Tool | Why | Install |
|------|-----|---------|
| Node.js ≥ 20 | Runs build tooling + the setup script | [nodejs.org](https://nodejs.org/) |
| npm | Node package manager | ships with Node |
| Git | Clone the repository | [git-scm.com](https://git-scm.com/) |
| A Cloudflare account | Hosts Worker / D1 / KV / Pages | [dash.cloudflare.com](https://dash.cloudflare.com/) — free tier is enough |
| A Google account | Create the OAuth client | [console.cloud.google.com](https://console.cloud.google.com/) |

---

## 1. Install

```bash
git clone <your-fork-or-this-repo> bakatracker
cd bakatracker
npm install
cd platform && npm install && cd ..
```

That's the entire install. No global tools are required — the repo pins Wrangler
as a local dev dependency.

---

## 2. Cloudflare credentials

The setup script needs API access. Pick **one**:

**Option A — API token (recommended for setup):**
1. In the Cloudflare dashboard: **My Profile → API Tokens → Create Token**.
2. Use the **"Edit Cloudflare Workers"** template and make sure the account
   grant includes your account.
3. Export it for the setup command:
   ```bash
   export CLOUDFLARE_API_TOKEN=your_token_here
   ```

**Option B — interactive `wrangler login`:**
```bash
cd platform
npx wrangler login
```
The script will pick up the stored OAuth credentials automatically.

---

## 3. Google OAuth client (one-time, ~3 minutes)

BakaTracker logs you in with your Google account. Only **you** (and anyone with a
Google account on your instance) will be able to sign in.

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create a project (or reuse one) → **Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Under **Authorized redirect URIs**, add the exact URI printed at the end of
   `npm run setup` (step 4). For a fresh workers.dev instance this is:
   ```
   https://<your-worker-name>.<your-account-subdomain>.workers.dev/callback
   ```
   ⚠️ It must match **exactly** — scheme, host, path, no trailing slash.
5. Note the **Client ID** and **Client Secret**.

You do **not** need an *Authorized JavaScript origin* — the SPA never talks to
Google directly; the Worker does.

---

## 4. Mode A — Quick Setup (recommended)

```bash
npm run setup
```

The script:

1. Authenticates against Cloudflare (token or `wrangler login`).
2. Resolves your account and workers.dev subdomain automatically.
3. Creates the D1 database `bakas_db` and the KV namespace `OAUTH_KV` **if they
   don't exist** (reuses existing ones — safe to re-run).
4. Prompts for your Google **Client ID** and **Client Secret** (the secret input
   is masked and never written to disk).
5. Generates a secure `COOKIE_ENCRYPTION_KEY` (or reuses one you export).
6. Writes the generated instance config `platform/wrangler.prod.jsonc` — note
   **this file is gitignored**, it belongs to your machine only.
7. Stores the three secrets with `wrangler secret put` (Cloudflare's secret
   storage — not in any file).
8. Applies database migrations to your remote D1.
9. Prints your **exact Google redirect URI** — register it in step 3.

Optional flags:

| Flag | Effect |
|------|--------|
| `--name my-tracker` | Custom worker name (default: `bakatracker-platform`) |
| `--domain api.example.com` | Deploy behind a custom domain (see §6) |
| `--with-r2` | Also create the R2 bucket + binding (v2.0 file storage) |
| `--with-ai` | Add the Workers AI binding (`AI`) |
| `--ui-origin https://app.pages.dev` | Allow a Pages/UI browser origin in the CORS allowlist (repeatable, canonicalized; never a wildcard) |
| `--google-client-id … --google-client-secret …` | Skip the prompts (CI) |
| `--dry-run` | Print everything it *would* do; change nothing |

### Deploy

```bash
npm run deploy
```

This deploys the **Worker** using the generated production config. The frontend
(Cloudflare Pages) is published separately with your Pages/Git integration (see
§5).

---

## 5. Frontend — two deployment paths

The frontend is a static React SPA; its only backend is the Worker, wired at
build time via `VITE_API_BASE_URL`. The exact same `dist/` artifact can be
served two ways — pick one:

### Path A — Cloudflare Pages (dashboard / Git integration)

1. Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → your repo.
2. Build settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Add a **production environment variable**:
   - `VITE_API_BASE_URL` = your worker origin, e.g.
     `https://bakatracker-platform.your-sub.workers.dev` (exactly what `npm run
     setup` printed as APP_ORIGIN)
   - `VITE_GOOGLE_CLIENT_ID` = your Google client ID
4. **Save and Deploy.** You get `https://<project>.pages.dev`.
5. SPA deep routes (`/journey`, `/habits`, …) work out of the box: the repo
   ships `public/_redirects` → `/* /index.html 200`, so no dashboard
   rewrites are needed.
6. Let the Worker accept requests from your Pages origin:
   ```bash
   npm run setup -- --ui-origin https://<project>.pages.dev
   ```
   and redeploy the Worker. (CORS stays an explicit allowlist; `APP_ORIGIN`
   is always allowed, never a wildcard.)
7. **Keep the Pages env in sync** — the build env lives in the dashboard,
   not the repo, so it can silently drift (it once did, and every build
   shipped a broken bundle). `scripts/pages-env.json` is the single source
   of truth for the production build env (public `VITE_*` values only —
   never secrets):
   ```bash
   npm run sync:pages-env -- --dry-run   # show any drift, change nothing
   npm run sync:pages-env                # converge the live project
   ```
   The script sets missing/changed vars and deletes vars not in the contract.

> ⚠️ If `VITE_API_BASE_URL` is missing in a production build, the app **refuses
> to start** with a clear error rather than silently talking to `localhost`.

### Path B — Wrangler Workers Assets (root assets Worker)

```bash
npm run deploy          # = npm run build && wrangler deploy (repo root)
```

The root `wrangler.jsonc` is an assets-only Worker; the Vite plugin wires
`dist/` as Workers Assets with `not_found_handling: single-page-application`,
i.e. deep routes serve `index.html` exactly like `_redirects` does on Pages.

### Verify the deployment contract

```bash
npm run test:pages      # 10 checks: build, bundle origin, no localhost,
                        # no secrets, _redirects, SPA fallback, PWA artifacts
```

See `docs/phases/phase5-pages.md` for the full contract and the local
Pages-like verification procedure (real Worker + real build + real 401
auth boundary).

---

## 6. Custom domain (optional)

1. Point DNS at the Worker, or map the Custom Domain in the dashboard:
   - **Option A (recommended):** Worker page → **Settings → Domains &
     Routes → Add → Custom domain**.
   - **Option B:** `CNAME your-api.example.com → <worker>.workers.dev` (or
     `*.workers.dev`) and add the route `custom_domain: true` to your config.
2. Re-run `npm run setup -- --domain your-api.example.com` (or set the domain on
   the generated config) so `APP_ORIGIN` reflects the new origin.
3. **Update the Google redirect URI** to `https://your-api.example.com/callback`.
4. Deploy again + update the Pages `VITE_API_BASE_URL`.

---

## 7. Mode B — Manual deployment (advanced)

Everything the quick setup does, with raw Wrangler. Edit
`platform/wrangler.json` and fill in the IDs (or create your own config file):

```bash
cd platform

# 1. Create resources (idempotent — fails if they already exist)
npx wrangler d1 create bakas_db
npx wrangler kv namespace create OAUTH_KV

# 2. Set secrets (each reads from stdin; never paste into the command history
#    — use a password manager or stdin piping)
echo "$GOOGLE_CLIENT_ID"      | npx wrangler secret put GOOGLE_CLIENT_ID
echo "$GOOGLE_CLIENT_SECRET"  | npx wrangler secret put GOOGLE_CLIENT_SECRET
echo "$COOKIE_ENCRYPTION_KEY" | npx wrangler secret put COOKIE_ENCRYPTION_KEY   # openssl rand -hex 32

# 3. Apply migrations remotely
npx wrangler d1 migrations apply bakas_db --remote

# 4. Deploy
npx wrangler deploy
```

---

## 8. Local development

Worker (`platform/`):

```bash
cd platform
npm run db:migrate       # apply pending D1 migrations to the local DB (idempotent)
npm run db:verify        # non-mutating check: is the local DB schema up to date?
npx wrangler dev         # http://localhost:8787
npx wrangler dev --remote   # use real D1/KV remotely (needs secrets in .dev.vars)
```

Frontend (repo root):

```bash
npm run dev                 # http://localhost:5173, talks to localhost:8787
```

Local secrets go in `platform/.dev.vars` (gitignored) — copy
`platform/.dev.vars.example`. Local D1/KV are simulated by Wrangler, no real
resources needed.

### Pages-like local verification (production build + real Worker)

```bash
# 1. Production build pointed at the LOCAL worker
VITE_API_BASE_URL=http://localhost:8787 VITE_GOOGLE_CLIENT_ID=<any> npm run build

# 2. Real API Worker on :8787 (only Google's external endpoints are stubbed)
cd platform
E2E_CORS_ORIGINS="http://localhost:4173,http://localhost:5173" node scripts/e2e-worker.mjs

# 3. Pages-like static server honoring dist/_redirects on :4173
cd ..
node scripts/pages-like-server.mjs 4173
```

Then prove the contract: `/api/v1/whoami` → **401** (real auth boundary; no
token injected, no auth bypassed), `/journey` → **200** `index.html`
(deep SPA route), browser at `:4173` fetches the Worker through the CORS
allowlist. Full procedure + captured results in
`docs/phases/phase5-pages.md`.

### Database migrations

- **One authoritative source:** `platform/migrations/NNNN_name.sql` (already
  tracked by Wrangler; `migrations_dir` is set in both `wrangler.jsonc` and
  `wrangler.prod.jsonc`).
- **Idempotent:** `wrangler d1 migrations apply` applies only migrations not
  yet recorded in the D1 `d1_migrations` table — never re-runs applied ones,
  never touches existing data.
- **Never runs at Worker startup** — schema changes happen only when you run
  the migration command, so deploys cannot race schema changes.
- To add a migration: create `platform/migrations/0003_*.sql`, then run
  `npm run db:migrate` (local) → `npm run db:verify` → when ready,
  `npm run db:migrate:remote`.

| Command | Target | Mutates? |
|---|---|---|
| `npm run db:migrate` | local D1 (`.wrangler` state) | applies pending |
| `npm run db:migrate:remote` | remote production D1 (`wrangler.prod.jsonc`) | applies pending — explicit on purpose |
| `npm run db:verify` | local D1 | read-only |
| `npm run db:verify:remote` | remote D1 | read-only |

---

## 9. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `✖ No Cloudflare credentials found` | Set `CLOUDFLARE_API_TOKEN` or run `npx wrangler login` in `platform/`. |
| `Error 10057/10063` on deploy | The worker name is taken, or the account subdomain is unavailable — pick `--name`. |
| OAuth redirect error `redirect_uri_mismatch` | The URI registered in Google must equal `APP_ORIGIN + /callback` exactly (no trailing slash). Re-run setup and re-check. |
| App refuses to start in production | `VITE_API_BASE_URL` missing in Pages env — add it (never `localhost`). |
| Stale bundle after deploy (wrong API base / no login button) | Pages env drifted from `scripts/pages-env.json` — run `npm run sync:pages-env` and push a commit to rebuild. |
| `wrangler secret put` hangs | It waits on stdin — pipe the value: `echo "$VAL" \| npx wrangler secret put NAME`. |
| CORS errors in browser | Allow the exact UI origin with `npm run setup -- --ui-origin https://<pages-origin>` (adds it to `CORS_ALLOWED_ORIGINS`; the Worker origin is always allowed). It must match the origin in the address bar exactly — scheme, host, and port. |

---

## 10. Reset / recreate your instance

Deleting everything and starting fresh:

```bash
cd platform
npx wrangler d1 delete bakas_db
npx wrangler kv namespace delete --namespace-id <id>
npx wrangler r2 bucket delete <bucket>      # if you created one
rm platform/wrangler.prod.jsonc             # generated config
```
Then re-run `npm run setup`. Your Google OAuth client can stay — just keep the
redirect URI unchanged.

> Migrations are idempotent: `wrangler d1 migrations apply --remote` applies
> only the ones not yet recorded in the D1 `d1_migrations` table.

---

## 11. CI/CD (optional)

The repo ships no CI by default (it's your account after all). A minimal
workflow if you want automated deploys:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci --prefix platform
      - run: echo "${{ secrets.CLOUDFLARE_API_TOKEN }}" > token && export CLOUDFLARE_API_TOKEN && npx --prefix platform wrangler deploy
```