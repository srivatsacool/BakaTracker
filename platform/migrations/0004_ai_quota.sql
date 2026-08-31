-- Phase 2B — dedicated AI quota storage (UTC daily window).
-- One row per (user_id, date_utc). `used` counts consumed turns for the day.
-- D1 handles atomic consume via ON CONFLICT DO UPDATE WHERE used < ?.

CREATE TABLE IF NOT EXISTS ai_quota (
  user_id  TEXT NOT NULL,
  date_utc TEXT NOT NULL, -- YYYY-MM-DD UTC
  used     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date_utc)
);
CREATE INDEX IF NOT EXISTS idx_ai_quota_user_date ON ai_quota(user_id, date_utc);
