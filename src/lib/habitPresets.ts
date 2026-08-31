/*
 * BAKATRACKER V3.5 — immutable habit preset registry (Phase 1)
 *
 * Five canonical presets: MOOD, WATER, SLEEP, READING, WORKOUT. A preset is
 * a FROZEN definition: identity (name/icon), semantic type, stat, XP value,
 * input semantics and design are immutable from user-facing UI. Users may
 * record daily values, activate/deactivate, and delete the instance — and
 * may create/edit fully custom habits as before. Nothing here mutates the
 * registry itself at runtime (it is a module constant, deeply frozen).
 *
 * Backward compatibility — the load-bearing rule:
 *   - HabitType gains 'reading' | 'workout' ONLY as new possible values.
 *     Every existing stored habit keeps its old type and behaves exactly as
 *     before (isHabitCompleted/calculateXP gain permissive branches for the
 *     new string-valued types; old branches untouched).
 *   - Habit gains OPTIONAL fields (preset?) only: old localStorage payloads
 *     and D1 rows parse unchanged. No migration, no data deletion — purely
 *     additive.
 *
 * Value encoding (HabitLog.value stays number | string):
 *   mood     → '😞' | '😐' | '🙂' | '😄' | '🤩'            (string)
 *   water    → liters, 0–5 step 0.25                        (number)
 *   sleep    → hours, 0–12 step 0.5                         (number)
 *   reading  → 'm:20' minutes | 'p:45' pages                (string)
 *   workout  → 'w:back:45' body-part + minutes ≤ 180        (string)
 *   custom numeric/counter/mood/energy → exactly as today.
 */

import type { HabitPresetId, HabitType, StatType } from '../types'

export type PresetId = HabitPresetId

export interface HabitPresetDef {
  id: PresetId
  /** Canonical display name — immutable identity. */
  name: string
  icon: string
  type: HabitType
  stat: StatType
  /** XP granted per day recorded (never per unit — consistency, not volume). */
  xp: number
  blurb: string
}

export const HABIT_PRESETS: readonly HabitPresetDef[] = Object.freeze([
  Object.freeze({ id: 'mood',    name: 'Mood',    icon: '😊', type: 'mood',    stat: 'discipline', xp: 5,  blurb: 'Five faces, one tap. How the day actually felt.' }),
  Object.freeze({ id: 'water',   name: 'Water',   icon: '💧', type: 'numeric', stat: 'health',     xp: 5,  blurb: 'Liters today. The slider is the whole ritual.' }),
  Object.freeze({ id: 'sleep',   name: 'Sleep',   icon: '🌙', type: 'numeric', stat: 'health',     xp: 5,  blurb: 'Hours last night, half-hour resolution.' }),
  Object.freeze({ id: 'reading', name: 'Reading', icon: '📖', type: 'reading', stat: 'knowledge',  xp: 8,  blurb: 'Minutes or pages — the ledger knows which.' }),
  Object.freeze({ id: 'workout', name: 'Workout', icon: '🏋️', type: 'workout', stat: 'health',     xp: 12, blurb: 'Body part + duration. Max three honest hours.' }),
] as const)

export const PRESET_BY_ID: ReadonlyMap<PresetId, HabitPresetDef> = new Map(
  HABIT_PRESETS.map(p => [p.id, p]),
)

/* ---------------- instrument ranges (UI + validation share them) --------- */

export const MOOD_FACES = ['😞', '😐', '🙂', '😄', '🤩'] as const

export const WATER_RANGE = { min: 0, max: 5, step: 0.25, unit: 'L' } as const
export const SLEEP_RANGE = { min: 0, max: 12, step: 0.5, unit: 'h' } as const
export const WORKOUT_MAX_MINUTES = 180
export const WORKOUT_BODY_PARTS = [
  { id: 'back', label: 'Back' },
  { id: 'chest', label: 'Chest' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'legs', label: 'Legs' },
  { id: 'arms', label: 'Arms' },
  { id: 'home', label: 'Home workout' },
] as const
export type WorkoutBodyPart = (typeof WORKOUT_BODY_PARTS)[number]['id']

export interface ReadingValue { mode: 'minutes' | 'pages'; amount: number }

/* ---------------- encode / decode (pure, defensive) ---------------- */

export function encodeReading(v: ReadingValue): string {
  const amount = Math.max(0, Math.round(v.amount))
  return `${v.mode === 'minutes' ? 'm' : 'p'}:${amount}`
}

/** Never throws: malformed/legacy values decode to null so the UI can show
 *  "logged" without inventing a number. */
export function decodeReading(raw: number | string | undefined | null): ReadingValue | null {
  if (typeof raw !== 'string') return null
  const m = /^(m|p):(\d+)$/.exec(raw)
  if (!m) return null
  return { mode: m[1] === 'm' ? 'minutes' : 'pages', amount: Number(m[2]) }
}

export function encodeWorkout(part: WorkoutBodyPart, minutes: number): string {
  const mins = Math.min(WORKOUT_MAX_MINUTES, Math.max(0, Math.round(minutes)))
  return `w:${part}:${mins}`
}

export interface WorkoutValue { part: WorkoutBodyPart; minutes: number }
export function decodeWorkout(raw: number | string | undefined | null): WorkoutValue | null {
  if (typeof raw !== 'string') return null
  const m = /^w:([a-z]+):(\d+)$/.exec(raw)
  if (!m) return null
  const part = WORKOUT_BODY_PARTS.find(p => p.id === m[1])?.id
  if (!part) return null
  return { part, minutes: Math.min(WORKOUT_MAX_MINUTES, Number(m[2])) }
}

/** Human rendering for chips/history: 'Reading · 45 pages', 'Workout · Legs 45m'. */
export function formatPresetValue(habitType: HabitType, raw: number | string): string {
  if (habitType === 'reading') {
    const r = decodeReading(raw)
    if (!r) return 'logged'
    return r.mode === 'minutes' ? `${r.amount} min` : `${r.amount} pages`
  }
  if (habitType === 'workout') {
    const w = decodeWorkout(raw)
    if (!w) return 'logged'
    const label = WORKOUT_BODY_PARTS.find(p => p.id === w.part)?.label ?? w.part
    return `${label} · ${w.minutes}m`
  }
  if (habitType === 'mood' && typeof raw === 'string') return raw
  return String(raw)
}

/** True when a recorded value means "done today" for the new preset types.
 *  (Legacy types keep their existing isHabitCompleted branches untouched.) */
export function presetValueCounts(habitType: HabitType, raw: number | string | undefined): boolean {
  if (raw === undefined || raw === null || raw === '') return false
  if (habitType === 'reading') {
    const r = decodeReading(raw)
    return Boolean(r && r.amount > 0)
  }
  if (habitType === 'workout') {
    const w = decodeWorkout(raw)
    return Boolean(w && w.minutes > 0)
  }
  if (habitType === 'mood') return true // any face logged counts (matches legacy mood)
  if (habitType === 'numeric') return typeof raw === 'number' && raw > 0
  return false
}
