# Phase 6 — Production Cutover: Preflight & Dry-Run Plan

Status: PREFLIGHT (read-only inventory complete · nothing deployed/changed)

## Guardrails

This phase is executed in two halves:

1. **Preflight (this document)** — read-only inventory of live production
   resources. No deploys, no writes, no migrations, no DNS/OAuth changes.
2. **Cutover execution** — happens ONLY after this plan is approved, step by
   step, with a verification gate before every step and rollback pinned to
   the existing deployment versions.

## 1. Production inventory (2026-08-11, read-only)

| Resource | State | Notes |
|---|---|---|
| Cloudflare account | Srivatsagorti@gmail.com's Account | wrangler-login active |
| Worker `bakatracker-platform` | **DEPLOYED, live** | 2 code deploys + 6 secret changes on 2026-08-09; untouched since |
| Origin | `https://bakatracker-platform.srivatsagorti.workers.dev` | resolves (A 104.21.50.129 / CF edge); live `GET /api/v1/whoami` → **401** |
| Frontend Worker `bakatracker` (root assets) | **NOT deployed** | API: worker does not exist on account |
| Cloudflare Pages | **No BakaTracker project** | unrelated projects only (gesture-fighter, lakemecx, sqltest, …) |
| D1 `bakas_db` | exists, **0 tables** | no remote migration ever applied (102400 B fresh) |
| KV `OAUTH_KV` | **empty** | no OAuth client registrations, no sessions |
| KV `ACTIVE_FOCUS_KV` (other project) | empty | n/a |
| R2 | **NOT enabled on account** | API error 10042 — enable in dashboard first if R2 is in scope |
| Durable Object `MyMCP` | bound | migration tag `v1` in prod config |
| Secrets (3) | `COOKIE_ENCRYPTION_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `GEMINI_API_KEY` **not set** (AI features later) |
| Vars | `APP_ORIGIN`, `SYNC_LOCK_TTL_SECONDS=60` | **no `CORS_ALLOWED_ORIGINS`** → Worker's own origin is the only allowed CORS origin |
| Custom API domain | **none** | no routes in prod config |
| Observability | enabled | — |

**Deployment history (rollback anchors):**
- `17694664-…` — 2026-08-09T12:57:57 code deploy (current code)
- `c270c59c-…` — 2026-08-09T12:54:52 code deploy (previous)
- 6 × Secret Change (12:54–14:42 same day)

## 2. Findings & deltas

1. **`client:*` keys: not present.** Both KV namespaces are empty today —
   there is nothing to migrate or preserve at cutover. If the earlier
   session's finding is relied upon (e.g. an existing OAuth client), the
   cutover proceeds from a clean slate; confirm this is expected.
2. **D1 is empty.** The first remote action at cutover is the migration
   apply (`npm run db:migrate`), then `npm run db:verify` — the automation
   built and tested in Phase 4.
3. **CORS would block the UI today.** With no `CORS_ALLOWED_ORIGINS`, a
   Pages-hosted SPA cannot read API responses until `npm run setup -- --ui-origin <pages-url>` runs and the Worker is redeployed. This is the
   single most important alignment step — Pages must never go live before it.
4. **R2 not enabled.** If the bucket is part of the immediate scope,
   enable R2 in the dashboard first (one click, no API).
5. **Google OAuth console is a manual verification.** The registered
   redirect URI must equal `APP_ORIGIN + /callback` exactly
   (`https://bakatracker-platform.srivatsagorti.workers.dev/callback`),
   and the client ID/secret must match the two secrets. Verify in Google
   Cloud Console before cutover.
6. **Frontend has zero deployment.** Either deployment path (Pages or
   assets Worker) is green-lit by Phase 5; Pages is the recommended path.

## 3. Cutover plan (ordered, gated)

### Phase 0 — Preconditions (no code, no deploy)
- [ ] Auth: `wrangler whoami` OK (as now)
- [ ] Google Console: redirect URI `…/callback` registered & matching; client values match secrets
- [ ] Decide: custom API domain — in scope or out? (If in: see Step 5 BEFORE Step 3)
- [ ] Decide: R2 in immediate scope? If yes, enable R2 in dashboard
- [ ] Decide final origin: keep `*.workers.dev` or custom domain (this LOCKS `APP_ORIGIN`, CORS, and the Google redirect — do not change after Step 2)

### Step 1 — Data layer: remote D1 migration
```bash
cd platform && npm run db:migrate && npm run db:verify
```
Gate: `db:verify` green; `d1 list` shows non-zero table count. Rollback: none needed (migrations are ADDITIVE; `db:migrate` never drops existing user data).

### Step 2 — Frontend: first Pages deploy (recommended path)
1. Create Pages project (Git-connected or direct upload) from `dist/` build:
   `VITE_API_BASE_URL=<APP_ORIGIN> VITE_GOOGLE_CLIENT_ID=<public client id> npm run build`
2. Env in Pages dashboard: `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`.
3. SPA fallback is automatic (`public/_redirects` — Phase 5).

Gate: `https://<project>.pages.dev/` renders; deep route (`/journey`) returns 200, no console errors.

### Step 3 — CORS alignment (the critical ordering fix)
```bash
npm run setup -- --ui-origin https://<project>.pages.dev
cd platform && npx wrangler deploy --config wrangler.prod.jsonc
```
Gate (browser, from Pages origin): `fetch(<APP_ORIGIN>/api/v1/whoami)` → **401**, readable body (CORS passed). Until this gate is green, the UI is not announced.

### Step 4 — Live smoke test
- unauthenticated: whoami → 401 (curl + browser)
- authenticated: full Google sign-in on the Pages origin → notes list loads (real D1)
- logout → whoami back to 401
- `/journey` deep link → app, not 404

### Step 5 — (optional) Custom API domain — BEFORE OAuth registration
1. `npm run setup -- --domain api.bakatracker.dev` (re-writes APP_ORIGIN)
2. Add DNS record + custom domain in dashboard, then redeploy
3. Re-register redirect URI in Google (new origin + `/callback`), re-verify client values
4. Re-run Phase 0 gate & Steps 3–4 against the new origin.
   ⚠️ Any existing sessions registered under the old origin are invalidated (clean slate — acceptable now, costly later).

### Step 6 — Observability
- `wrangler tail` for live traffic sanity
- Confirm `observability.enabled` logs route to the account dashboard

## 4. Rollback anchors

| Failure point | Rollback |
|---|---|
| Worker regression | `wrangler rollback` → `17694664-…` (previous code) |
| Pages bleeding edge | Dashboard → production branch pin (previous deployment) |
| D1 | Migrations additive; `db:verify` guards drift; no destructive remote SQL |
| OAuth misconfig | Re-point Google redirect URI; never change `APP_ORIGIN`+CORS without redeploying both |

## 5. Out of scope (later phases)

- Vectorize / Workers AI / BakaSur AI (needs `GEMINI_API_KEY` + bindings)
- R2 bucket + file endpoints (needs R2 enabled; v2.0 scope)
- `client:*` key forensic archaeology (nothing present to investigate — moot)

## Production safety

Preflight touched nothing: every command above (except the live `GET`) was
a read-only list/describe; the one live request was an unauthenticated
`whoami`, which writes nothing. No deploy, no migration, no KV/R2 write,
no DNS or OAuth change occurred.