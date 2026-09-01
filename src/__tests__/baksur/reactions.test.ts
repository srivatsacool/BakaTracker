/**
 * V3.4.3 — Baksur reaction engine validation (pure, DOM-free).
 *
 * The watcher must react EXACTLY ONCE per real fact, never replay history,
 * never spam within the cooldown, and prefer the biggest moment when several
 * land together. Facts come from the same shapes the store writes: EventLog
 * rows, habits+logs through the real streak calculator, stats.level.
 */
import { describe, expect, it } from 'vitest'
import {
  createReactionWatcher,
  eventKey,
  REACTION_VISUAL,
  STREAK_MILESTONES,
} from '../../components/shell/baksurReactions'
import type { ReactionSnapshot } from '../../components/shell/baksurReactions'
import type { EventLog, Habit, HabitLog } from '../../types'

const T0 = 1_000_000

function event(over: Partial<EventLog> & { id: string }): EventLog {
  return {
    type: 'task_completed',
    source: 'task',
    entity: 'x',
    entity_id: `task_${over.id}`,
    xp: 10,
    stat: 'general',
    timestamp: new Date(T0).toISOString(),
    ...over,
  }
}

function checkboxHabit(id: string): Habit {
  return {
    id,
    name: id,
    type: 'checkbox',
    icon: 'x',
    xp: 5,
    stat: 'discipline',
    active: true,
  } as Habit
}

function logOnDate(habitId: string, date: string): HabitLog {
  return { id: `log_${habitId}_${date}`, date, habit_id: habitId, value: 1, xp_earned: 5, created_at: date } as HabitLog
}

/** Dates (YYYY-MM-DD local) offset from today, matching getTodayDateString's format. */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function streakLogs(habitId: string, length: number): HabitLog[] {
  // length consecutive days ending today
  return Array.from({ length }, (_, i) => logOnDate(habitId, daysAgo(i)))
}

function snap(over: Partial<ReactionSnapshot> = {}): ReactionSnapshot {
  return { events: [], habits: [], habitLogs: [], level: 1, now: T0, ...over }
}

describe('baksur reaction watcher', () => {
  it('seeds history silently — existing completed items never fire', () => {
    const w = createReactionWatcher()
    const initial = snap({ events: [event({ id: 'e1' })], level: 5 })
    expect(w.consume(initial)).toBeNull()
    // re-observing the same state (rerenders, re-syncs) stays silent
    expect(w.consume(initial)).toBeNull()
    expect(w.consume(snap({ events: [event({ id: 'e1' })], level: 5, now: T0 + 99999 }))).toBeNull()
  })

  it('fires QUEST/HABIT/JOURNAL exactly once per distinct store event', () => {
    const w = createReactionWatcher()
    w.consume(snap())
    const e2 = event({ id: 'e2', type: 'task_completed' })
    expect(w.consume(snap({ events: [e2], now: T0 + 5000 }))).toBe('QUEST_COMPLETED')
    // same event, later ticks: never again
    expect(w.consume(snap({ events: [e2], now: T0 + 6000 }))).toBeNull()
    const e3 = event({ id: 'e3', type: 'habit_completed' })
    expect(w.consume(snap({ events: [e2, e3], now: T0 + 10_000 }))).toBe('HABIT_COMPLETED')
    const e4 = event({ id: 'e4', type: 'journal_created' })
    expect(w.consume(snap({ events: [e2, e3, e4], now: T0 + 15_000 }))).toBe('JOURNAL_LOGGED')
    // all three acknowledged — forever silent on the same ledger
    expect(w.consume(snap({ events: [e2, e3, e4], now: T0 + 99_000 }))).toBeNull()
  })

  it('respects the cooldown window deterministically', () => {
    const w = createReactionWatcher({ cooldownMs: 4000 })
    w.consume(snap())
    expect(w.consume(snap({ events: [event({ id: 'a' })], now: T0 + 5000 }))).toBe('QUEST_COMPLETED')
    // 1s later: suppressed AND consumed (never replayed after cooldown)
    expect(w.consume(snap({ events: [event({ id: 'b' })], now: T0 + 6000 }))).toBeNull()
    expect(w.consume(snap({ events: [event({ id: 'b' })], now: T0 + 20_000 }))).toBeNull()
    // outside cooldown: new fact fires
    expect(w.consume(snap({ events: [event({ id: 'c' })], now: T0 + 20_000 }))).toBe('QUEST_COMPLETED')
  })

  it('priority: biggest moment wins when several land in one tick', () => {
    const w = createReactionWatcher()
    const habit = checkboxHabit('h1')
    w.consume(snap())
    const signal = w.consume(snap({
      events: [
        event({ id: 'x1', type: 'habit_completed' }),
        event({ id: 'x2', type: 'task_completed' }),
      ],
      habits: [habit],
      habitLogs: streakLogs('h1', STREAK_MILESTONES[0]),
      level: 1,
      now: T0 + 5000,
    }))
    expect(signal).toBe('STREAK_MILESTONE')
    // the lower-priority facts were still acknowledged — no second wave
    expect(w.consume(snap({
      events: [event({ id: 'x1', type: 'habit_completed' }), event({ id: 'x2', type: 'task_completed' })],
      habits: [habit],
      habitLogs: streakLogs('h1', STREAK_MILESTONES[0]),
      now: T0 + 30_000,
    }))).toBeNull()
  })

  it('streak milestone fires once per habit/threshold; higher threshold later', () => {
    const w = createReactionWatcher()
    const habit = checkboxHabit('h1')
    w.consume(snap())
    const at7 = w.consume(snap({ habits: [habit], habitLogs: streakLogs('h1', 7), now: T0 + 5000 }))
    expect(at7).toBe('STREAK_MILESTONE')
    // still 7: silent
    expect(w.consume(snap({ habits: [habit], habitLogs: streakLogs('h1', 7), now: T0 + 30_000 }))).toBeNull()
    // crossed 14: fires again (different threshold key)
    expect(w.consume(snap({ habits: [habit], habitLogs: streakLogs('h1', 14), now: T0 + 50_000 }))).toBe('STREAK_MILESTONE')
  })

  it('level increases fire LEVEL_UP once; the first observation never does', () => {
    const w = createReactionWatcher()
    // seed baseline at level 3 — no celebration for pre-existing level
    expect(w.consume(snap({ level: 3 }))).toBeNull()
    expect(w.consume(snap({ level: 4, now: T0 + 5000 }))).toBe('LEVEL_UP')
    expect(w.consume(snap({ level: 4, now: T0 + 30_000 }))).toBeNull()
    expect(w.consume(snap({ level: 5, now: T0 + 30_000 }))).toBe('LEVEL_UP')
  })

  it('deactivating a habit does not resurrect its milestone', () => {
    const w = createReactionWatcher()
    const habit = checkboxHabit('h1')
    w.consume(snap())
    expect(w.consume(snap({ habits: [habit], habitLogs: streakLogs('h1', 7), now: T0 + 5000 }))).toBe('STREAK_MILESTONE')
    const inactive = { ...habit, active: false }
    expect(w.consume(snap({ habits: [inactive], habitLogs: streakLogs('h1', 7), now: T0 + 30_000 }))).toBeNull()
  })

  it('boot-quiet: a hydrate burst right after birth is acknowledged, not replayed', () => {
    const w = createReactionWatcher()
    w.consume(snap({ now: T0 })) // birth/seed
    // Hydration lands 1.5s later carrying yesterday's completions:
    const stale = { ...event({ id: 'old1' }), timestamp: new Date(T0 - 86_400_000).toISOString() }
    expect(w.consume(snap({ events: [stale], now: T0 + 1500 }))).toBeNull()
    // it stays acknowledged even after boot quiet ends:
    expect(w.consume(snap({ events: [stale], now: T0 + 9000 }))).toBeNull()
    // a genuinely new fact after boot quiet fires:
    const fresh = event({ id: 'new1' })
    expect(w.consume(snap({ events: [stale, fresh], now: T0 + 9000 }))).toBe('QUEST_COMPLETED')
    expect(w.consume(snap({ events: [stale, fresh], now: T0 + 9000 }))).toBeNull()
  })

  it('eventKey is id-based: undo+redo completion (new uuid) is a fresh act', () => {
    expect(eventKey(event({ id: 'a' }))).toBe('evt:a')
    expect(eventKey(event({ id: 'b' }))).not.toBe(eventKey(event({ id: 'a' })))
  })

  it('reaction vocabulary stays inside the approved visual set', () => {
    for (const [signal, visual] of Object.entries(REACTION_VISUAL)) {
      expect(['IDLE', 'THINKING', 'HAPPY', 'ALERT', 'SLEEP', 'CELEBRATE'], signal).toContain(visual.state)
      expect(['neutre', 'heureux', 'attentif'], signal).toContain(visual.expression)
      expect(visual.ms, signal).toBeGreaterThan(0)
    }
    // the strongest V1 moment is still a pose, not an effect
    expect(REACTION_VISUAL.LEVEL_UP.state).toBe('CELEBRATE')
  })
})
