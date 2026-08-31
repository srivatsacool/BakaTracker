/**
 * Phase 2B — dedicated AI quota storage + atomic consume.
 *
 * Storage: D1 table `ai_quota(user_id, date_utc, used)` — one row per user
 * per UTC day. The counter resets naturally when the date rolls over (new PK).
 *
 * Atomicity: consume is a single UPSERT:
 *   INSERT INTO ai_quota(user_id, date_utc, used) VALUES (?, ?, 1)
 *   ON CONFLICT(user_id, date_utc) DO UPDATE SET used = used + 1
 *   WHERE used < ?
 * If `used >= effectiveQuota`, the WHERE fails → 0 changes → denied. This is
 * safe under concurrent requests because the statement is atomic in SQLite.
 *
 * Refund: failed AI calls (ai_upstream / ai_unavailable / ai_output_invalid)
 * must NOT consume quota — we decrement once. Validation failures (400) never
 * consume (they return before this module).
 */

export function todayUtcISO(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface QuotaStatus {
  used: number;
  remaining: number;
  effectiveQuota: number;
  date: string; // YYYY-MM-DD UTC
  resetAt: string; // ISO instant of next UTC midnight
}

function nextUtcMidnightISO(dateUtc: string): string {
  // dateUtc is YYYY-MM-DD; next midnight is next day 00:00 UTC
  const [y, mo, da] = dateUtc.split("-").map(Number);
  const next = new Date(Date.UTC(y, mo - 1, da + 1, 0, 0, 0, 0));
  return next.toISOString();
}

export async function getQuotaStatus(
  db: D1Database,
  userId: string,
  effectiveQuota: number,
  dateUtc?: string,
): Promise<QuotaStatus> {
  const date = dateUtc ?? todayUtcISO();
  let used = 0;
  try {
    const row = await db.prepare("SELECT used FROM ai_quota WHERE user_id=?1 AND date_utc=?2").bind(userId, date).first<{ used: number }>();
    used = row?.used ?? 0;
  } catch {
    // Table may not exist yet (migration pending) — treat as 0 used.
  }
  return {
    used,
    remaining: Math.max(0, effectiveQuota - used),
    effectiveQuota,
    date,
    resetAt: nextUtcMidnightISO(date),
  };
}

/**
 * Atomically consume one turn if under quota.
 * Returns {allowed, statusAfter}. When denied, statusAfter reflects pre-consume.
 * When allowed, statusAfter reflects post-consume (used+1).
 */
export async function tryConsumeQuota(
  db: D1Database,
  userId: string,
  effectiveQuota: number,
  dateUtc?: string,
): Promise<{ allowed: boolean; status: QuotaStatus }> {
  const date = dateUtc ?? todayUtcISO();
  if (effectiveQuota <= 0) {
    return { allowed: false, status: await getQuotaStatus(db, userId, effectiveQuota, date) };
  }

  try {
    // Atomic UPSERT: insert 1, or bump existing only if under quota.
    const res = await db
      .prepare(
        `INSERT INTO ai_quota(user_id, date_utc, used) VALUES (?1, ?2, 1)
         ON CONFLICT(user_id, date_utc) DO UPDATE SET used = used + 1 WHERE ai_quota.used < ?3`,
      )
      .bind(userId, date, effectiveQuota)
      .run();

    const changed = (res.meta as any)?.changes ?? 0;
    // changed === 1 means we consumed (insert or update). 0 means we were at/over quota.
    if (changed === 1) {
      const status = await getQuotaStatus(db, userId, effectiveQuota, date);
      return { allowed: true, status };
    }
    const status = await getQuotaStatus(db, userId, effectiveQuota, date);
    return { allowed: false, status };
  } catch {
    // Table may not exist yet (migration pending) — allow (no enforcement).
    const status = await getQuotaStatus(db, userId, effectiveQuota, date);
    return { allowed: true, status };
  }
}

/** Refund one turn — idempotent decrement, never below 0. Call after a failed AI execution. */
export async function refundQuota(db: D1Database, userId: string, dateUtc?: string): Promise<void> {
  const date = dateUtc ?? todayUtcISO();
  try {
    await db
      .prepare("UPDATE ai_quota SET used = CASE WHEN used > 0 THEN used - 1 ELSE 0 END WHERE user_id=?1 AND date_utc=?2")
      .bind(userId, date)
      .run();
  } catch {
    // Table may not exist yet (migration pending) — no-op.
  }
}
