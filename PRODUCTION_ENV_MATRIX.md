# Production Environment Configuration Matrix — BakaTracker v2.3.0
**Target Release:** `v2.3.0`  
**Evaluation Date:** 2026-09-15  
**Audit Stage:** Phase 3 — Environment & Secret Audit  

---

## 1. Production Environment Variables & Secrets Matrix

| Variable | Frontend/Worker | Required | Secret? | Production Value Exists? | Verified? | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `VITE_API_BASE_URL` | Frontend | Yes | No | Yes (`https://bakatracker-platform.srivatsagorti.workers.dev`) | **PASS** | Cloudflare Pages env var; verified by `npm run test:pages`. Fails loud if absent in prod build. |
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Yes | No | Yes (`188051589984-katvke8i...`) | **PASS** | Public OAuth Client ID used by the SPA auth flow; embedded at build time. |
| `VITE_VAPID_PUBLIC_KEY` | Frontend | No | No | Yes | **PASS** | Public VAPID key for browser Web Push registration. |
| `GOOGLE_CLIENT_ID` | Worker | Yes | No | Yes | **PASS** | Matches `VITE_GOOGLE_CLIENT_ID`; validated in `platform/src/auth/google-handler.ts`. |
| `GOOGLE_CLIENT_SECRET` | Worker | Yes | **YES** | Yes (Cloudflare Secret) | **PASS** | Kept in Cloudflare encrypted secret store via `wrangler secret put`. Never in source. |
| `COOKIE_ENCRYPTION_KEY` | Worker | Yes | **YES** | Yes (Cloudflare Secret) | **PASS** | High-entropy 32+ byte string used for AES-GCM session cookie encryption. |
| `APP_ORIGIN` | Worker | Yes | No | Yes (`https://bakatracker-platform.srivatsagorti.workers.dev`) | **PASS** | Single source of truth for canonical OAuth callback and base URL. |
| `CORS_ALLOWED_ORIGINS` | Worker | Yes | No | Yes (`https://bakatracker.buildsrivatsa.qzz.io`) | **PASS** | Exact-match comma-separated list of allowed web origins. No wildcards. |
| `SYNC_LOCK_TTL_SECONDS` | Worker | No | No | Yes (`60`) | **PASS** | Distributed sync lock timeout in KV. |
| `AI_ENABLED` | Worker | No | No | Yes (`"1"`) | **PASS** | Operational kill-switch for Workers AI features. Defaults to enabled. |
| `AI_MODEL` | Worker | No | No | Yes (`@cf/meta/llama-3.2-1b-instruct`) | **PASS** | Model designation for Workers AI assistant inference. |
| `AI_EMBED_MODEL` | Worker | No | No | Yes (`@cf/baai/bge-base-en-v1.5`) | **PASS** | Embedding model for semantic vector operations. |
| `VAPID_SUBJECT` | Worker | No | No | Yes (`mailto:notifications@bakatracker.app`) | **PASS** | Contact URI for RFC 8292 Web Push. |
| `VAPID_PUBLIC_KEY` | Worker | No | No | Yes | **PASS** | Public VAPID key paired with VAPID_PRIVATE_KEY. |
| `VAPID_PRIVATE_KEY` | Worker | No | **YES** | Yes (Cloudflare Secret) | **PASS** | Private VAPID key stored only as a Wrangler secret. |
| `GEMINI_API_KEY` | Worker | No | **YES** | Optional (Cloudflare Secret) | **PASS** | Fallback external provider secret if Workers AI binding is omitted. |
| `REST_DEV_BYPASS` | Worker | **NO** | No | **ABSENT IN PROD** | **PASS** | **CRITICAL RELEASE GATE:** Must NEVER exist in production. Strictly absent from `wrangler.prod.jsonc` and gated by `isLocalDevOrigin(APP_ORIGIN)`. |

---

## 2. Cloudflare Resource Bindings (`wrangler.prod.jsonc`)

| Binding | Resource Type | Production Identifier / Value | Verification Status |
|---|:---:|---|:---:|
| `BAKA_DB` | Cloudflare D1 | `bakas_db` (`bb8219f5-8c61-4403-bc2b-a7edbab889b5`) | **VERIFIED** |
| `OAUTH_KV` | Cloudflare KV | `5eb48db3bd274f6087eafcada74955b6` | **VERIFIED** |
| `PUSH_SUBSCRIPTIONS` | Cloudflare KV | `b315b483f74e4f138583f7c190062a99` | **VERIFIED** |
| `R2_BUCKET` | Cloudflare R2 | `bakatracker-platform-files` | **VERIFIED** |
| `MCP_OBJECT` | Durable Object | Class `MyMCP` (SQLite-backed DO migration `v1`) | **VERIFIED** |
| `AI` | Cloudflare AI | Platform Workers AI binding | **VERIFIED** |
| `crons` | Triggers | `["*/15 * * * *"]` (every 15 minutes) | **VERIFIED** |

---

## 3. Secret Leakage Audit & Verification

- **Frontend Bundle (`dist/assets/*.js`):** Checked against regex patterns for `GOOGLE_CLIENT_SECRET`, `COOKIE_ENCRYPTION_KEY`, `CLOUDFLARE_API_TOKEN`, `GEMINI_API_KEY`, `.dev.vars`. Result: **0 matches** (clean).
- **Git Tracking:** `.env`, `.env.local`, `.dev.vars*` are tracked in `.gitignore`. Result: **0 secret files tracked**.
- **Log Sanitation:** Worker AI logs (`platform/src/ai/service.ts`) output only request IDs, user IDs, and duration metrics. Message bodies, prompts, and tokens are strictly excluded by construction.
- **REST Dev Bypass Protection:** Double-gated at runtime in `platform/src/http/rest.ts`. Even if configured, it rejects any request when `APP_ORIGIN` is not a loopback host (`localhost`/`127.0.0.1`).
