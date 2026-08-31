/*
 * BAKATRACKER V3.5 — BakaSur Proactive Companion (Phase 2A)
 *
 * Background checker that evaluates store state and emits grounded,
 * data-driven proactive messages. All messages are scripted from
 * baksurMessages.ts intents — NO LLM generation, NO fabrication.
 *
 * Triggers (evaluated every 30s + on navigation):
 *   - streak at risk (habit not logged today, streak >= 7)
 *   - overdue quest (due_date < today, not done)
 *   - idle > 2h with open quests (nudge to star one)
 *   - no journal entry today after 20:00
 *   - level up available (xp >= xp_per_level)
 *   - streak milestone reached (7/14/30/50/100)
 *
 * Cooldown: 10 min per intent per session (prevents spam)
 * Priority: highest-priority single message per check
 * Respects: demo/offline/live env, presence settings, motion prefs
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import { calculateHabitStreak } from '../services/habits/calculateHabitStreak'
import { getTodayDateString } from '../lib/utils'
import { baksurLine, hasScriptedLine, type BakaSurEnvironment as BakaSurEnv, type BakaSurIntent } from '../lib/baksurMessages'
import { getBakaSurPreferencesSnapshot, subscribeBakaSurPreferences, type BakaSurProactiveFreq } from '../lib/baksurPreferences'
import { useSyncExternalStore } from 'react'
import type { Habit } from '../types'

/** Proactive intent → baksurMessages intent mapping + check function */
export type ProactiveIntent =
  | 'streak_at_risk'
  | 'overdue_quest'
  | 'idle_nudge'
  | 'journal_nudge'
  | 'level_up_available'
  | 'streak_milestone'

/** Result of a proactive check */
export interface ProactiveResult {
  intent: ProactiveIntent
  /** The baksurMessages intent to use for scripted copy */
  messageIntent: BakaSurIntent
  /** Priority: higher = more urgent */
  priority: number
  /** Context for the message (habit name, quest title, etc.) */
  context?: string
  /** Optional specific cooldown key if intent has subtypes (like streak milestones) */
  cooldownKey?: string
}

type BakaSurEnvironment = BakaSurEnv
interface CooldownState {
  [intent: string]: number
}

/** Maps a frequency preference to a cooldown in milliseconds. */
export function proactiveFreqToMs(freq: BakaSurProactiveFreq): number {
  switch (freq) {
    case '10s': return 10_000
    case '30s': return 30_000
    case '1m':  return 60_000
    case '5m':  return 5 * 60_000
    case 'off': return Infinity
  }
}

/** How long the bubble stays visible before auto-dismissing (ms). */
const DISPLAY_DURATION_MS = 10_000
/** How often we check conditions (must be ≤ shortest frequency). */
const CHECK_INTERVAL_MS = 10_000
const IDLE_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours
const JOURNAL_NAG_HOUR = 20 // 8 PM
const SESSION_STORAGE_KEY = 'bt_bakasur_proactive_v1'

/** Priority order (higher = more important) */
const PRIORITY: Record<ProactiveIntent, number> = {
  streak_milestone: 100,
  level_up_available: 90,
  streak_at_risk: 80,
  overdue_quest: 70,
  journal_nudge: 60,
  idle_nudge: 50,
}

function useProactiveChecker(isFocusRoute: boolean) {
  // Read current proactiveFrequency from preferences (reactive)
  const prefs = useSyncExternalStore(
    subscribeBakaSurPreferences,
    getBakaSurPreferencesSnapshot,
    getBakaSurPreferencesSnapshot,
  )

  // Store slices needed for checks
  const { habits, habitLogs, tasks, journal, stats, settings } = useStore(useShallow(s => ({
    habits: s.habits,
    habitLogs: s.habitLogs,
    tasks: s.tasks,
    journal: s.journal,
    stats: s.stats,
    settings: s.settings,
  })))

  const [lastProactive, setLastProactive] = useState<ProactiveResult | null>(null)
  const cooldownRef = useRef<CooldownState>({})
  const intervalRef = useRef<number | null>(null)
  const lastActivityRef = useRef<number>(0)

  // Initialize pure state in effect
  useEffect(() => {
    lastActivityRef.current = Date.now()
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (saved) cooldownRef.current = JSON.parse(saved)
    } catch {
      // ignore parse errors
    }
  }, [])

  // Update activity timestamp on any user interaction
  useEffect(() => {
    const updateActivity = () => { lastActivityRef.current = Date.now() }
    window.addEventListener('mousemove', updateActivity, { passive: true })
    window.addEventListener('keydown', updateActivity, { passive: true })
    window.addEventListener('click', updateActivity, { passive: true })
    return () => {
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('click', updateActivity)
    }
  }, [])

  // Check if an intent is on cooldown (uses current preference as cooldown length)
  const isOnCooldown = useCallback((intent: string): boolean => {
    const cooldownMs = proactiveFreqToMs(prefs.proactiveFrequency)
    if (!isFinite(cooldownMs)) return true // 'off' = always on cooldown
    const last = cooldownRef.current[intent] ?? 0
    return Date.now() - last < cooldownMs
  }, [prefs.proactiveFrequency])

  // Mark intent as fired
  const markFired = useCallback((intent: string) => {
    cooldownRef.current[intent] = Date.now()
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cooldownRef.current))
    } catch {
      // ignore
    }
  }, [])

  // Core check functions
  const checkStreakAtRisk = useCallback((): ProactiveResult | null => {
    const today = getTodayDateString()
    const activeHabits = habits.filter(h => h.active)
    for (const habit of activeHabits) {
      const streak = calculateHabitStreak(habit, habitLogs)
      if (streak >= 7) {
        const loggedToday = habitLogs.some(l => l.habit_id === habit.id && l.date === today)
        if (!loggedToday && !isOnCooldown('streak_at_risk')) {
          return { intent: 'streak_at_risk', messageIntent: 'ask_habits', priority: PRIORITY.streak_at_risk, context: habit.name }
        }
      }
    }
    return null
  }, [habits, habitLogs, isOnCooldown])

  const checkOverdueQuest = useCallback((): ProactiveResult | null => {
    const today = getTodayDateString()
    const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today)
    if (overdue.length > 0 && !isOnCooldown('overdue_quest')) {
      return { intent: 'overdue_quest', messageIntent: 'ask_focus', priority: PRIORITY.overdue_quest, context: overdue[0].title }
    }
    return null
  }, [tasks, isOnCooldown])

  const checkIdleNudge = useCallback((): ProactiveResult | null => {
    const openToday = tasks.filter(t => t.today && t.status !== 'done')
    const idleMs = Date.now() - lastActivityRef.current
    if (openToday.length > 0 && idleMs > IDLE_THRESHOLD_MS && !isOnCooldown('idle_nudge')) {
      return { intent: 'idle_nudge', messageIntent: 'explore_nudge', priority: PRIORITY.idle_nudge }
    }
    return null
  }, [tasks, isOnCooldown])

  const checkJournalNudge = useCallback((): ProactiveResult | null => {
    const today = getTodayDateString()
    const now = new Date()
    const hour = now.getHours()
    if (hour >= JOURNAL_NAG_HOUR) {
      const hasEntry = journal.some(j => j.date === today)
      if (!hasEntry && !isOnCooldown('journal_nudge')) {
        return { intent: 'journal_nudge', messageIntent: 'ask_journal', priority: PRIORITY.journal_nudge }
      }
    }
    return null
  }, [journal, isOnCooldown])

  const checkLevelUpAvailable = useCallback((): ProactiveResult | null => {
    const xpPerLevel = settings.xp_per_level || 1500
    if (stats.xp >= xpPerLevel && !isOnCooldown('level_up_available')) {
      return { intent: 'level_up_available', messageIntent: 'ask_stats', priority: PRIORITY.level_up_available }
    }
    return null
  }, [stats, settings, isOnCooldown])

  const checkStreakMilestone = useCallback((): ProactiveResult | null => {
    const milestones = [7, 14, 30, 50, 100]
    for (const habit of habits.filter((h: Habit) => h.active)) {
      const streak = calculateHabitStreak(habit, habitLogs)
      if (milestones.includes(streak)) {
        const key = `streak_${habit.id}_${streak}`
        if (!isOnCooldown(key)) {
          return { intent: 'streak_milestone', messageIntent: 'ask_habits', priority: PRIORITY.streak_milestone, context: `${habit.name} (${streak}d)`, cooldownKey: key }
        }
      }
    }
    return null
  }, [habits, habitLogs, isOnCooldown])

  // Run all checks, return highest-priority result
  const runChecks = useCallback((): ProactiveResult | null => {
    if (isFocusRoute) return null
    const results: ProactiveResult[] = []
    const checkFns = [
      checkStreakMilestone,
      checkLevelUpAvailable,
      checkStreakAtRisk,
      checkOverdueQuest,
      checkJournalNudge,
      checkIdleNudge,
    ]
    for (const fn of checkFns) {
      const r = fn()
      if (r) results.push(r)
    }
    if (results.length === 0) return null
    results.sort((a, b) => b.priority - a.priority)
    return results[0]
  }, [
    isFocusRoute,
    checkStreakMilestone,
    checkLevelUpAvailable,
    checkStreakAtRisk,
    checkOverdueQuest,
    checkJournalNudge,
    checkIdleNudge
  ])

  // Get scripted message for the current environment
  const getProactiveMessage = useCallback((env: BakaSurEnvironment, result: ProactiveResult): string => {
    return baksurLine(env, result.messageIntent, 0) // deterministic
  }, [])

  // Main tick
  const tick = useCallback(() => {
    if (isFocusRoute) return
    // If frequency is 'off', ensure nothing fires and clear any active message
    if (prefs.proactiveFrequency === 'off') {
      setLastProactive(null)
      return
    }
    let env: BakaSurEnvironment = 'live'
    if (typeof window !== 'undefined' && localStorage.getItem('bt_demo_mode') === 'true') {
      env = 'demo'
    } else if (typeof window !== 'undefined' && !navigator.onLine) {
      env = 'offline'
    }
    const result = runChecks()
    if (result && hasScriptedLine(env, result.messageIntent)) {
      setLastProactive(result)
      markFired(result.cooldownKey ?? result.intent)
    }
  }, [runChecks, isFocusRoute, markFired, prefs.proactiveFrequency])

  // Start/stop interval and boot silence timer
  const bootTimeoutRef = useRef<number | null>(null)

  const start = useCallback(() => {
    if (intervalRef.current || bootTimeoutRef.current) return
    // Wait 30 seconds before doing the first evaluation (boot silence)
    bootTimeoutRef.current = window.setTimeout(() => {
      bootTimeoutRef.current = null
      tick() // first evaluation at 30s
      intervalRef.current = window.setInterval(tick, CHECK_INTERVAL_MS)
    }, 30000)
  }, [tick])

  const stop = useCallback(() => {
    if (bootTimeoutRef.current) {
      window.clearTimeout(bootTimeoutRef.current)
      bootTimeoutRef.current = null
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Auto-start on mount
  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  return { lastProactive, getProactiveMessage, tick, start, stop }
}

/** Hook for components to subscribe to proactive messages */
export function useBakaSurProactive(env: BakaSurEnvironment, isFocusRoute: boolean = false): { message: string | null; intent: ProactiveIntent | null } {
  const { lastProactive, getProactiveMessage } = useProactiveChecker(isFocusRoute)
  const [activeResult, setActiveResult] = useState<ProactiveResult | null>(null)
  const [prevProactive, setPrevProactive] = useState<ProactiveResult | null>(null)

  // Update activeResult derived state during render if lastProactive changed
  if (lastProactive !== prevProactive) {
    setPrevProactive(lastProactive)
    setActiveResult(lastProactive)
  }

  // Auto-clear activeResult after DISPLAY_DURATION_MS
  useEffect(() => {
    if (activeResult) {
      const timer = window.setTimeout(() => {
        setActiveResult(null)
      }, DISPLAY_DURATION_MS)
      return () => window.clearTimeout(timer)
    }
  }, [activeResult])

  const message = activeResult ? getProactiveMessage(env, activeResult) : null
  const intent = activeResult ? activeResult.intent : null

  return { message, intent }
}

export { useProactiveChecker, type BakaSurEnvironment }
