/*
 * BAKATRACKER — Baksur prototype shared constants (V3.4.1).
 * Kept out of BaksurCharacter.tsx so that file exports only the component
 * (react-refresh/only-export-components).
 */
import { POSES } from '../../lib/bloub/states'
import type { StateId } from '../../lib/bloub/states'

/** Baksur product states (docs/baksur/ANIMATION.md — V1 set + V3.4.3 CELEBRATE). */
export type BaksurState = 'IDLE' | 'THINKING' | 'HAPPY' | 'ALERT' | 'SLEEP' | 'CELEBRATE'

/** Prototype directions (docs/baksur/VISUAL-DIRECTIONS.md — D and A). */
export type BaksurDirection = 'mochi' | 'flamehorn'

/** Product state → vendored engine state. */
export const BAKSUR_STATE_MAP: Record<BaksurState, StateId> = {
  IDLE: 'idle',
  THINKING: 'thinking',
  HAPPY: 'idle',
  ALERT: 'wide',
  SLEEP: 'sleep',
  // The `wink` pose has been reserved for celebration since V3.4.1 — the
  // approved quiet-win vocabulary (V3.4.3 gate).
  CELEBRATE: 'wink',
}

export const BAKSUR_STATES: BaksurState[] = ['IDLE', 'THINKING', 'HAPPY', 'ALERT', 'SLEEP', 'CELEBRATE']

export const BAKSUR_DIRECTIONS: ReadonlyArray<{ id: BaksurDirection; label: string }> = [
  { id: 'mochi', label: 'D — HORNED MOCHI' },
  { id: 'flamehorn', label: 'A — SIMPLIFIED FLAMEHORN' },
]

/** Most readable pose per engine state — deterministic static frames. */
export const BAKSUR_POSES = POSES
