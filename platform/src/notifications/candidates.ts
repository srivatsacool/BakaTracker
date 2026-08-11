/**
 * Candidate engine — DETERMINISTIC rules that turn user state into
 * structured notification candidates. No AI here. The scheduler decides WHEN
 * to evaluate; these rules decide WHETHER something is meaningful; AI only
 * phrases the message (and only after the policy engine approves).
 *
 * All `now`-dependent math is injected — tests never depend on wall-clock.
 */
import type { Repositories } from "../storage/repositories";
import type { NotificationCandidate, NotifCategory, NotifPriority } from "./types";
import type { NotificationSettings } from "./settings";

export const MAX_CANDIDATES_PER_USER_PER_RUN = 5;

/** Per-category cooldown between identical notifications (ms). */
export const COOLDOWN_MS: Record<NotifCategory, number> = {
  overdue_task: 12 * 60 * 60 * 1000,
  deadline_approaching: 6 * 60 * 60 * 1000,
  streak_at_risk: 12 * 60 * 60 * 1000,
  // streak_milestone: keyed by (habit, streak value) below — sent at most once per value.
  streak_milestone: Number.POSITIVE_INFINITY,
};

export interface CandidateCollection {
  candidates: NotificationCandidate[];
}

/**
 * Collect bounded, user-scoped candidates for one user at time `now`.
 * Every rule reads through the repositories (the one business-logic layer) —
 * the engine never touches D1/R2 directly.
 */
export async function collectCandidates(
  repos: Repositories,
  userId: string,
  now: Date,
  settings: NotificationSettings,
): Promise<NotificationCandidate[]> {
  const tz = settings.timezone || "UTC";
  const localToday = todayInTz(now, tz);
  const candidates: NotificationCandidate[] = [];

  // --- Task rules ---------------------------------------------------------
  const [todoTasks, inProgressTasks] = await Promise.all([
    repos.tasks.list(userId, "todo"),
    repos.tasks.list(userId, "in_progress"),
  ]);
  const openTasks = [...todoTasks, ...inProgressTasks];

  for (const t of openTasks) {
    const due = parseDue(t.due);
    if (!due) continue;

    if (due.kind === "instant") {
      const msLeft = due.at - now.getTime();
      if (msLeft < 0) {
        const hoursOver = Math.max(1, Math.round(-msLeft / 3_600_000));
        candidates.push({
          type: "overdue_task",
          priority: 3,
          entity_id: t.id,
          user_id: userId,
          context: { title: t.title, due: t.due ?? "", overdue_hours: hoursOver },
        });
      } else if (msLeft <= 24 * 3_600_000) {
        candidates.push({
          type: "deadline_approaching",
          priority: 2,
          entity_id: t.id,
          user_id: userId,
          context: { title: t.title, due: t.due ?? "", due_in_hours: Math.max(1, Math.round(msLeft / 3_600_000)) },
        });
      }
      continue;
    }

    // Local-date due: compare calendar days in the user's timezone.
    const daysUntil = daysBetween(localToday, due.date);
    if (daysUntil < 0) {
      candidates.push({
        type: "overdue_task",
        priority: 3,
        entity_id: t.id,
        user_id: userId,
        context: { title: t.title, due: due.date, days_overdue: -daysUntil },
      });
    } else if (daysUntil === 0 || daysUntil === 1) {
      const hour = hourInTz(now, tz);
      const dueInHours = daysUntil === 0 ? Math.max(1, 24 - hour) : 24 + (24 - hour);
      candidates.push({
        type: "deadline_approaching",
        priority: 2,
        entity_id: t.id,
        user_id: userId,
        context: { title: t.title, due: due.date, due_in_hours: dueInHours },
      });
    }
  }

  // --- Habit rules --------------------------------------------------------
  const habits = await repos.habits.list(userId);
  for (const h of habits) {
    if (h.streak > 0 && h.streak % 7 === 0) {
      // Milestones are keyed by (habit, streak value) → sent at most once.
      candidates.push({
        type: "streak_milestone",
        priority: 1,
        entity_id: h.id,
        user_id: userId,
        context: { name: h.name, streak: h.streak },
      });
    }

    const lastLogDate = h.log.length ? h.log.map((l) => l.date).sort().at(-1) ?? "" : "";
    const riskWindowDays = h.period === "week" ? 7 : 1;
    const daysSinceLog = lastLogDate ? daysBetween(lastLogDate, localToday) : Number.POSITIVE_INFINITY;
    if (h.streak > 0 && daysSinceLog >= riskWindowDays) {
      candidates.push({
        type: "streak_at_risk",
        priority: 2,
        entity_id: h.id,
        user_id: userId,
        context: { name: h.name, streak: h.streak, period: h.period },
      });
    }
  }

  // Bound the per-run work: highest priority first, then stable order.
  return candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_CANDIDATES_PER_USER_PER_RUN);
}

// --- timezone helpers (deterministic, testable) ---------------------------

/** YYYY-MM-DD date in the given IANA timezone. */
export function todayInTz(now: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Hour of day (0-23) in the given timezone. */
export function hourInTz(now: Date, tz: string): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hour12: false }).format(now));
}

/** Minutes since midnight in the given timezone. */
export function minutesInTz(now: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/** Whole-day difference `b - a` for YYYY-MM-DD dates (negative = b is before a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86_400_000);
}

/** True when `minutes` falls inside the quiet window (handles overnight wrap). */
export function inQuietWindow(minutes: number, start: string, end: string): boolean {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return false; // empty window
  if (s < e) return minutes >= s && minutes < e;
  return minutes >= s || minutes < e; // wraps midnight
}

type ParsedDue = { kind: "date"; date: string } | { kind: "instant"; at: number } | null;

/** Parse a task `due` value: YYYY-MM-DD (local-date semantics) or an ISO instant. */
export function parseDue(due: string | null | undefined): ParsedDue {
  if (!due) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) return { kind: "date", date: due };
  const at = Date.parse(due);
  if (Number.isFinite(at)) return { kind: "instant", at };
  return null;
}
