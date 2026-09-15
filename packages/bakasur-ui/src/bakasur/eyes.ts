/*
 * BAKASUR-UI — Original Bakasur work (Phase 3 face treatment, Phase 4 catalogue).
 *
 * Bakasur eye CONFIGURATION, kept separate from the body on purpose.
 * Geometry now comes from the Bakasur-native catalogue
 * (src/bakasur/expressions/); treatment (pale glowing holes in a near-black
 * body) is defined here and in palette.ts. Resolution order for consumers
 * lives in expressions/index.ts: Bakasur ids first, upstream ids second.
 */
import type { BakasurExpressionId } from './expressions/types'
import { BAKASUR_EYE_GLOW } from './palette'

/** Resting face: Bakasur-native neutral (watchful, unreadable, faintly judging). */
export const BAKASUR_DEFAULT_EXPRESSION: BakasurExpressionId = 'neutral'

/** What the eye holes reveal: pale lavender glow. */
export const BAKASUR_EYE_FILL = BAKASUR_EYE_GLOW

/**
 * The 18 Bakasur-native faces. Phase 5 inherits this exact set to remap
 * animation states against; narrowing or widening it requires re-running
 * the eyefit sweep and the contact sheet.
 */
export const BAKASUR_COMPATIBLE_EXPRESSIONS: readonly BakasurExpressionId[] = [
  'neutral',
  'attentive',
  'curious',
  'suspicious',
  'confused',
  'surprised',
  'excited',
  'happy',
  'laughing',
  'annoyed',
  'angry',
  'sad',
  'scared',
  'proud',
  'unimpressed',
  'sleepy',
  'mischievous',
  'deadpan'
]
