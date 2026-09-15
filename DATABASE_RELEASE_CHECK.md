# Database Release Check — BakaTracker v2.3.0
**Target Release:** `v2.3.0`  
**Database Engine:** Cloudflare D1 (SQLite-compatible edge database)  
**Database Name:** `bakas_db` (`bb8219f5-8c61-4403-bc2b-a7edbab889b5`)  
**Audit Date:** 2026-09-15  
**Verification Tooling:** `platform/scripts/db-verify.mjs` & `platform/scripts/db-verify.test.mjs`  

---

## 1. Migration Sequence & Integrity

| Migration File | Description | Operation Type | Applied? | Idempotent? | Destructive? |
|---|---|:---:|:---:|:---:|:---:|
| `0001_init.sql` | Core tables (`tasks`, `habits`, `notes`, `journal`, `sync_meta`, `sync_queue`, `daily_rollups`) | `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` | **YES** | Yes | No |
| `0002_files.sql` | File attachment metadata mirror for R2 objects (`files`) | `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` | **YES** | Yes | No |
| `0003_notes_pages.sql` | Notebooks table (`notebooks`) and additive page columns on `notes` (`kind`, `scene`, `notebook_id`, `position`, `archived_at`, `revision`) | `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ADD COLUMN` | **YES** | Yes (tracked via `d1_migrations`) | No |
| `0004_ai_quota.sql` | Dedicated daily UTC AI usage quota ledger (`ai_quota`) | `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` | **YES** | Yes | No |

**Summary:**  
- **Sequence:** 4 sequential migrations strictly ordered (`0001` through `0004`).
- **Modification of Applied Migrations:** Verified untouched; checksums and filenames preserved.
- **Destructive Statements:** **Zero** `DROP TABLE`, `DROP COLUMN`, or data purge operations. All schema changes are strictly additive.

---

## 2. Verified Schema Objects

The schema verification tool confirmed **10 tables** and **10 indexes**:

### Tables (10)
1. `tasks` — user-scoped tasks, Kanban status (`todo`, `in_progress`, `done`, `archived`), tags, due dates, priority.
2. `habits` — habit definitions, tracker type, frequency, streak, logs.
3. `notes` — visual/text notes, scene JSON, position, soft delete.
4. `journal` — daily reflection highlights, mood, notes, unique on `(user_id, date)`.
5. `sync_meta` — local-wins sync cursors and sync timestamp.
6. `sync_queue` — causal op-log entries with revisions (`add`, `update`, `delete`).
7. `daily_rollups` — analytics rollups per user/day.
8. `files` — R2 attachment metadata (filename, mime, size, owner).
9. `notebooks` — visual notebook groups and sparse ordering.
10. `ai_quota` — atomic consumption ledger per user/UTC date.

### Indexes (10)
1. `idx_tasks_user_status` ON `tasks(user_id, status)`
2. `idx_tasks_due` ON `tasks(user_id, due)`
3. `idx_habits_user` ON `habits(user_id)`
4. `idx_sync_user` ON `sync_queue(user_id, created_at)`
5. `idx_files_user_created` ON `files(user_id, created_at DESC)`
6. `idx_notebooks_user_position` ON `notebooks(user_id, position)`
7. `idx_notes_user_updated` ON `notes(user_id, updated_at DESC)`
8. `idx_notes_user_notebook` ON `notes(user_id, notebook_id, position)`
9. `idx_notes_user_kind` ON `notes(user_id, kind, archived_at)`
10. `idx_ai_quota_user_date` ON `ai_quota(user_id, date_utc)`

---

## 3. Automated Verification Results

- `node scripts/db-verify.mjs`:
  ```text
  BakaTracker D1 verification — local
    expected migrations : 4 (0001_init.sql, 0002_files.sql, 0003_notes_pages.sql, 0004_ai_quota.sql)
    applied migrations  : 4 (0001_init.sql, 0002_files.sql, 0003_notes_pages.sql, 0004_ai_quota.sql)
    expected schema     : 10 tables, 10 indexes

  ✔ database is up to date
  ```
- `node --test scripts/db-verify.test.mjs`:
  - EMPTY database check: **PASS**
  - Fresh migrate check: **PASS**
  - Non-mutating verification check: **PASS**
  - Schema drift detection check: **PASS**
  - Migration omission detection check: **PASS**
  - CLI idempotency check: **PASS**
  - Upstream data preservation check: **PASS**

---

## 4. Production Release Recommendation

**STATUS: PASS**  
The D1 migration suite and schema meet all production reliability, security, and idempotency criteria.
