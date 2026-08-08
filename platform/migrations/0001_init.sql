-- BakaTracker v2 — D1 schema (metadata, search index, analytics, sync state).
-- Authoritative write model lives in IndexedDB on the client; D1 mirrors it
-- for cross-device search/analytics and holds the sync ledger.

-- --- Core entities (server-side index / search mirror) ----------------------

CREATE TABLE IF NOT EXISTS tasks (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,               -- Google `sub`
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  eta        TEXT,
  status     TEXT NOT NULL DEFAULT 'todo',   -- todo | in_progress | done | archived
  title      TEXT NOT NULL,
  body       TEXT,
  tags       TEXT,                      -- JSON array
  due        TEXT,                      -- ISO date
  priority   INTEGER NOT NULL DEFAULT 0,
  sort       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(user_id, due);

CREATE TABLE IF NOT EXISTS habits (
  id         TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  name       TEXT NOT NULL,
  target     INTEGER NOT NULL DEFAULT 1,   -- per period
  period     TEXT NOT NULL DEFAULT 'day',  -- day | week | month
  streak     INTEGER NOT NULL DEFAULT 0,
  log        TEXT                          -- JSON array of {date, count}
);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);

CREATE TABLE IF NOT EXISTS notes (
  id         TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  title   TEXT NOT NULL,
  body    TEXT,
  tags    TEXT,
  vector  TEXT                            -- dense embedding (JSON float[])
);
-- Search is LIKE-based for now (works out of the box); FTS5/vector index
-- lands with semantic search (v2.1).

CREATE TABLE IF NOT EXISTS journal (
  id         TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL,
  date       TEXT NOT NULL,               -- YYYY-MM-DD
  entry      TEXT,
  mood       INTEGER,                      -- 1..5
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

-- --- Sync ledger (local-wins reconciliation) -------------------------------

CREATE TABLE IF NOT EXISTS sync_meta (
  user_id    TEXT PRIMARY KEY,
  last_sync  TEXT,
  cursor     TEXT
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id            TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  op           TEXT NOT NULL,               -- add | update | delete
  entity       TEXT NOT NULL,               -- task | habit | note | journal
  entity_id    TEXT NOT NULL,
  payload      TEXT,                        -- JSON
  rev          TEXT NOT NULL,               -- causal revision
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sync_user ON sync_queue(user_id, created_at);

-- --- Analytics materialized rollups ----------------------------------------

CREATE TABLE IF NOT EXISTS daily_rollups (
  user_id  TEXT NOT NULL,
  day      TEXT NOT NULL,                -- YYYY-MM-DD
  data     TEXT,
  PRIMARY KEY (user_id, day)
);