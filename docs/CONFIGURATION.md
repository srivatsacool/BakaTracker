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

## R2 — v2.0 file storage plan (not yet implemented)

R2 is the intended binary store for v2.0 (attachments, PDFs, images, exports).
It is **prepared but not implemented**: `platform/src/env.ts` already types an
optional `R2_BUCKET?: R2Bucket` binding, and `npm run setup --with-r2` provisions
the bucket (`<worker-name>-files`) and writes the binding to
`wrangler.prod.jsonc`.

**Design decisions for the implementation checkpoint (do NOT build yet):**

| Concern | Decision |
|---------|----------|
| Binary payloads | Live only in R2, keyed `users/{user_id}/files/{file_id}` |
| Metadata (file_id, user_id, R2 key, filename, MIME, size, timestamps) | Lives in D1 — never binaries in D1 |
| Authz | Every `get_object`/`put_object`/`delete_object` enforces the authenticated user's `user_id` from the bearer token; no cross-user key access |
| Exports | Portable CSV/JSON exports (Sheets integration was removed) can be written to R2 as `users/{user_id}/exports/{name}.{ts}` |
| Not in scope yet | No image processing, thumbnails, streaming, or presigned URLs |

The binding is deliberately optional (`?`) so the app still runs on instances
created without `--with-r2`.

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
| GOOGLE_CLIENT_ID / SECRET | D / B | user-provided secret |
| COOKIE_ENCRYPTION_KEY | C/D | auto-generated, stored as secret |
| GEMINI_API_KEY | D | optional |
| VITE_API_BASE_URL | B | owner-supplied (Pages env) |