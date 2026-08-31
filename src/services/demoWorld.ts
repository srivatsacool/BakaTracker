/*
 * BAKATRACKER V3.5 — demo world (Phase 4)
 *
 * One coherent synthetic life, ~30 days deep: presets + custom habits, a
 * rough patch, a missed-habit recovery arc, a real 7-day streak, tasks in
 * every state (incl. one overdue and one cleared today), journal entries on
 * most but not all days. Deterministic: same date window + same seed table
 * produce the same rows every load — no Math.random, no Date.now jitter
 * (dates anchor to today because the product is day-based; that is the ONE
 * intended drift).
 *
 * Isolation contract (docs V3.5 §24): every row carries the `demo-v35-` ID
 * prefix and every derived reference (habit_id, entity_id) uses it too.
 * purgeDemoData() removes EXACTLY these rows — personal data can never be
 * touched by demo cleanup, and demo rows are purged before a demo device's
 * ledger is ever promoted to a signed-in account.
 *
 * XP/level/streaks are NOT hand-tuned: the store recomputes them through
 * the canonical pipeline (calculateCharacterStats) after seeding.
 */
import type { EventLog, Habit, HabitLog, JournalEntry, Task } from '../types'

export const DEMO_ID_PREFIX = 'demo-v35-'

/* ---------------- deterministic PRNG (mulberry32) ---------------- */

function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 86400000

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ---------------- the script ----------------
 * Day indexes: 0 = 29 days ago … 29 = today.
 *
 * Narrative arc (Srivatsa, 24, PGDM RBA + building BakaTracker):
 *   days  0–7   — strong opener: most habits logged, tasks moving, good sleep
 *   days  8–12  — project crunch: sleep drops, mood dips, workouts slip
 *   days 13–19  — slump: missed days on multiple habits, mood bottoms out
 *   days 20–29  — recovery: habits return, streaks rebuild, mood climbs
 *
 * Personality quirks baked in: always sleeps more on weekends, skips
 * workouts when sleep < 6h, drinks more water on gym days, reads more
 * on weekends when there's time.
 */

interface DemoWorld {
  habits: Habit[]
  habitLogs: HabitLog[]
  tasks: Task[]
  journal: JournalEntry[]
  events: EventLog[]
}

export function buildDemoWorld(now: number = Date.now()): DemoWorld {
  const rand = prng(0xBACAB35D)
  const day = (i: number) => fmt(new Date(now - (29 - i) * DAY))
  const at = (i: number, hh: number, mm = 0) =>
    new Date(new Date(now - (29 - i) * DAY).setHours(hh, mm, 0, 0)).toISOString()

  const iso = new Date(now).toISOString()

  /* ---- habits: 5 presets + 2 custom ---- */
  const H = (i: string, name: string, type: Habit['type'], icon: string, xp: number, stat: Habit['stat'], preset?: Habit['preset']): Habit => ({
    id: `${DEMO_ID_PREFIX}h-${i}`, name, type, icon, xp, stat, active: true, preset,
    created_at: day(0) + 'T09:00:00.000Z', updated_at: iso,
  })
  const habits: Habit[] = [
    H('mood', 'Mood', 'mood', '😊', 5, 'discipline', 'mood'),
    H('water', 'Water', 'numeric', '💧', 5, 'health', 'water'),
    H('sleep', 'Sleep', 'numeric', '🌙', 5, 'health', 'sleep'),
    H('reading', 'Reading', 'reading', '📖', 8, 'knowledge', 'reading'),
    H('workout', 'Workout', 'workout', '🏋️', 12, 'health', 'workout'),
    H('meditate', 'Meditate', 'checkbox', '🧘', 8, 'discipline'),
    H('deepwork', 'Deep Work Block', 'checkbox', '🎯', 15, 'career'),
  ]

  const logs: HabitLog[] = []
  const events: EventLog[] = []
  let logN = 0
  let evtN = 0
  const logH = (habit: Habit, i: number, value: number | string, hh: number, mm: number, count = true) => {
    const xp = value ? habit.xp : 0
    logs.push({
      id: `${DEMO_ID_PREFIX}log-${++logN}`, date: day(i), habit_id: habit.id,
      value, xp_earned: count ? xp : 0, created_at: at(i, hh, mm),
    })
    if (count && xp > 0) {
      events.push({
        id: `${DEMO_ID_PREFIX}e-${++evtN}`, type: 'habit_completed', source: 'habit',
        entity: habit.name, entity_id: habit.id, xp, stat: habit.stat,
        metadata: JSON.stringify({ value }), timestamp: at(i, hh, mm),
      })
    }
  }

  /* ---------- daily data tables ----------
   * null = habit not logged that day (missed or intentionally skipped).
   * Values are hand-picked to form a coherent arc, then the loop applies
   * controlled random jitter within realistic bounds. */

  // Mood: 1=awful 2=rough 3=meh 4=good 5=great
  const MOOD = [4,3,4,5,4,3,4,3, 3,2,2,3,2, 2,3,2,1,2,3, 3,4,4,5,4, 5,4,5,4,5,3] as const

  // Water (L): null = missed. Crunch + slump = lower; gym days = higher.
  const WATER: (number | null)[] = [
    2.0,2.5,2.25,2.75,2.5,2.0,2.5,2.25,
    1.75,1.5,1.25,1.5,1.75,
    null,1.25,1.5,null,1.5,2.0,
    2.25,2.5,2.75,3.0,2.5, 2.75,2.5,3.0,2.5,2.75,2.0,
  ]

  // Sleep (h): null = missed logging. Weekdays crunch lower, weekends bounce.
  const SLEEP: (number | null)[] = [
    7.5,7.0,8.0,8.5,7.5,8.0,8.5,7.5,
    6.5,6.0,5.5,6.0,6.5,
    null,7.0,null,5.5,6.0,7.5,
    7.0,8.0,8.5,8.0,7.5, 8.5,8.0,8.5,7.5,8.0,7.5,
  ]

  // Reading: [mode, amount] or null. Alternates pages/minutes. More on weekends.
  const READING: ([mode: 'p' | 'm', amt: number] | null)[] = [
    ['m',20],['p',25],['m',30],['p',20],['m',15],['p',35],['m',25],['p',15],
    ['m',15],['p',10],null,['m',15],null,
    null,null,null,null,['p',10],['m',15],
    ['p',20],['m',30],['p',25],['m',35],['p',20], ['m',25],['p',30],['m',20],['p',25],['m',30],['p',15],
  ]

  // Workout: [bodyPart, minutes] or null. ~3x/week, skipped when tired.
  const WORKOUT: ([part: string, mins: number] | null)[] = [
    ['back',45],null,['chest',40],null,['shoulders',35],null,null,
    ['legs',60],null,['arms',30],null,null,
    null,null,null,null,['home',25],null,
    ['back',50],null,['chest',45],['legs',80],null, ['shoulders',40],null,['arms',35],['back',55],null,null,
  ]

  // Meditate: 1=done, null=missed. Daily except 3 days in the slump.
  const MEDITATE: (1 | null)[] = [
    1,1,1,1,1,1,1,1,
    1,1,1,1,1,
    null,null,null,1,1,1,
    1,1,1,1,1, 1,1,1,1,1,1,
  ]

  // Deep work: 1=done, null=missed. Weekdays only, none in rough patch.
  const DEEPWORK: (1 | null)[] = [
    1,null,1,1,null,1,null,
    null,null,null,null,null,null,
    null,null,null,null,null,null,
    1,null,1,1,null, 1,1,null,1,1,null,
  ]

  /* ---------- generate habit logs ---------- */
  for (let i = 0; i < 30; i++) {
    const r = rand()

    if (i === 29) {
      // Today: a life in progress — morning items logged, evening items open
      // so visitors can complete things and watch BakaSur react.
      logH(habits[2], 29, 7.5, 7, 45)
      logH(habits[5], 29, 1, 6, 40)
      logH(habits[1], 29, 2.0, 8, 30)
      continue
    }

    // Mood
    if (MOOD[i] != null) logH(habits[0], i, ['😞','😐','🙂','😄','🤩'][MOOD[i]! - 1], 21, 30)

    // Water — jitter ±0.25L within the table value
    if (WATER[i] != null) {
      const base = WATER[i]!
      const jitter = Math.round((r - 0.5) * 2 * 4) / 4
      logH(habits[1], i, Math.round((base + jitter) * 4) / 4, 22, 0)
    }

    // Sleep — jitter ±0.5h, clamped to preset range
    if (SLEEP[i] != null) {
      const base = SLEEP[i]!
      const jitter = Math.round((r - 0.5) * 2) * 0.5
      logH(habits[2], i, Math.max(5.5, Math.min(9, base + jitter)), 7, 45)
    }

    // Reading
    if (READING[i] != null) {
      const [mode, amt] = READING[i]!
      const jitter = Math.floor((r - 0.5) * 10)
      logH(habits[3], i, `${mode}:${Math.max(5, amt + jitter)}`, 21, 0)
    }

    // Workout
    if (WORKOUT[i] != null) {
      const [part, mins] = WORKOUT[i]!
      const jitter = Math.floor((r - 0.5) * 15)
      logH(habits[4], i, `w:${part}:${Math.max(15, Math.min(180, mins + jitter))}`, 18, 15)
    }

    // Meditate
    if (MEDITATE[i] === 1) logH(habits[5], i, 1, 6, 40)

    // Deep work
    if (DEEPWORK[i] === 1) logH(habits[6], i, 1, 10, 0)
  }

  /* ---- tasks — every state, one overdue, one cleared this morning ---- */
  type TRow = [title: string, notes: string, area: Task['area'], status: Task['status'], today: boolean, dueOffset: number | '', xp: number, quadrant: Task['quadrant']]
  const rows: TRow[] = [
    ['Finish the client proposal draft', 'Pricing table is the scary part. Write it anyway.', 'career', 'doing', true, 2, 25, 'do'],
    ['Write weekly review draft', 'Three bullets: shipped, learned, deferred.', 'career', 'todo', true, 1, 15, 'do'],
    ['Book the dentist', 'Finally. Call before Friday.', 'health', 'todo', false, -2, 10, 'schedule'],
    ['Read Atomic Habits ch. 4', 'Note the identity-based habits passage.', 'learning', 'todo', true, 5, 10, 'schedule'],
    ['Plan weekend hike', 'Route + weather check + pack list.', 'personal', 'backlog', false, '', 8, null],
    ['Refactor sync retry logic', 'Cover the reconnect backoff path.', 'career', 'backlog', false, '', 20, null],
    ['Draft newsletter issue #12', 'On building in public with a familiar.', 'creativity', 'backlog', false, '', 15, 'delegate'],
    ['Water the desk plant', 'It forgives, but it remembers.', 'personal', 'backlog', false, '', 2, 'delete'],
    ['Finish the portfolio audit draft', 'Chapter three is half-written. Ship the rest.', 'career', 'done', true, 0, 25, 'do'],
    ['Rewrite the streak email sequence', 'It earned the seven-day subject line.', 'creativity', 'done', false, 0, 10, null],
    ['Fix the broken shelf bracket', 'Third time it slips. Get the wall anchors.', 'personal', 'done', false, -1, 20, 'do'],
    ['Sketch poster concepts', 'Two directions max — let them fight on paper.', 'creativity', 'doing', false, 4, 18, 'schedule'],
  ]
  const tasks: Task[] = rows.map(([title, notes, area, status, todayStar, dueOffset, xp, quadrant], i) => ({
    id: `${DEMO_ID_PREFIX}task-${i}`,
    title, notes, area, status, today: todayStar, xp, quadrant,
    due_date: dueOffset === '' ? '' : fmt(new Date(now - dueOffset * DAY)),
    created_at: day(2) + 'T10:00:00.000Z',
    updated_at: iso,
    completed_at: status === 'done' ? (i === 8 ? at(29, 9, 12) : day(26 - (i % 3)) + 'T17:00:00.000Z') : '',
  }))
  events.push({
    id: `${DEMO_ID_PREFIX}e-task-8`, type: 'task_completed', source: 'task',
    entity: tasks[8].title, entity_id: tasks[8].id, xp: tasks[8].xp, stat: 'career',
    timestamp: at(29, 9, 12),
  })

  /* ---- journal — most days, never every day (that would be fake) ---- */
  type JRow = [i: number, highlight: string, mood: JournalEntry['mood']]
  const entries: JRow[] = [
    [0, 'First day with the preset tracker. Water slider feels oddly satisfying.', '🙂'],
    [2, 'Long run, short sleep, still logged it. That counts.', '😐'],
    [4, 'Deep work block actually stuck today. Phone in a drawer.', '😄'],
    [6, 'Read 40 pages on the train. Book beats scroll.', '🙂'],
    [9, 'Skipped workout twice in a row. Crunch week is eating the schedule.', '😐'],
    [13, 'Missed everything today. Even the familiar creatures stay quiet.', '😞'],
    [15, 'Bad week. Journal is the one thing that still gets done.', '😞'],
    [18, 'Slept badly, worked slow. Slow is allowed.', '😐'],
    [21, 'Rough patch over. Went for a walk, reset the brain.', '🙂'],
    [25, 'Big ship day. Overdue list shorter, mood longer.', '😄'],
    [27, 'Two focus blocks before lunch. The heatmap is filling in.', '🙂'],
    [29, 'Cleared the overdue list this morning. Dentist is still on it.', '😐'],
  ]
  const journal: JournalEntry[] = entries.map(([i, highlight, mood], n) => ({
    id: `${DEMO_ID_PREFIX}j-${n}`, date: day(i), highlight, mood,
    notes: n % 4 === 0 ? 'One line is enough. Consistency over poetry.' : '',
    quote_id: 'q3', created_at: at(i, 21, 15), updated_at: at(i, 21, 15),
  }))
  for (const [n, [i, , ]] of entries.entries()) {
    events.push({
      id: `${DEMO_ID_PREFIX}e-j-${n}`, type: 'journal_created', source: 'journal',
      entity: 'Daily Reflection Logged', entity_id: `${DEMO_ID_PREFIX}j-${n}`, xp: 10, stat: 'discipline',
      timestamp: at(i, 21, 15),
    })
  }

  return { habits, habitLogs: logs, tasks, journal, events }
}

/** True for any row that belongs to the demo world (prefix on the row id
 *  or on the owning habit). */
export function isDemoRowString(id: string | undefined | null): boolean {
  return typeof id === 'string' && id.startsWith(DEMO_ID_PREFIX)
}

/** Filter helper for purgeDemoData — used against every ledger array. */
export function stripDemoRows<T extends { id: string }>(rows: T[]): T[] {
  return rows.filter(r => !isDemoRowString(r.id))
}
export function stripDemoByHabit<T extends { habit_id: string }>(rows: T[]): T[] {
  return rows.filter(r => !isDemoRowString(r.habit_id))
}
export function stripDemoEvents(rows: EventLog[]): EventLog[] {
  return rows.filter(e => !isDemoRowString(e.id) && !isDemoRowString(e.entity_id))
}
