# V2 Migration — Rules & Roadmap

BakaTracker is migrating from its V1 stack (React 19 + Zustand UI, FastAPI backend,
Auth0, Google Sheets storage) to a **controlled platform migration**: the UI is
preserved, and the backend is replaced with a Cloudflare-native platform
(Worker + Tool Registry + REST + MCP + Google OAuth + D1 + KV; R2 later).

This document is the contract for every phase. Nothing ships that violates it.

## The Shape

```text
BakaTracker/
│
├── src/                 ← Current UI (preserve; never rewrite working pages)
│
├── platform/            ← All Cloudflare-specific code (isolated from React)
│   ├── auth/            ← Google OAuth (login only — no other Google APIs)
│   ├── registry/        ← Single Tool Registry (the business-logic OS)
│   ├── domain/          ← zod schemas shared by Registry / MCP / REST
│   ├── storage/         ← D1 SQL, KV helpers, repositories, sync engine
│   ├── ai/              ← AI provider abstraction (Workers AI / Google AI)
│   ├── tools/           ← Every capability, registered into the Registry
│   ├── mcp/             ← MCP transport (Durable Object, OAuth-gated)
│   ├── http/            ← REST transport (thin, OAuth bearer-gated)
│   ├── workers/         ← (future) cron / queues / R2 handlers
│   ├── migrations/      ← D1 schema, numbered (0001_init.sql, …)
│   └── wrangler.jsonc
│
└── docs/
```

## Migration Rules (hard)

1. **Never rewrite working UI.** Replace services, not pages. The only V1 seams
   that change are `src/api/`, `src/services/`, `src/features/auth/`,
   `config/env.ts` — everything under `src/pages|components|store|lib|assets|types`
   stays frozen.
2. **Every new backend feature must expose REST + MCP through the same
   Registry.** One business logic; thin transports. Never duplicate logic in a
   transport.
3. **No Worker may access D1 directly. Only repositories.** The layering is
   `Tool → Repository → SQL (db.ts) → D1`. Tools receive `ctx.repos` and must
   not call `db.prepare()` or touch the D1 handle. New features add a
   repository, not raw SQL in a tool.
4. **R2 stores binaries only.** Never markdown, never structured data. Text and
   JSON live in D1 (or the client's IndexedDB).
5. **D1 is the source of truth** for server-side search, analytics, and the
   sync ledger. The client IndexedDB remains the offline write model, but
   anything the server exposes is backed by D1.
6. **The UI never calls MCP.** React talks REST only:
   `UI → stateService → REST → Worker → Registry`. MCP is for Claude, Cursor,
   cron, and other agents.
7. **Platform contains no React. React contains no Worker code.** The
   `platform/` directory is self-contained and type-checks on its own.

## Dependency Order

Install dependencies **before** copying code — otherwise you get hundreds of
import errors. The port order is:

1. Scaffold `platform/` (package.json, tsconfig, wrangler, vitest, migrations)
2. Install dependencies (`npm install`)
3. Domain + Registry (`tsc --noEmit`)
4. Storage: D1 → KV → Repositories → Sync (typecheck)
5. Authentication (Google OAuth)
6. Tool modules
7. REST transport (UI depends on it)
8. AI transport (depends on Registry)
9. MCP transport (depends on Registry + Tools)
10. Entry wiring (`index.ts`, `env.ts`)
11. End-to-end tests through the REAL path:
    `REST → Registry → Tool → Repository → D1` (green)
12. `wrangler deploy --dry-run`, lint, build (pass)
13. Commit: `feat(platform): phase 1 - Cloudflare-native platform`

## Testing Posture

Tests must boot the real worker entry (`main: ./src/index.ts` via
`cloudflare:test`) — never a hello-world scaffold. The suite covers:

- Registry unit tests (unique names, unknown-tool errors)
- REST integration via `SELF.fetch`: registry introspection, full task CRUD
  roundtrip, per-user isolation, 401-without-credential guard, whoami
- MCP endpoint OAuth gate (unauthenticated → 401)

D1 in the test pool starts empty; the spec applies the real migration SQL
(`migrations/0001_init.sql`) before each run, so tests exercise the same
schema production uses.

## Phase Map

- **Phase 1 (done):** Cloudflare-native platform in `platform/` — Registry,
  OAuth, REST, MCP, D1 schema, repositories, real-entry test suite.
- **Phase 2 (next):** Integrate the platform into the UI — swap
  `stateService` (and the auth feature) from FastAPI to the Worker:
  `Current UI → stateService → Worker` instead of `Current UI → FastAPI`.
  Nothing else changes.
- **Phase 3:** Notes-first product work through the new seams (events/XP/levels/
  stats/character/weekly-stats/quotes APIs).
- **Phase 4:** Landing page, settings, UI improvements.

## Google Sheets — REMOVED

V1 wrote backups to Google Sheets. V2 does not touch Sheets anywhere: no
spreadsheets OAuth scope, no `GOOGLE_REFRESH_TOKEN`, no backup rows, no doc
references. Exports are CSV / JSON / Markdown / SQLite instead.
