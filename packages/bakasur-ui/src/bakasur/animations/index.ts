/*
 * BAKASUR-UI — Original Bakasur work (Phase 5).
 *
 * Resolution + application: the only bridge between intents and the engine.
 * resolveBakasurAnimation maps any timeline StateId to its adapter (unknown
 * strings fall back to idle — documented, never throwing, never raw
 * upstream silhouettes in the Bakasur runtime). applyBakasurAnimation dates
 * the vehicle/face/shape/gaze changes onto a BotEngine exactly as the
 * reference component does by hand; the component delegates here so there
 * is one application path to test.
 */
import { BotEngine, type Look } from '../../engine/engine'
import { STATE_BY_ID } from '../../engine/states'
import { resolveBakasurExpression } from '../expressions/index'
import { bakasurRadii } from './shapes'
import { BAKASUR_ANIMATIONS } from './catalogue'
import type { BakasurAnimationDef, BakasurIntent } from './types'

export { BAKASUR_ANIMATIONS }
export type { BakasurAnimationDef, BakasurIntent }

export const BAKASUR_ANIMATION_BY_ID = new Map<string, BakasurAnimationDef>(
  BAKASUR_ANIMATIONS.map((d) => [d.intent, d])
)

const IDLE_DEF = BAKASUR_ANIMATION_BY_ID.get('idle')!

/** Every timeline id resolves; corruption degrades to idle, never to raw upstream. */
export function resolveBakasurAnimation(intent: string): BakasurAnimationDef {
  return BAKASUR_ANIMATION_BY_ID.get(intent) ?? IDLE_DEF
}

/** All intent ids the runtime accepts (== the 15 upstream StateIds). */
export function bakasurIntents(): BakasurIntent[] {
  return BAKASUR_ANIMATIONS.map((d) => d.intent)
}

/**
 * The intent's static gaze bias as an engine Look (spin always 0, wander
 * always kept: drift survives the bias). Null = release to the pose.
 */
export function biasLook(def: BakasurAnimationDef): Look | null {
  if (!def.look) return null
  return { yaw: def.look.yaw, pitch: def.look.pitch, mix: def.look.mix, spin: 0, wander: 1 }
}

/**
 * Date a full intent onto an engine: vehicle state, Bakasur shape variant,
 * resolved face, static gaze bias (or release). Same setter order as the
 * reference component; deterministic for a given (def, now).
 */
export function applyBakasurAnimation(engine: BotEngine, def: BakasurAnimationDef, now: number): void {
  engine.setState(def.vehicle, now)
  engine.setShape(bakasurRadii(def.shape), now)
  engine.setExpression(def.expression ? resolveBakasurExpression(def.expression) : null, now)
  engine.setLook(biasLook(def), now)
}

/** Vehicle must exist in the upstream catalogue (typo-proofing the table). */
export function vehicleExists(def: BakasurAnimationDef): boolean {
  return STATE_BY_ID.has(def.vehicle)
}
