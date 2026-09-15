/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Bakasur-native shape vocabulary as a stable API. Phase 3/5 intentionally
 * use ONE canonical body profile (the organic asymmetric silhouette in
 * ../profile.ts); posture variants are exact radial remaps of it, so the
 * stock engine morph glides between them with zero engine changes.
 *
 * No upstream silhouettes are reintroduced: no egg, no hexagon, no
 * triangle — only near-circular Bakasur postures the eyefit sweep covers.
 */

import { BAKASUR_SHAPE_VARIANTS } from '../animations/shapes'
import type { BakasurShapeId } from '../animations/types'
import { BAKASUR_RADII } from '../profile'

export type { BakasurShapeId }

export interface BakasurShapeDef {
  id: BakasurShapeId
  name: string
  description: string
  /** Posture: which Phase 5 body variant this shape is. */
  variant: 'base' | 'thinking' | 'rest'
}

export const BAKASUR_SHAPES: Record<BakasurShapeId, BakasurShapeDef> = {
  bakasur: {
    id: 'bakasur',
    name: 'Bakasur',
    description: 'Canonical body: dark organic silhouette, the identity.',
    variant: 'base'
  },
  'bakasur-thinking': {
    id: 'bakasur-thinking',
    name: 'Held breath',
    description: 'Barely-settled compression for thinking. Still alert.',
    variant: 'thinking'
  },
  'bakasur-rest': {
    id: 'bakasur-rest',
    name: 'Settled rest',
    description: 'Visibly lower rest for sleep. Eyes untouched.',
    variant: 'rest'
  }
}

export const BAKASUR_SHAPE_IDS = Object.keys(BAKASUR_SHAPES) as BakasurShapeId[]

/** Stable radii reference (engine `===` guards rely on it). Unknown → base. */
export function resolveBakasurShapeRadii(id: string | null | undefined): number[] {
  if (!id) return BAKASUR_RADII
  return BAKASUR_SHAPE_VARIANTS.get(id as BakasurShapeId) ?? BAKASUR_RADII
}

export function isBakasurShapeId(id: string): id is BakasurShapeId {
  return BAKASUR_SHAPE_VARIANTS.has(id as BakasurShapeId)
}
