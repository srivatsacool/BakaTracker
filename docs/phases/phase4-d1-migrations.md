# Phase 4 — D1 Migration Automation

Status: COMPLETE (initial development/verification phase — production untouched)

## Problem

The D1 schema had no repeatable, verifiable initialization story:

- `db:init` pointed at a nonexistent `./schema.sql` (leftover from an earlier
  approach) → broken out of the box for any fresh clone.
- No way to answer "is this D1 at the expected schema?" without mutating it.
- Migration SQL splitting for Miniflare transports was duplicated in two
  places (E2E harness + vitest spec).
- No tests proved empty-DB, idempotency, upgrade, or data-preservation
  behavior.

## Current migration architecture

```
platform/migrations/*.sql          ← ONE authoritative source (NNNN_name.sql)
        │
        ▼
Wrangler d1 migrations apply       ← platform-native mechanism
        │                           (creates d1_migrations, pending-only,
        ▼                            filename order, rollback on failure)
     D1 (local | remote)
```

- Authoritative source: `platform/migrations/0001_init.sql`, `0002_files.sql`.
- Mechanism: Wrangler's D1 migrations (`migrations_dir` already configured in
  both `platform/wrangler.jsonc` and `platform/wrangler.prod.jsonc`).
- Tracking: the `d1_migrations` table Wrangler creates — `name UNIQUE`,
  applied-only-others. **No custom tracker was introduced.**
- A shared compatibility adapter (`platform/scripts/sql-split.mjs`) splits
  migration SQL into statements for Miniflare D1 transports. It is test
  infrastructure ONLY — Wrangler remains the canonical mechanism.

## Commands (run from `platform/`)

| Command | Target | Mutates? |
|---|---|---|
| `npm run db:init` | local D1 | alias → `db:migrate` (initializes from scratch) |
| `npm run db:migrate` | local D1 | applies pending migrations |
| `npm run db:migrate:remote` | remote D1 (`wrangler.prod.jsonc`) | applies pending — deliberately explicit |
| `npm run db:verify` | local D1 | READ-ONLY schema/migration check |
| `npm run db:verify:remote` | remote D1 (`wrangler.prod.jsonc`) | READ-ONLY check |
| `npm run test:verify` | — (CI) | node:test suite for `db:verify` + CLI behavior |

`db:init` was fixed as a thin alias of `db:migrate` — no second schema file.

## Behavior

- **Empty DB:** `db:migrate` applies every migration in filename order;
  `db:verify` then reports `✔ database is up to date`.
- **Idempotency:** a second `db:migrate` applies zero migrations (Wrangler
  consults `d1_migrations`), zero errors, schema unchanged.
- **Upgrade:** a DB at 0001 → run migration system → 0002 applied, 0001
  untouched.
- **Data preservation:** existing rows survive upgrades (verified with real
  app data in `platform/scripts/db-verify.test.mjs`).
- **Destructive operations:** none of the current migrations are destructive
  (pure additive `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`).
  New destructive migrations must be reviewed before adding.
- **No startup schema creation** anywhere in worker code — schema changes
  happen only via the migration command, so a deploy can never race a DDL.

## Verification (`npm run db:verify`)

Non-mutating (SELECT-only via `wrangler d1 execute --json`, never writes):

- expected migrations derived from the `migrations/` directory (never a
  hardcoded list);
- expected tables + indexes parsed from the migration SQL itself;
- compares against live `d1_migrations` rows + `sqlite_master`.

Distinguishes `✔ database is up to date` from `✗ migration 0002_files.sql not
applied` and `✗ schema object missing: table files`. Exit 0 = up to date,
1 = problems, 2 = could not inspect.

## Miniflare limitation (adapter, not a second schema)

Miniflare's D1 `exec()` rejects comment-leading multi-statement SQL, so
Miniflare-based transports split each migration file into statements before
applying. That logic is now consolidated in `platform/scripts/sql-split.mjs`
and consumed by the E2E harness and the vitest migration tests. It never
replaces Wrangler's native application and never alters the SQL files.

## Self-hosting (clean checkout)

```bash
git clone <repo> && cd BakaTracker
npm install                     # root (UI + tooling)
cd platform && npm install      # worker deps
cp .dev.vars.example .dev.vars  # local-only values (GitHub/Google placeholders)

npm run db:init                 # == db:migrate: initializes local D1
npm run db:verify               # read-only confirmation: up to date
npm run dev                     # app starts, D1 ready
```

No `schema.sql`, no manual SQL, no hidden local state, no personal production
database. Remote (self-hosting deploy) is the documented `npm run setup` →
`npm run deploy` path; `npm run db:migrate:remote` applies pending migrations
to the explicitly-selected remote D1 only.

## Known Cloudflare/Miniflare limitations

- Miniflare D1 `exec()` / batch semantics differ from remote D1 for comment
  leading multi-statement files → the shared splitter above.
- `wrangler d1 execute --json` returns an error object (not an array) when the
  `d1_migrations` table does not exist — `db:verify` treats that as
  "never migrated" rather than a fatal error.
- Local WAL/-shm sidecar files are rewritten on every connection; `db:verify`
  non-mutation tests hash only the main `.sqlite` content files.

## Tests

- `platform/test/migrations.spec.ts` (vitest pool, 4 tests): empty DB,
  idempotency, upgrade, data preservation — same authoritative SQL files,
  same `d1_migrations` tracking the pool provides.
- `platform/scripts/db-verify.test.mjs` (node:test, `npm run test:verify`,
  7 tests): real-wrangler CLI checks against disposable temp persist dirs —
  empty→fail, migrate→pass, non-mutation, schema drift detection, missing
  migration record, CLI idempotency, upgrade + data preservation.

## Gates

Platform tests 45/45 (41 baseline + 4 migration), migration CLI suite 7/7,
Playwright E2E 5/5, tsc clean, lint baseline unchanged, build green,
`wrangler deploy --dry-run` green.

## Production safety

Nothing in this phase ran against production: no remote migrations, no remote
verify, no deploys. Production D1 / KV / R2 / Worker / OAuth untouched.