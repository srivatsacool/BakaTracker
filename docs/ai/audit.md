# Phase 7 — Architecture Audit (Workers AI + BakaSur foundation)

Audited against HEAD `09ee9d5` (platform `wrangler.prod.jsonc` with the
reviewed `APP_ORIGIN` = workers.dev change applied and deployed as version
`32bb5f1a`). Read-only — no changes were made during this audit.

## A. Current Worker architecture

One Worker (`bakatracker-platform`) with an `OAuthProvider` shell and a Hono
`defaultApp`:

```
Request
  ├─ /authorize /register /token /mcp   → @cloudflare/workers-oauth-provider
  │                                        (Google OAuth client → provider,
  │                                         DCR + PKCE, bearer tokens)
  └─ everything else                    → Hono defaultApp
        ├─ /          GoogleHandler (OAuth pages) + landing page
        └─ /api/v1    buildRestApp() — thin REST pass-through
```

- **One business logic**: the Tool Registry (`src/registry/`) — REST, MCP and
  future clients all call the same registered tools.
- **MCP**: `MyMCP` Durable Object (`src/mcp/server.ts`) registers every
  registry tool at `init()`.
- **REST**: `src/http/rest.ts` — auth guard → CORS → routes.

## B. D1 schema + repository/service layer

Migrations: `0001_init.sql` (tasks, habits, notes, journal, sync_meta,
sync_queue, daily_rollups) and `0002_files.sql` (files metadata mirror).
The `notes` table already carries a `vector TEXT` column (dense embedding,
JSON float[]) — reserved for v2.1 semantic search; currently unused.

Layer chain (enforced by convention + tests):

```
Tool handler → Repository (src/storage/repositories/) → SQL (src/storage/db.ts) → D1
             → FileRepository/FileStore (src/storage/)                       → R2
```

Every SQL statement is scoped `WHERE user_id = ?` — the authenticated Google
`sub`. Repositories: tasks, habits, notes, journal, stats, files.

## C. REST routes (`/api/v1`)

| Route | Method | Purpose |
|---|---|---|
| `/registry` | GET | Tool catalog introspection |
| `/tools/:name` | POST | Generic tool call — the one true path |
| `/sync/push` · `/sync/pull` | POST/GET | Offline sync ledger |
| `/files` | POST (multipart) | Upload (25 MiB cap, MIME allowlist) |
| `/files` · `/files/:id` | GET | List / raw download |
| `/files/:id` | DELETE | Delete |
| `/whoami` | GET | Identity |

Error convention: `{ ok: false, error: "<code>", message }` with
`invalid_input|unknown_tool → 400`, `not_found → 404`, `not_configured → 501`,
else `500`. Success: `{ ok: true, result }`.

## D. MCP tools

24 tools registered via `registerAll()` (see `src/tools/index.ts`):
`create/update/delete/list_tasks`, `create/log/list_habits`,
`create/get/update/delete/list/search_notes`, `journal_today/get/list_journal`,
`file_upload/list/get/delete`, `analytics`, `plan_day`, `weekly_review`,
`remember`, `recall`, `reset_account`.

## E. Authentication / authorization boundaries

- Bearer token → `unwrapToken` → decrypted `Props { sub, name, email }` →
  request user. No token → 401.
- Local-dev-only `X-User-Sub` bridge: only when `REST_DEV_BYPASS=1` **and**
  `APP_ORIGIN` is a loopback origin. Never effective in production.
- CORS: exact-origin allowlist (`APP_ORIGIN` + `CORS_ALLOWED_ORIGINS`), no
  reflection, no wildcard. `credentials: false` (bearer, not cookies).
- R2 keys are server-derived `users/{sub}/files/{id}` — never client-supplied.
- Every repository read/write is user-scoped by `sub`.

## F. R2 file APIs

`FileStore` (`src/storage/files-store.ts`) is the only R2 toucher: keys
`users/{user_id}/files/{file_id}`; `read/write/remove/removeAllForUser`
(prefix-scoped purge for reset). `FileRepository` pairs D1 metadata mirror
with the object store; uploads capped at `MAX_FILE_SIZE` = 25 MiB with a
MIME allowlist.

## G. Current Notes implementation

- Schema: `NoteInput { title ≤300, body ≤100_000 (default ""), tags[] }`;
  `Note = NoteInput + id, user_id, created_at, updated_at`.
- Repository: `notes.get(userId, id)` → `SELECT * FROM notes WHERE id=? AND
  user_id=?` — non-owned ids return `null` (→ 404 convention).
- Tools: `create_note`, `get_note`, `update_note`, `delete_note`,
  `list_notes`, `search_notes` (LIKE-based over notes+tasks).
- D1 is a server-side mirror; IndexedDB is the client's authoritative write
  model (sync via `/sync/*`).

## H. Frontend Notes implementation

**None yet.** `src/features/` contains only `auth`; `src/services/` has
habits/journal/quotes/stats/tasks/demo-mode. The v2.1 premium Notes UI is
genuinely future work — the backend AI action contract is built now so the
UI can be added cleanly later (this phase's mandate).

## I. Existing Gemini/AI code — reuse, don't rewrite

`platform/src/ai/` already provides:

- `provider.ts` — `AIProvider { name, chat(messages, options), embed?,
  vision? }`, `ChatMessage`, `ChatOptions`, `AIUnavailableError`.
- `workers-ai.ts` — `WorkersAIProvider` (default `@cf/meta/llama-3.3-70b-
  instruct-fp8-fast`; contains a typo `name = "workders-ai"` to fix).
- `google-ai.ts` — `GeminiProvider` (REST fallback, `GEMINI_API_KEY`).
- `index.ts` — `makeAIProvider(env)`: AI binding → Gemini key → undefined.

Already wired: REST (`rest.ts:118`) and MCP (`mcp/server.ts:43`) inject
`makeAIProvider(c.env)` into `ToolContext.ai`; `tools/planning.ts`
(`plan_day`, `weekly_review`) is the only consumer.

**Decision**: reuse the provider abstraction as the transport boundary and
build the Phase-4 application service on top of it. The providers are sound;
what is missing is structured output, bounded IO, deterministic error
taxonomy, request ids, and a service boundary tests can mock.

## J. Wrangler bindings/config (local + prod)

| | local `wrangler.jsonc` | prod `wrangler.prod.jsonc` |
|---|---|---|
| D1 | placeholder id (pool/local) | `bakas_db` real id |
| KV | placeholder | `OAUTH_KV` real id |
| R2 | local bucket name | `bakatracker-platform-files` |
| DO | `MyMCP` | `MyMCP` |
| AI | **intentionally omitted** (comment: remote resource; would force API token in dev) | **absent** — must be added |
| vars | `APP_ORIGIN=localhost:8787`, CORS=:5173 | `APP_ORIGIN=workers.dev` (reviewed fix), CORS=Pages origin, SYNC_LOCK |

`scripts/setup.mjs` supports `--with-ai` → writes `ai: { binding: "AI" }`
into a **regenerated** prod config + re-pushes secrets. Re-running setup
post-cutover would clobber the reviewed `APP_ORIGIN` — so the binding is
added **surgically** to the existing prod config instead (same shape setup
would produce). Local dev keeps no AI binding by design; AI failures are
deterministic (`503 ai_unavailable`).

## K. Tests and test architecture

- Vitest + `@cloudflare/vitest-pool-workers` (`vitest.config.mts`),
  `main: ./src/index.ts`, config `wrangler.jsonc`; the pool loads
  `platform/.dev.vars` (`REST_DEV_BYPASS=1`, `APP_ORIGIN=localhost`) so
  tests authenticate via `X-User-Sub`.
- Suites: `test/index.spec.ts` (registry + REST integration via `SELF`),
  `test/migrations.spec.ts`, `test/security.spec.ts` (CORS/redirect_uri/
  state validation). `scripts/*.test.mjs` = node:test (db-verify).
- No AI tests yet. Workers AI cannot be run deterministically in the pool
  (it is a remote service) → **mock at the AI-service boundary** (see
  `docs/ai/architecture.md`).

## Insertion points for AI

1. `platform/src/ai/` — extend with `service.ts` (application service over
   the existing provider) + `bakasur.ts` (BakaSur tool allowlist).
2. `platform/src/http/rest.ts` — new action route
   `POST /api/v1/notes/:id/ai/summarize` (auth guard is already global).
3. `platform/wrangler.prod.jsonc` — `ai` binding + `AI_MODEL`/`AI_ENABLED`.
4. `platform/src/env.ts` — type the new vars.
5. `platform/test/ai-notes.spec.ts` — the vertical-slice test suite.
6. `docs/ai/*.md` — design + security + contract documents.
