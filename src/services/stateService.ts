import type { Habit, HabitLog, Task, JournalEntry, Quote, EventLog, CharacterRecord, WeeklyStatsRecord } from '../types';
import { ApiClient } from '../api/apiClient';

/**
 * v2 state shipped between the UI and the Cloudflare Worker.
 *
 * The UI store (Zustand) is FROZEN: its `RemoteData` shape and the routes it
 * owns (quotes, events, settings, character, weeklyStats) stay untouched.
 * The Worker owns the BACKEND DOMAIN model (tasks / habits / journal — D1).
 *
 * This file is the presentation boundary (Rule 1: replace services, never the
 * UI): it maps worker domain records → the UI presentation model on fetch,
 * and UI state → sync ops on push. UI-only presentation fields that the v2
 * domain does not persist (task `today`/`quadrant`, habit `icon`/`xp`/`stat`,
 * journal `quote_id`, …) are restored here with the same defaults the UI
 * itself uses when creating entities locally — never injected into D1.
 */

export interface RemoteData {
  habits: Habit[];
  habitLogs: HabitLog[];
  tasks: Task[];
  journal: JournalEntry[];
  quotes: Quote[];
  events: EventLog[];
  settings: { key: string; value: string }[];
  metadata?: { schema_version: string; xp_formula: string; last_sync: string }[];
  character?: CharacterRecord[];
  weeklyStats?: WeeklyStatsRecord[];
}

// ---------------------------------------------------------------------------
// Worker v2 domain records (D1 shapes — VERIFIED against platform/schemas.ts)
// ---------------------------------------------------------------------------

interface V2Task {
  id: string;
  title: string;
  body?: string | null;
  status?: string;
  due?: string | null;
  created_at: string;
  updated_at: string;
}
interface V2HabitLogEntry { date: string; count: number }
interface V2Habit {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  log?: V2HabitLogEntry[];
}
interface V2Journal {
  id: string;
  date: string;
  entry?: string | null;
  mood?: number | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Presentation adapters (worker domain ⇄ frozen UI model)
// ---------------------------------------------------------------------------

/** UI defaults — mirror the Habits page "new habit" form (Habits.tsx:52-54). */
const UI_HABIT_DEFAULTS = {
  type: 'checkbox' as const,
  icon: '💪',
  xp: 5,
  stat: 'health' as const,
  active: true,
};

/** v2 task status → UI task status. */
const v2ToUiTaskStatus = (status?: string): Task['status'] => {
  switch (status) {
    case 'in_progress': return 'doing';
    case 'archived': return 'backlog';
    case 'done': return 'done';
    default: return 'todo';
  }
};

/** UI task status → v2 task status. */
const uiToV2TaskStatus = (status: Task['status']): string => {
  switch (status) {
    case 'doing': return 'in_progress';
    case 'backlog': return 'todo';
    case 'done': return 'done';
    default: return 'todo';
  }
};

/** v2 journal mood (int 1-5) → UI mood emoji. */
const v2ToUiMood = (mood: number | null | undefined): JournalEntry['mood'] => {
  if (mood == null) return '';
  if (mood <= 2) return '😞';
  if (mood <= 4) return '😐';
  return '🙂';
};

/** UI mood emoji → v2 journal mood (int 1-5). */
const uiToV2Mood = (mood: JournalEntry['mood']): number | null => {
  switch (mood) {
    case '😞': return 1;
    case '😐': return 3;
    case '🙂': return 5;
    default: return null;
  }
};

/** Worker domain → UI habits (D1 has no presentation fields; restore defaults). */
function adaptHabits(remote: V2Habit[]): { habits: Habit[]; logs: HabitLog[] } {
  const habits: Habit[] = [];
  const logs: HabitLog[] = [];

  for (const h of remote) {
    habits.push({
      id: h.id,
      name: h.name,
      type: UI_HABIT_DEFAULTS.type,
      icon: UI_HABIT_DEFAULTS.icon,
      xp: UI_HABIT_DEFAULTS.xp,
      stat: UI_HABIT_DEFAULTS.stat,
      active: UI_HABIT_DEFAULTS.active,
      created_at: h.created_at,
      updated_at: h.updated_at,
    });

    // Flatten the embedded log [{date, count}] into the UI habitLogs shape.
    for (const entry of h.log ?? []) {
      logs.push({
        id: `${h.id}_${entry.date}`,
        date: entry.date,
        habit_id: h.id,
        value: entry.count ?? 1,
        xp_earned: (entry.count ?? 1) * UI_HABIT_DEFAULTS.xp,
        created_at: h.updated_at,
      });
    }
  }

  return { habits, logs };
}

/** Worker domain tasks → UI tasks. */
function toTasks(remote: V2Task[]): Task[] {
  return remote.map((t) => ({
    id: t.id,
    title: t.title,
    notes: t.body ?? '',
    area: 'personal' as Task['area'],
    status: v2ToUiTaskStatus(t.status),
    today: false,
    due_date: t.due ?? '',
    xp: 0,
    quadrant: null,
    created_at: t.created_at,
    updated_at: t.updated_at,
    completed_at: t.status === 'done' ? t.updated_at : '',
  }));
}

/** Worker domain journal → UI journal (entry → notes; mood int → emoji). */
function toJournal(remote: V2Journal[]): JournalEntry[] {
  return remote.map((j) => ({
    id: j.id,
    date: j.date,
    highlight: '',
    notes: j.entry ?? '',
    mood: v2ToUiMood(j.mood),
    quote_id: '',
    created_at: j.created_at,
    updated_at: j.updated_at,
  }));
}

/** UI habit + its logs → one v2 habit payload with embedded log. */
function habitToV2(habit: Habit, logs: HabitLog[]): Record<string, unknown> {
  return {
    name: habit.name,
    target: 1,
    period: 'day',
    streak: 0,
    log: logs
      .filter((l) => l.habit_id === habit.id)
      .map((l) => ({ date: l.date, count: Number(l.value) || 1 })),
  };
}

// ---------------------------------------------------------------------------
// Regulator — tool calls return the v2 `{ ok: true, result }` envelope
// ---------------------------------------------------------------------------

interface ToolEnvelope<T> {
  ok: boolean;
  result?: T;
  error?: string;
  message?: string;
}

export const stateService = {
  /**
   * Fetches backend state from the Worker through the Tool Registry
   * (`POST /api/v1/tools/list_*`) — parallel, one round trip each.
   */
  fetchData: async (apiClient: ApiClient): Promise<RemoteData | null> => {
    try {
      const [tasksEnvelope, habitsEnvelope, journalEnvelope] = await Promise.all([
        apiClient.post<ToolEnvelope<V2Task[]>>('/api/v1/tools/list_tasks', {}),
        apiClient.post<ToolEnvelope<V2Habit[]>>('/api/v1/tools/list_habits', {}),
        apiClient.post<ToolEnvelope<V2Journal[]>>('/api/v1/tools/list_journal', {}),
      ]);

      const tasks = toTasks(tasksEnvelope.result ?? []);
      const { habits, logs } = adaptHabits(habitsEnvelope.result ?? []);
      const journal = toJournal(journalEnvelope.result ?? []);

      // Fresh login against an empty D1: the frozen store merges
      // `remoteData.tasks.map(...)` UNCONDITIONALLY (no length guard), so an
      // empty remote would wipe locally-synced data. Returning null keeps the
      // local-first behavior until the worker actually has something.
      if (tasks.length === 0 && habits.length === 0 && journal.length === 0) {
        return null;
      }

      // UI-only collections (quotes/events/settings/character/weeklyStats)
      // remain client-side: v2 does not persist them. Empty arrays keep the
      // frozen store's merge logic from overwriting local state.
      return {
        habits,
        habitLogs: logs,
        tasks,
        journal,
        quotes: [],
        events: [],
        settings: [],
      };
    } catch (error) {
      console.error('Failed to fetch data from Cloudflare Worker:', error);
      throw error;
    }
  },

  /**
   * Pushes local state to the Worker via the v2 sync ledger
   * (`POST /api/v1/sync/push`). UI-only collections (quotes/events/settings)
   * stay local — the v2 SyncEntity vocabulary is task/habit/note/journal.
   */
  syncData: async (
    apiClient: ApiClient,
    data: {
      habits: Habit[];
      habitLogs: HabitLog[];
      tasks: Task[];
      journal: JournalEntry[];
      events: EventLog[];
      settings?: { key: string; value: string }[];
      metadata?: { schema_version: string; xp_formula: string; last_sync: string }[];
      character?: CharacterRecord[];
      weeklyStats?: WeeklyStatsRecord[];
    }
  ): Promise<boolean> => {
    try {
      const ops: Record<string, unknown>[] = [];

      for (const t of data.tasks) {
        ops.push({
          op: t.status === 'done' ? 'update' : 'add',
          entity: 'task',
          entity_id: t.id,
          rev: t.updated_at || new Date().toISOString(),
          payload: {
            title: t.title,
            body: t.notes ?? '',
            status: uiToV2TaskStatus(t.status),
            due: t.due_date || null,
            created_at: t.created_at,
            updated_at: t.updated_at,
          },
        });
      }

      for (const h of data.habits) {
        ops.push({
          op: 'update',
          entity: 'habit',
          entity_id: h.id,
          rev: h.updated_at || new Date().toISOString(),
          payload: habitToV2(h, data.habitLogs),
        });
      }

      for (const j of data.journal) {
        ops.push({
          op: 'update',
          entity: 'journal',
          entity_id: j.id,
          rev: j.updated_at || new Date().toISOString(),
          payload: {
            date: j.date,
            entry: j.notes ?? '',
            mood: uiToV2Mood(j.mood),
            created_at: j.created_at,
            updated_at: j.updated_at,
          },
        });
      }

      const result = await apiClient.post<{ accepted: number; conflicts: number; server_time: string }>(
        '/api/v1/sync/push',
        { ops }
      );

      return result.accepted >= 0;
    } catch (error) {
      console.error('Failed to sync data to Cloudflare Worker:', error);
      throw error;
    }
  }
};