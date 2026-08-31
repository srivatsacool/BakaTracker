/*
 * BAKATRACKER — Baksur reaction engine (V3.4.3)
 *
 * Derives Baksur's reaction signals ONLY from existing canonical store state:
 *   - EventLog entries the store already writes on mutations (task_completed,
 *     habit_completed, journal_created)  → QUEST/HABIT/JOURNAL signals
 *   - habits + habitLogs via the existing calculateHabitStreak → STREAK_MILESTONE
 *   - stats.level                        → LEVEL_UP
 *   - the rail's own open transition     → USER_OPENED_BAKSUR (handled by the
 *     consumer; it is a UI edge event, not store data)
 *
 * No new event system, no new store slices, no persistence: the watcher holds
 * only in-memory "already acknowledged" keys. First observation seeds the
 * baseline silently — completed items sitting in the store never re-trigger.
 * Cooldown is deterministic (pure function of injected `now`).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { calculateHabitStreak } from '../../services/habits/calculateHabitStreak'
import type { EventLog, Habit, HabitLog } from '../../types'
import type { BaksurState } from './baksurShared'

export type BaksurSignal =
  | 'QUEST_COMPLETED'
  | 'HABIT_COMPLETED'
  | 'JOURNAL_LOGGED'
  | 'STREAK_MILESTONE'
  | 'LEVEL_UP'
  | 'USER_OPENED_BAKSUR'

/** What a signal looks like — existing approved vocabulary only:
 *  poses `idle`/`wink` (wink is the reserved celebratory pose, V3.4.1) and
 *  resting expressions `neutre`/`heureux`. No particles, no effects. */
export interface ReactionVisual {
  state: BaksurState
  expression: 'neutre' | 'heureux' | 'attentif'
  /** ms the reaction holds before the dock returns to rest. */
  ms: number
}

/** Escalating but always quiet (docs/baksur/PERSONALITY.md): a journal line
 *  earns a glance, a level-up earns the most the character will ever do. */
export const REACTION_VISUAL: Record<BaksurSignal, ReactionVisual> = {
  JOURNAL_LOGGED:      { state: 'HAPPY',     expression: 'heureux', ms: 1600 },
  QUEST_COMPLETED:     { state: 'HAPPY',     expression: 'heureux', ms: 2200 },
  HABIT_COMPLETED:     { state: 'HAPPY',     expression: 'heureux', ms: 2200 },
  STREAK_MILESTONE:    { state: 'CELEBRATE', expression: 'heureux', ms: 2600 },
  LEVEL_UP:            { state: 'CELEBRATE', expression: 'heureux', ms: 3400 },
  USER_OPENED_BAKSUR:  { state: 'IDLE',      expression: 'attentif', ms: 1500 },
}

/** Streaks worth acknowledging. Crossing each threshold fires once (per habit,
 *  per session-memory); the numbers are the app's own milestone grammar. */
export const STREAK_MILESTONES = [7, 14, 30, 50, 100] as const

export interface ReactionSnapshot {
  events: EventLog[]
  habits: Habit[]
  habitLogs: HabitLog[]
  level: number
  /** Injectable clock (ms) so tests are deterministic. */
  now: number
}

/** Dedupe key for a store event. entity_id+type is stable across re-syncs and
 *  survives the store's own replace-on-recomplete pattern; the raw event id
 *  would re-fire when a completion is undone and redone (new uuid, same act —
 *  a fresh act SHOULD fire, so id is correct here). We key on id. */
export function eventKey(e: EventLog): string {
  return `evt:${e.id}`
}

const EVENT_TO_SIGNAL: Record<EventLog['type'], BaksurSignal> = {
  task_completed: 'QUEST_COMPLETED',
  habit_completed: 'HABIT_COMPLETED',
  journal_created: 'JOURNAL_LOGGED',
}

/** Priority when several land in the same tick: biggest moment wins. */
const PRIORITY: Record<BaksurSignal, number> = {
  LEVEL_UP: 5,
  STREAK_MILESTONE: 4,
  QUEST_COMPLETED: 3,
  HABIT_COMPLETED: 2,
  JOURNAL_LOGGED: 1,
  USER_OPENED_BAKSUR: 0,
}

export interface WatcherOptions {
  /** Minimum ms between two reactions. */
  cooldownMs?: number
}

/** ms after birth during which the watcher only acknowledges, never fires.
 *  The store hydrates asynchronously after mount (init()/loadDemoData land
 *  the existing ledger a beat later); without this window the hydrate would
 *  read as one giant burst of new facts and Baksur would celebrate the past
 *  on every page load. Nobody legitimately completes a quest in the first
 *  ~2.5s of a session, so the cost is nil. */
export const BOOT_QUIET_MS = 2500

/**
 * The pure watcher. `consume(snapshot)` returns the single signal Baksur
 * should acknowledge now, or null. Call it on every relevant store change —
 * it is idempotent per fact: the first call seeds all existing facts silently
 * (no replay of history), afterwards only NEW facts can fire, each at most
 * once, never within the boot-quiet or cooldown windows.
 *
 * (Note on event timestamps: habit/journal rows are date-aligned to local
 * noon by design, so they CANNOT serve as a freshness signal — evening
 * actions would look stale. Replay is handled by seed + acknowledge + boot
 * quiet instead.)
 */
export function createReactionWatcher(opts: WatcherOptions & { bootQuietMs?: number } = {}) {
  const cooldownMs = opts.cooldownMs ?? 4000
  const bootQuietMs = opts.bootQuietMs ?? BOOT_QUIET_MS
  let seeded = false
  let bornAt = 0
  let lastFiredAt = -Infinity
  const acknowledged = new Set<string>()
  let seenLevel: number | null = null

  return {
    consume(snap: ReactionSnapshot): BaksurSignal | null {
      if (!seeded) bornAt = snap.now
      const candidates: BaksurSignal[] = []

      // 1. store events (real mutation output — never fabricated)
      for (const e of snap.events) {
        const signal = EVENT_TO_SIGNAL[e.type]
        if (!signal) continue
        const key = eventKey(e)
        if (acknowledged.has(key)) continue
        candidates.push(signal)
      }

      // 2. streak milestones from the existing streak calculator
      for (const habit of snap.habits) {
        if (!habit.active) continue
        const streak = calculateHabitStreak(habit, snap.habitLogs)
        for (const m of STREAK_MILESTONES) {
          if (streak >= m) {
            const key = `streak:${habit.id}:${m}`
            if (!acknowledged.has(key)) candidates.push('STREAK_MILESTONE')
          }
        }
      }

      // 3. level increase against the last acknowledged level
      if (seenLevel !== null && snap.level > seenLevel) candidates.push('LEVEL_UP')

      // mark every fact we looked at as acknowledged NOW, so a queued
      // candidate that loses priority or the cooldown never re-fires later
      for (const e of snap.events) acknowledged.add(eventKey(e))
      for (const habit of snap.habits) {
        if (!habit.active) continue
        const streak = calculateHabitStreak(habit, snap.habitLogs)
        for (const m of STREAK_MILESTONES) if (streak >= m) acknowledged.add(`streak:${habit.id}:${m}`)
      }
      seenLevel = snap.level

      if (!seeded) {
        // First observation is a baseline snapshot, not an event stream.
        seeded = true
        return null
      }
      // Boot-quiet: hydrate bursts (loadDemoData/init) are acknowledged above
      // but never celebrated.
      if (snap.now - bornAt < bootQuietMs) return null
      if (candidates.length === 0) return null

      candidates.sort((a, b) => PRIORITY[b] - PRIORITY[a])
      const winner = candidates[0]!

      // Cooldown: quiet beats eager. The facts stay acknowledged — Baksur
      // simply misses the moment rather than spamming it.
      if (snap.now - lastFiredAt < cooldownMs) return null
      lastFiredAt = snap.now
      return winner
    },
  }
}

export interface BaksurDockReaction {
  /** Signal to play right now, or null (rest state). */
  active: BaksurSignal | null
  /** Fire the edge event for the rail being opened (UI, not store). */
  noteOpened: () => void
}

/**
 * Subscribe the dock character to real product state. store.subscribe only —
 * no polling, no extra renders from unchanged state (the watcher dedupes),
 * no new store slices. Every fact change (events/habitLogs/stats) goes
 * through set(), which wakes the subscription. USER_OPENED_BAKSUR is a UI
 * edge event, fired imperatively by the consumer.
 */
export function useBaksurDockReaction(): BaksurDockReaction {
  const [active, setActive] = useState<BaksurSignal | null>(null)
  // Lazy-once watcher (state keeps the instance across renders without a
  // render-time ref write).
  const [watcher] = useState(() => createReactionWatcher())
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const check = () => {
      const s = useStore.getState()
      const signal = watcher.consume({
        events: s.events,
        habits: s.habits,
        habitLogs: s.habitLogs,
        level: s.stats.level,
        now: Date.now(),
      })
      if (signal) {
        setActive(signal)
        if (timerRef.current) window.clearTimeout(timerRef.current)
        timerRef.current = window.setTimeout(
          () => setActive(null),
          REACTION_VISUAL[signal].ms,
        )
      }
    }
    const unsub = useStore.subscribe(check)
    // Seed the baseline NOW, not on the first mutation: without this, the
    // first real event after page load would be swallowed as the seed.
    check()
    return () => {
      unsub()
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [watcher])

  // Stable handle: the ref hop keeps the returned callback identity constant
  // across renders (effect-time write only — never during render).
  const noteOpenedRef = useRef<() => void>(() => {})
  useEffect(() => {
    noteOpenedRef.current = () => {
      setActive('USER_OPENED_BAKSUR')
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(
        () => setActive(null),
        REACTION_VISUAL.USER_OPENED_BAKSUR.ms,
      )
    }
  }, [])

  const noteOpened = useCallback(() => { noteOpenedRef.current() }, [])
  return { active, noteOpened }
}
