-- BakaTracker v2 — file attachments (D1 metadata mirror for R2 objects).
--
-- Binaries live in R2 ONLY (key: users/{user_id}/files/{file_id}); this table
-- holds the metadata that makes them findable: ownership, filename, MIME, size.
-- No binary content is ever stored in D1.

CREATE TABLE IF NOT EXISTS files (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,               -- Google `sub` (owner)
  r2_key     TEXT NOT NULL,               -- R2 object key (server-derived, never client-supplied)
  filename   TEXT NOT NULL,
  mime_type  TEXT NOT NULL,
  size       INTEGER NOT NULL,            -- bytes
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_files_user_created ON files(user_id, created_at DESC);