-- BakaTracker v2.1 — Notebook + Page persistence for Visual Notes.
--
-- Additive only. Extends `notes` with notebook/position/scene/soft-delete/kind
-- columns and adds a `notebooks` table. Existing text notes remain readable and
-- usable; they are retroactively treated as pages in the default notebook.
--
-- Migration safety:
--   * Every CREATE TABLE / CREATE INDEX uses IF NOT EXISTS (idempotent on re-run).
--   * ALTER TABLE ADD COLUMN does NOT support IF NOT EXISTS in D1/Cloudflare
--     Workers D1 (SQLite fork). Idempotency is guaranteed by the d1_migrations
--     tracking table — Wrangler applies each migration file exactly once and
--     skips already-recorded ones. Never re-run a migration file manually in
--     production; `wrangler d1 migrations apply` is the authoritative mechanism.
--   * No destructive operations: no column drops, no table drops, no data rewrites.
--
-- Storage rules (locked): scene JSON is structured text in D1 — D1 never stores
-- binary blobs or dataURLs. Image assets stay in R2 (see files table / phase8 §1.4).

-- --- Notebooks (1..N pages per user) -----------------------------------------
CREATE TABLE IF NOT EXISTS notebooks (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,               -- Google `sub` (owner)
  name        TEXT NOT NULL DEFAULT 'Personal',
  position    INTEGER NOT NULL DEFAULT 0,  -- sparse ordering within user
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notebooks_user_position ON notebooks(user_id, position);

-- --- Notes extension -------------------------------------------------------
-- `notes` already exists (0001). New columns back-fill safe defaults:
--   kind       → 'text'  (existing notes are text pages)
--   scene      → NULL    (only excalidraw pages carry scene JSON)
--   notebook_id → NULL  (resolved to default "Personal" notebook at read time)
--   position    → 0      (existing notes get position 0; new pages use sparse increments)
--   archived_at  → NULL  (NULL = active; timestamp = soft-deleted)
--   revision     → 0      (optimistic-concurrency for scene saves)
ALTER TABLE notes ADD COLUMN kind        TEXT NOT NULL DEFAULT 'text';
ALTER TABLE notes ADD COLUMN scene       TEXT;                              -- serialized Excalidraw JSON (kind='excalidraw') — NULL for text notes
ALTER TABLE notes ADD COLUMN notebook_id  TEXT;                             -- NULL → resolved to default notebook at read time
ALTER TABLE notes ADD COLUMN position    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notes ADD COLUMN archived_at  TEXT;                             -- soft delete (timestamp = archived; NULL = active)
ALTER TABLE notes ADD COLUMN revision    INTEGER NOT NULL DEFAULT 0;         -- optimistic-concurrency for scene saves

-- User-scoped indexes for notebook/page listing + search.
CREATE INDEX IF NOT EXISTS idx_notes_user_updated  ON notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_notebook ON notes(user_id, notebook_id, position);
CREATE INDEX IF NOT EXISTS idx_notes_user_kind     ON notes(user_id, kind, archived_at);
