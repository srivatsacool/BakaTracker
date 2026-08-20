import type { ApiClient } from '../api/apiClient';

/**
 * Phase 3 — Demo Mode seeding.
 *
 * Populates the CURRENT authenticated user's account with a coherent sample
 * dataset so they can explore the app without creating everything manually.
 *
 * Constraints honoured:
 *  - Data is created ONLY through the Tool Registry REST endpoints
 *    (POST /api/v1/tools/<name>), which scope every row to the caller's `sub`.
 *  - No hardcoded sub, no demo-specific persistence, no schema changes.
 *  - Idempotency: a demo-marker habit detects an existing demo dataset, and
 *    seeding is skipped (reported) instead of duplicating.
 *  - Partial failure: every tool call is awaited individually; failing tool
 *    names are collected and surfaced (never a silent false success).
 */

const isoDayOffset = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export interface DemoTasksSeed {
  title: string;
  body: string;
  tags: string[];
  priority: number; // canonical 0-5 (platform schema TaskPriority)
  status: 'todo' | 'in_progress' | 'done' | 'archived';
  due: string | null;
}

export interface DemoData {
  habits: { name: string; target: number; period: 'day' | 'week' | 'month' }[];
  tasks: DemoTasksSeed[];
  journal: { date: string; entry: string; mood: number }[];
  notes: { title: string; body: string; tags: string[] }[];
}

export const DEMO_DATA: DemoData = {
  habits: [
    { name: 'Morning Workout', target: 1, period: 'day' },
    { name: 'Read 10 Pages', target: 10, period: 'day' },
    { name: 'Meditate', target: 10, period: 'day' },
    { name: 'Sleep 7 Hours', target: 7, period: 'day' },
    { name: 'Learn Something', target: 1, period: 'day' },
  ],
  tasks: [
    {
      title: 'Plan the week ahead',
      body: 'Block deep-work sessions, decide the top 3 priorities.',
      tags: ['planning', 'career'], priority: 3,
      status: 'todo', due: isoDayOffset(1),
    },
    {
      title: 'Finish project proposal draft',
      body: 'First full draft for review.',
      tags: ['work'], priority: 3,
      status: 'in_progress', due: isoDayOffset(2),
    },
    {
      title: 'Morning routine: 30 min workout',
      body: 'Consistency over intensity.',
      tags: ['health'], priority: 2,
      status: 'done', due: isoDayOffset(0),
    },
    {
      title: 'Call a friend',
      body: 'Catch up — social battery.',
      tags: ['personal'], priority: 1,
      status: 'todo', due: isoDayOffset(3),
    },
    {
      title: 'Sort inbox to zero',
      body: 'Triage everything to a destination.',
      tags: ['focus'], priority: 2,
      status: 'in_progress', due: null,
    },
    {
      title: 'Weekly reflection journal',
      body: "What worked, what didn't, next week's one big thing.",
      tags: ['journal', 'planning'], priority: 1,
      status: 'todo', due: isoDayOffset(6),
    },
  ],
  journal: [
    { date: isoDayOffset(-1), entry: 'Solid focus day — hit all three priorities.', mood: 4 },
    { date: isoDayOffset(-2), entry: 'Lower energy, but kept the workout streak alive.', mood: 3 },
    { date: isoDayOffset(-5), entry: 'Kicked off the new system. Excited to build momentum.', mood: 4 },
  ],
  notes: [
    {
      title: 'Productivity system notes',
      body: 'Morning: plan 3 priorities. Evening: journal + reset. Weekly: review and tune.',
      tags: ['system'],
    },
  ],
};

export interface SeedResult {
  ok: boolean;
  skipped: boolean;
  failed: string[];
  created: { habits: number; tasks: number; journal: number; notes: number };
}

const EMPTY_COUNTS = { habits: 0, tasks: 0, journal: 0, notes: 0 };

/**
 * Seed demo data through the Tool Registry REST transport for the
 * authenticated user. All requests carry the user's access token, so the
 * Worker scopes every row to their sub (no hardcoded identity).
 */
export async function seedDemoData(apiClient: ApiClient): Promise<SeedResult> {
  const created = { ...EMPTY_COUNTS };
  const failed: string[] = [];
  const base = '/api/v1/tools/';

  // Duplicate guard: if any demo habit already exists, refuse to re-seed.
  try {
    const existing = await apiClient.post<{ result?: { name?: string }[] }>(`${base}list_habits`, {});
    const demoNames = new Set(DEMO_DATA.habits.map((h) => h.name));
    const hasDemo = (existing?.result ?? []).some((h) => h?.name && demoNames.has(h.name));
    if (hasDemo) return { ok: true, skipped: true, failed: [], created };
  } catch {
    // Listing is best-effort for the guard only; real failures surface below.
  }

  const run = async (tool: string, payload: unknown): Promise<boolean> => {
    try {
      await apiClient.post(`${base}${tool}`, payload);
      return true;
    } catch {
      return false;
    }
  };

  for (const h of DEMO_DATA.habits) {
    if (await run('create_habit', h)) created.habits++;
    else failed.push('create_habit');
  }
  for (const t of DEMO_DATA.tasks) {
    if (await run('create_task', t)) created.tasks++;
    else failed.push('create_task');
  }
  for (const j of DEMO_DATA.journal) {
    if (await run('journal_today', j)) created.journal++;
    else failed.push('journal_today');
  }
  for (const n of DEMO_DATA.notes) {
    if (await run('create_note', n)) created.notes++;
    else failed.push('create_note');
  }

  return { ok: failed.length === 0, skipped: false, failed: [...new Set(failed)], created };
}