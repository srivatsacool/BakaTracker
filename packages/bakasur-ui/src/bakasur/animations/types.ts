/*
 * BAKASUR-UI — Original Bakasur work (Phase 5).
 *
 * Animation adapter types. The core idea: a Bakasur INTENT (named by the
 * upstream StateId, so every existing timeline keeps resolving) maps to a
 * body-preserving VEHICLE state plus a Bakasur face, a Bakasur shape
 * variant, an optional static gaze bias and a render treatment.
 *
 * What the adapter NEVER carries: timing. No durations, morphs, easings or
 * blink schedules live here — they stay exactly as upstream measured them,
 * preserved by construction (there is simply no field to change them with).
 */
import type { StateId } from '../../engine/states'
import type { BakasurExpressionId } from '../expressions/types'

/** Intent ids ARE upstream StateIds: timelines resolve through adapters. */
export type BakasurIntent = StateId

export type AnimationDisposition =
  | 'KEEP'
  | 'ADAPT'
  | 'REMAP'
  | 'SPECIAL'
  | 'UI-ONLY'

export type BakasurShapeId = 'bakasur' | 'bakasur-thinking' | 'bakasur-rest'

/** Static gaze bias (no scripts in Phase 5; choreography is Phase 10/11). */
export interface BakasurLookBias {
  yaw: number
  pitch: number
  /** 0..1 engine mix. Wander is always left at 1 (drift survives). */
  mix: number
}

/** Deterministic per-frame render treatment (pure function of the frame). */
export interface BakasurTreatment {
  /** 0..0.6 black overlay inside the mask (settling, dimming). */
  dim: number
  /** 0.5..2 rim/aura flood multiplier (emphasis, never decoration). */
  glow: number
}

export interface BakasurAnimationDef {
  intent: BakasurIntent
  disposition: AnimationDisposition
  /** Body-preserving vehicle (always baseBody=true — locked by test). */
  vehicle: StateId
  /** Face honoured only when the vehicle is baseFace (idle/swirl). */
  expression: BakasurExpressionId | null
  shape: BakasurShapeId
  look: BakasurLookBias | null
  treatment: BakasurTreatment
  /** Which upstream behaviour is preserved by this mapping. */
  semantics: string
  /** Which upstream behaviour was deliberately NOT carried, and why. */
  dropped: string
}
