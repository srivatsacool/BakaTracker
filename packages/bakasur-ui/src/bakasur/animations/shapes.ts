/*
 * BAKASUR-UI — Original Bakasur work (Phase 5).
 *
 * Bakasur shape variants: posture WITHOUT engine changes. A vertical squash
 * (or uniform scale) remaps exactly into radial terms —
 * r'(theta) = r*sqrt(cos^2 + sy^2*sin^2) — so variants are plain radii
 * arrays the stock setShape morph glides between. Translation is NOT
 * offered (it breaks the star-shaped radial assumption).
 *
 * Variants stay near-circular (eyefit sweep covers them in eyefit.test.ts);
 * the registry holds stable references so the engine's `===` guards work.
 */
import { BAKASUR_RADII } from '../profile'
import type { BakasurShapeId } from './types'

/** Exact radial remap of a vertical squash (sy<1) or stretch (sy>1). */
function squashY(radii: number[], sy: number): number[] {
  const n = radii.length
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const theta = (i / n) * Math.PI * 2
    const c = Math.cos(theta)
    const s = Math.sin(theta)
    out[i] = radii[i]! * Math.sqrt(c * c + sy * sy * s * s)
  }
  return out
}

const VARIANTS: Record<BakasurShapeId, number[]> = {
  bakasur: BAKASUR_RADII,
  /** Held-breath compression for thinking: barely settled, still alert. */
  'bakasur-thinking': squashY(BAKASUR_RADII, 0.96),
  /** Settled rest for sleep: visibly lower, eyes untouched (sweep-proven). */
  'bakasur-rest': squashY(BAKASUR_RADII, 0.9)
}

export const BAKASUR_SHAPE_VARIANTS = new Map<BakasurShapeId, number[]>(
  (Object.entries(VARIANTS) as Array<[BakasurShapeId, number[]]>)
)

export function bakasurRadii(shape: BakasurShapeId): number[] {
  return BAKASUR_SHAPE_VARIANTS.get(shape) ?? BAKASUR_RADII
}
