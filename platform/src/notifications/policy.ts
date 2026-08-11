/**
 * Notification policy engine — deterministic suppression. Cost-free KV reads
 * only; Workers AI is NEVER called when these rules say no notification
 * (cost + spam protection).
 *
 * Order of checks (cheapest first):
 *   1. master opt-out         (settings.enabled)
 *   2. per-category opt-out   (settings.categories)
 *   3. quiet hours            (timezone-aware, overnight wrap supported)
 *   4. daily cap              (max_per_day, resets on the user's local day)
 *   5. dedup / cooldown       (per type+entity; milestones once per value)
 */
import { COOLDOWN_MS } from "./candidates";
import { loadSettings, type NotificationSettings } from "./settings";
import type { NotificationCandidate, NotifCategory } from "./types";
import { inQuietWindow, minutesInTz, todayInTz } from "./candidates";

const STATE_KEY = (sub: string) => `baka:notif:state:${sub}`;
const HISTORY_KEY = (sub: string) => `baka:notif:history:${sub}`;

interface NotificationState {
  /** Local-date (user tz) the counters were last rolled for. */
  date: string;
  sent_today: number;
  /** dedup key (`type:entity_id` or `streak_milestone:entity:id:streak`) → last sent epoch ms. */
  last: Record<string, number>;
  last_sent_at?: number;
}

export type PolicyDecision = { action: "suppress"; reason: string } | { action: "allow" };

export async function evaluateCandidatePolicy(
  kv: KVNamespace,
  userId: string,
  settings: NotificationSettings,
  cand: NotificationCandidate,
  now: Date,
): Promise<PolicyDecision> {
  if (!settings.enabled) return { action: "suppress", reason: "notifications_disabled" };
  if (settings.categories[cand.type] === false) return { action: "suppress", reason: "category_disabled" };

  if (settings.quiet_hours.enabled) {
    const minutes = minutesInTz(now, settings.timezone || "UTC");
    if (inQuietWindow(minutes, settings.quiet_hours.start, settings.quiet_hours.end)) {
      return { action: "suppress", reason: "quiet_hours" };
    }
  }

  const state = await loadState(kv, userId, now, settings.timezone || "UTC");
  if (state.sent_today >= settings.max_per_day) return { action: "suppress", reason: "daily_cap" };

  const dedupKey = dedupKeyFor(cand);
  const lastSent = state.last[dedupKey];
  if (lastSent !== undefined) {
    const cooldown = COOLDOWN_MS[cand.type];
    if (now.getTime() - lastSent < cooldown) {
      return { action: "suppress", reason: "cooldown" };
    }
  }

  return { action: "allow" };
}

/** Persist the fact that a notification for `cand` was sent at `now`.
 * `tz` must be the user's timezone so the daily cap rolls on the user's day. */
export async function recordSent(
  kv: KVNamespace,
  userId: string,
  cand: NotificationCandidate,
  now: Date,
  tz: string,
): Promise<void> {
  const state = await loadState(kv, userId, now, tz);
  state.sent_today += 1;
  state.last[dedupKeyFor(cand)] = now.getTime();
  state.last_sent_at = now.getTime();
  await kv.put(STATE_KEY(userId), JSON.stringify(state));
}

/** Append to the ring-buffer history (bounded, user-scoped). */
export async function appendHistory(
  kv: KVNamespace,
  userId: string,
  entry: { id: string; type: NotifCategory; tone: string; message: string; entity_id: string; created_at: string },
): Promise<void> {
  const raw = await kv.get(HISTORY_KEY(userId));
  const history: unknown[] = raw ? JSON.parse(raw) : [];
  history.push(entry);
  const trimmed = history.slice(-50);
  await kv.put(HISTORY_KEY(userId), JSON.stringify(trimmed));
}

export async function loadHistory(kv: KVNamespace, userId: string): Promise<unknown[]> {
  const raw = await kv.get(HISTORY_KEY(userId));
  return raw ? JSON.parse(raw) : [];
}

/** Daily rollover is lazy: counters reset when the user's local date changes. */
async function loadState(kv: KVNamespace, userId: string, now: Date, tz: string): Promise<NotificationState> {
  const raw = await kv.get(STATE_KEY(userId));
  let state: NotificationState | null = raw ? (JSON.parse(raw) as NotificationState) : null;
  const localToday = todayInTz(now, tz);
  if (!state || state.date !== localToday) {
    state = state ?? { date: localToday, sent_today: 0, last: {} };
    state.date = localToday;
    state.sent_today = 0;
    // Prune dedup map entries older than 48h (cooldowns are ≤ 24h).
    const cutoff = now.getTime() - 48 * 3_600_000;
    for (const [k, ts] of Object.entries(state.last)) {
      if (ts < cutoff) delete state.last[k];
    }
  }
  return state;
}

/** `type:entity_id`, or `streak_milestone:entity_id:<streak>` for value-keyed milestones. */
function dedupKeyFor(cand: NotificationCandidate): string {
  if (cand.type === "streak_milestone") {
    return `${cand.type}:${cand.entity_id}:${cand.context.streak ?? "?"}`;
  }
  return `${cand.type}:${cand.entity_id}`;
}

export { loadSettings };
