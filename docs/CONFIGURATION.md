# ⚙️ Configuration Reference

This document is the reference for **every configuration value** in BakaTracker,
who sets it, and where it lives. Deployment instructions live in
[DEPLOYMENT.md](./DEPLOYMENT.md); this page is about the *model*.

---

## The three-layer model

BakaTracker deliberately separates configuration into three layers so the
repository stays reusable by anyone:

```
┌───────────────────────────────┐
│ 1. Repository defaults        │  committed, generic, safe for everyone
│    platform/wrangler.jsonc    │  (local-dev template; placeholder IDs)
│    platform/.dev.vars.example │
│    .env.example               │
├───────────────────────────────┤
│ 2. Generated instance config  │  created by `npm run setup`, gitignored
│    platform/wrangler.prod.jsonc│  real D1/KV/R2 IDs, worker name, APP_ORIGIN
├───────────────────────────────┤
│ 3. Cloudflare secrets          │  `wrangler secret put` (never in files)
│    GOOGLE_CLIENT_ID           │
│    GOOGLE_CLIENT_SECRET       │
│    COOKIE_ENCRYPTION_KEY      │
│    GEMINI_API_KEY (optional)   │
└───────────────────────────────┘
```

**Rules of the model:**

- Layer 1 never contains account-specific values. Resource *names* are safe
  defaults; *IDs* are never committed.
- Layer 2 is only written by `npm run setup` and is gitignored
  (`platform/.gitignore`). It encodes *your* instance.
- Layer 3 is Cloudflare-side. Local development mirrors secrets in
  `platform/.dev.vars` (gitignored, via `platform/.dev.vars.example`).

## 1. Repository defaults (committed)

### `platform/wrangler.jsonc` — local dev template

| Key | Default | Purpose |
|-----|---------|---------|
| `name` | `bakatracker-platform` | Worker name; `npm run setup -- --name X` overrides |
| `main` | `src/index.ts` | Worker entry |
| `d1_databases[].binding` | `BAKA_DB` | D1 binding used by the Worker code |
| `d1_databases[].database_name` | `bakas_db` | Logical database name (setup creates this) |
| `d1_databases[].database_id` | `00000000-…` placeholder | **Never committed for real** — local simulation only |
| `kv_namespaces[].binding` | `OAUTH_KV` | KV binding used by the code |
| `kv_namespaces[].id` | `0000…` placeholder | Local simulation only |
| `migrations_dir` | `./migrations` | D1 migrations location |
| `durable_objects` | `MyMCP` / `MCP_OBJECT` | MCP Durable Object (workers-oauth-provider) |
| `vars.APP_ORIGIN` → `http://localhost:8787` | dev origin | overridden in generated prod config |
| `vars.SYNC_LOCK_TTL_SECONDS` | `60` | Lock TTL for the sync lock |
| `observability.enabled` | `true` | Wrangler logging |

The file header says so out loud: **"This file is the local development
configuration. Run `npm run setup` to generate your production config."** It is
*valid* for `wrangler dev` (Wrangler simulates D1/KV locally) and intentionally
*not* suitable for `wrangler deploy` — the deploy script refuses a localhost
`APP_ORIGIN` rather than pushing it to production.

### `platform/.dev.vars.example` — local secrets mirror

| Key | Purpose | Local-only? |
|-----|---------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client id | yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | yes |
| `GOOGLE_REDIRECT_URI` | OAuth callback | yes (`/callback` on APP_ORIGIN) |
| `COOKIE_ENCRYPTION_KEY` | Cookie encryption | yes |
| `REST_DEV_BYPASS` | dev-only auth bypass for local testing | yes |
| `GEMINI_API_KEY` (optional) | AI feature | yes |

Production equivalents are pushed as Cloudflare secrets by `npm run setup`.

### `.env.example` — frontend build-time

| Var | Meaning | Value in dev | Value in prod |
|-----|---------|--------------|---------------|
| `VITE_API_BASE_URL` | Worker origin the SPA calls (REST + OAuth) | `http://localhost:8787` (default when unset in dev) | your `APP_ORIGIN`, set in Pages env. **Missing in prod = hard startup error** |
| `VITE_GOOGLE_CLIENT_ID` | Google client id (SPA only uses it to show whether login is configured) | yours | yours (Pages env) |

## 2. Generated instance config (layer B)

Written **only** by `npm run setup` to `platform/wrangler.prod.jsonc`. It is a
copy of the template with real values filled in:

```jsonc
{
  "name": "<worker-name>",                        // from --name or default
  "d1_databases": [{ "database_id": "<real>", "database_name": "bakas_db" }],
  "kv_namespaces": [{ "binding": "OAUTH_KV", "id": "<real>" }],
  "r2_buckets": [ { "binding": "R2_BUCKET", "bucket_name": "<name>-files" } ], // iff --with-r2
  "ai": { "binding": "AI" },                                                    // iff --with-ai
  "routes": [ { "pattern": "api.yourdomain.com", "custom_domain": true } ],     // iff --domain
  "vars": { "APP_ORIGIN": "https://<worker>.<sub>.workers.dev", "SYNC_LOCK_TTL_SECONDS": 60 }
}
```

Rules:

- **Never committed** (`platform/.gitignore`).
- The **deploy script** (`npm run deploy`) reads it and refuses to run if
  `APP_ORIGIN` is missing or `localhost` — production can never silently fall
  back to localhost.
- Re-running `setup` is **idempotent**: existing D1/KV are reused, an existing
  `COOKIE_ENCRYPTION_KEY` in the environment is kept (no session invalidation),
  secrets are re-`put` with the same values.

## 3. Secrets (layer 3)

| Secret | Generated by | Required |
|--------|--------------|----------|
| `GOOGLE_CLIENT_ID` | you (Google Console) | ✅ |
| `GOOGLE_CLIENT_SECRET` | you (Google Console) | ✅ |
| `COOKIE_ENCRYPTION_KEY` | setup (crypto 32-byte hex) or you | ✅ |
| `GEMINI_API_KEY` | you (optional; AI features) | optional |

Never committed; never printed; stored via `wrangler secret put`. Local dev uses
`platform/.dev.vars` instead.

## R2 — v2.0 file storage (implemented)

R2 is the binary store for v2.0 (attachments, PDFs, images, voice, exports).
`npm run setup --with-r2` provisions the bucket (`<worker-name>-files`) and
writes the binding to `wrangler.prod.jsonc`; local dev and the vitest pool
simulate the bucket automatically (`platform/wrangler.jsonc`).

| Concern | Implementation |
|---------|----------|
| Binary payloads | Live only in R2, keyed `users/{user_id}/files/{file_id}` — the key is **server-derived from the authenticated OAuth `sub`**, never client-supplied, so no user can address another user's prefix |
| Metadata (file_id, user_id, R2 key, filename, MIME, size, timestamps) | D1 `files` table (`0002_files.sql`) — `r2_key` is internal-only, stripped from every API response |
| Rest API | `POST /api/v1/files` (multipart), `GET /api/v1/files`, `GET /api/v1/files/:id` (raw bytes download), `DELETE /api/v1/files/:id` |
| Tool Registry / MCP | `file_upload`, `file_list`, `file_get` (metadata or `include_data` base64), `file_delete` — same `FileRepository` as REST |
| Authz | Every D1 query is `WHERE id = ? AND user_id = ?`; every R2 op uses the derived key; cross-user access returns 404 (no existence oracle). `reset_account` purges the user's files (R2 objects + rows) |
| Validation | MIME allowlist (`ALLOWED_MIME_TYPES`) → 400; size cap 25 MiB (`MAX_FILE_SIZE`) → 413 before anything touches R2 |
| Out of scope (v2.1+) | Image processing, thumbnails, streaming, presigned/public URLs, sharing, versioning |

The binding is deliberately optional (`?`) so the app still runs on instances
created without `--with-r2` — file endpoints answer **501 Not Implemented**
("R2 not configured — deploy with --with-r2").

## Security model

- **OAuth `redirect_uri` is always `canonical(APP_ORIGIN) + "/callback"`** —
  never derived from the incoming request URL/host. `APP_ORIGIN` is normalized
  to its exact origin (scheme + host + port; path/query/trailing slash
  stripped), so `/authorize` and `/callback` always agree byte-for-byte with
  the URI registered in Google. A missing/invalid `APP_ORIGIN` fails closed
  (500) — there is no silent fallback.
- **CORS is an explicit allowlist.** `APP_ORIGIN` is always allowed;
  `CORS_ALLOWED_ORIGINS` (comma-separated) adds more, e.g. your Pages/UI
  origin in production. Exact-origin comparison only — no wildcards, no
  prefix/substring matches. Requests without an `Origin` header (curl, MCP)
  pass through untouched. Auth is bearer-token, so `credentials` stays off.
- **OAuth state is single-use and session-bound.** The state token lives in KV
  with a TTL; the browser must present a matching `__Host-CONSENTED_STATE`
  cookie (SHA-256 of the token) to complete the callback. KV state and cookie
  are both deleted on first use — missing, mismatched, unknown, or replayed
  state is rejected (400).
- **CSRF form token** (`__Host-CSRF_TOKEN`) must match the approval-dialog
  cookie and is cleared after one use (RFC 9700). All cookie/token compares
  are constant-time.
- **Cookies are `__Host-` prefixed** (implies `Secure` + `Path=/` + no
  `Domain`), `HttpOnly`, `SameSite=Lax`, with a 600s TTL (`Max-Age=0` on
  clear).
- **Bearer validation is deterministic.** Invalid/expired/missing tokens →
  401 `unauthorized`; there is no fallback to any legacy auth path in
  production. The REST dev bypass (`REST_DEV_BYPASS=1` + `X-User-Sub`) is
  additionally gated on `APP_ORIGIN` being a loopback origin, so it is inert
  even if accidentally set on a deployed Worker.

## Cross-instance isolation

- D1, KV, and R2 namespaces are **per-account**, created fresh by each user's
  setup script. No shared database, no shared KV, no shared bucket.
- `APP_ORIGIN` is derived from *your* account subdomain (or custom domain), so
  OAuth `redirect_uri` validation is instance-local.
- Google login is per-instance; there is no central authentication authority.

## Where values are classified

Audit classification of every configuration value (see §1): **A** repository
default, **B** user-configurable, **C** generated during setup,
**D** secret, **E** runtime-derived.

| Value | Class | Notes |
|-------|-------|-------|
| DB/KV/bucket *names* (`bakas_db`, `OAUTH_KV`, `<name>-files`) | A | safe defaults |
| Worker name | B | `--name` |
| D1 ID / KV ID / bucket | C | per-account, generated by setup |
| APP_ORIGIN | E(+C) | derived from account or `--domain` |
| CORS_ALLOWED_ORIGINS | B | extra UI origins beyond APP_ORIGIN (e.g. Pages) |
| GOOGLE_CLIENT_ID / SECRET | D / B | user-provided secret |
| COOKIE_ENCRYPTION_KEY | C/D | auto-generated, stored as secret |
| GEMINI_API_KEY | D | optional |
| VITE_API_BASE_URL | B | owner-supplied (Pages env) |