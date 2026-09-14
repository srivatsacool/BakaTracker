/*
 * BAKATRACKER — Baksur prototype shared constants (V3.4.1).
 * Kept out of BaksurCharacter.tsx so that file exports only the component
 * (react-refresh/only-export-components).
 */

/** Baksur product states (docs/baksur/ANIMATION.md — V1 set + V3.4.3 CELEBRATE). */
export type BaksurState = 'IDLE' | 'THINKING' | 'HAPPY' | 'ALERT' | 'SLEEP' | 'CELEBRATE'

/** Prototype directions (docs/baksur/VISUAL-DIRECTIONS.md — D and A). */
export type BaksurDirection = 'mochi' | 'flamehorn'

/** Product state → legacy engine state alias mapping. */
export const BAKSUR_STATE_MAP: Record<BaksurState, string> = {
  IDLE: 'idle',
  THINKING: 'thinking',
  HAPPY: 'idle',
  ALERT: 'wide',
  SLEEP: 'sleep',
  CELEBRATE: 'wink',
}

export const BAKSUR_STATES: BaksurState[] = ['IDLE', 'THINKING', 'HAPPY', 'ALERT', 'SLEEP', 'CELEBRATE']

export const BAKSUR_DIRECTIONS: ReadonlyArray<{ id: BaksurDirection; label: string }> = [
  { id: 'mochi', label: 'D — HORNED MOCHI' },
  { id: 'flamehorn', label: 'A — SIMPLIFIED FLAMEHORN' },
]

/** Most readable pose per engine state — deterministic static frames. */
export const BAKSUR_POSES: Record<string, number> = {
  idle: 0,
  thinking: 0.4,
  wink: 0.8,
  wide: 0.5,
  sleep: 1.5,
}

