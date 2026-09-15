/*
 * BAKASUR-UI — Original Bakasur work (Phase 4).
 *
 * Expression resolution: the ONLY bridge between Bakasur faces and the
 * engine. Bakasur ids resolve first; the 16 upstream ids remain accepted
 * (compatibility: existing states, timelines and the Lab keep working);
 * anything else resolves to null (engine resting pose, never a crash).
 *
 * toBotExpression returns a COPY shaped as BotExpression: the engine only
 * ever reads gaze/split/eyes (id is a blend label), so Bakasur faces drive
 * the stock morph/blink/timing machinery with zero engine changes.
 */
import {
  EXPRESSION_BY_ID,
  type BotExpression,
  type ExpressionId
} from '../../engine/expressions'
import { BAKASUR_CATALOGUE } from './catalogue'
import type { BakasurExpression, BakasurExpressionId } from './types'

export { BAKASUR_CATALOGUE }
export type { BakasurExpression, BakasurExpressionId }

export const BAKASUR_EXPRESSIONS: readonly BakasurExpression[] = BAKASUR_CATALOGUE

export const BAKASUR_EXPRESSION_BY_ID = new Map<string, BakasurExpression>(
  BAKASUR_CATALOGUE.map((e) => [e.bakasurId, e])
)

/** Deep-enough copy: engine blends create new objects, but never alias ours. */
export function toBotExpression(e: BakasurExpression): BotExpression {
  return {
    id: e.aliasId,
    gaze: { ...e.gaze },
    split: e.split,
    eyes: [{ ...e.eyes[0] }, { ...e.eyes[1] }]
  }
}

/**
 * Resolve any face id a consumer may pass: Bakasur-native first, upstream
 * catalogue second, null otherwise. No throwing, no guessing.
 */
export function resolveBakasurExpression(id: string | null | undefined): BotExpression | null {
  if (!id) return null
  const own = BAKASUR_EXPRESSION_BY_ID.get(id)
  if (own) return toBotExpression(own)
  return EXPRESSION_BY_ID.get(id) ?? null
}

/**
 * Every upstream id maps to a nearest Bakasur face, so stored timelines,
 * persisted customiser choices and animation states written against the
 * upstream catalogue keep rendering with Bakasur character. Nearest
 * neighbour, not equivalence — documented per row.
 */
const UPSTREAM_TO_BAKASUR: Record<ExpressionId, BakasurExpressionId> = {
  neutre: 'neutral',
  attentif: 'attentive',
  curieux: 'curious',
  mefiant: 'mischievous',
  confus: 'confused',
  surpris: 'surprised',
  excite: 'excited',
  heureux: 'happy',
  hilare: 'laughing',
  colere: 'angry',
  triste: 'sad',
  effraye: 'scared',
  fier: 'proud',
  timide: 'deadpan',
  blase: 'unimpressed',
  somnolent: 'sleepy'
}

export function bakasurForUpstream(id: ExpressionId): BakasurExpression {
  return BAKASUR_EXPRESSION_BY_ID.get(UPSTREAM_TO_BAKASUR[id])!
}

export const UPSTREAM_COVERAGE: ReadonlyArray<readonly [ExpressionId, BakasurExpressionId]> =
  (Object.entries(UPSTREAM_TO_BAKASUR) as ReadonlyArray<readonly [ExpressionId, BakasurExpressionId]>)
