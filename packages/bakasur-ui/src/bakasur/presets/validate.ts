/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Validation + resolution: the only bridge between preset data and the
 * engine. validateBakasurPreset reports structured errors (no silent
 * repair); resolveBakasurPreset applies the documented degradation rules
 * (unknown animation → idle, unknown shape → intent shape, unknown theme →
 * void-violet — the Phase 4/5 no-throw philosophy) and always returns a
 * render-ready configuration.
 *
 * Both are deterministic and side-effect free.
 */

import { BAKASUR_ANIMATIONS, resolveBakasurAnimation } from '../animations/index'
import { bakasurRadii } from '../animations/shapes'
import type { BakasurIntent, BakasurShapeId } from '../animations/types'
import { BAKASUR_EXPRESSION_BY_ID, resolveBakasurExpression } from '../expressions/index'
import type { BakasurExpressionId } from '../expressions/types'
import { BotEngine, type Look } from '../../engine/engine'
import { STATE_BY_ID } from '../../engine/states'
import { isBakasurThemeId, resolveBakasurTheme } from './colours'
import { isBakasurShapeId } from './shapes'
import { normalizeBakasurTimeline, timelineIssues } from './timeline'
import { mergeTreatmentWithIntent, treatmentIssues } from './treatments'
import type {
  BakasurPresetDef,
  BakasurPresetInput,
  BakasurPresetIssue,
  BakasurPresetTreatment,
  BakasurValidationResult,
  ResolvedBakasurPreset
} from './types'

const INTENT_IDS: ReadonlySet<string> = new Set(BAKASUR_ANIMATIONS.map((d) => d.intent))

function isIntent(id: string): id is BakasurIntent {
  return INTENT_IDS.has(id)
}

function isExpression(id: string): id is BakasurExpressionId {
  return BAKASUR_EXPRESSION_BY_ID.has(id)
}

/** Effective face honoured by the vehicle, or null for the resting pose. */
function effectiveFace(
  animation: BakasurIntent,
  expression: string | null | undefined
): BakasurExpressionId | null {
  // Phase 4 rule: unknown ids resolve to null (resting pose), never a crash.
  if (expression === null) return null
  if (expression === undefined) return resolveBakasurAnimation(animation).expression
  return isExpression(expression) ? expression : null
}

/**
 * Structured validation. Checks every axis plus the one real incompatibility
 * (a face on a fixed-face vehicle is ignored by the engine, so it is an
 * error here, not a silent no-op). Timeline/treatment details delegate to
 * their modules.
 */
export function validateBakasurPreset(input: BakasurPresetInput): BakasurValidationResult {
  const issues: BakasurPresetIssue[] = []

  if (!isIntent(input.animation)) {
    issues.push({
      field: 'animation',
      code: 'unknown-animation',
      message: `Unknown animation "${input.animation}". Resolves to idle.`
    })
  }
  if (input.expression !== undefined && input.expression !== null && !isExpression(input.expression)) {
    issues.push({
      field: 'expression',
      code: 'unknown-expression',
      message: `Unknown expression "${input.expression}". Resolves to the resting pose.`
    })
  }
  if (input.shape !== undefined && !isBakasurShapeId(input.shape)) {
    issues.push({
      field: 'shape',
      code: 'unknown-shape',
      message: `Unknown shape "${input.shape}". Falls back to the intent shape.`
    })
  }
  if (input.theme !== undefined && !isBakasurThemeId(input.theme)) {
    issues.push({
      field: 'theme',
      code: 'unknown-theme',
      message: `Unknown colour theme "${input.theme}". Falls back to void-violet.`
    })
  }
  for (const message of treatmentIssues(input.treatment)) {
    issues.push({ field: 'treatment', code: 'treatment-range', message })
  }
  for (const message of timelineIssues(input.timeline)) {
    issues.push({ field: 'timeline', code: 'timeline-malformed', message })
  }

  // Incompatibility: faces only show on baseFace vehicles (idle, swirl).
  const animation = isIntent(input.animation) ? input.animation : 'idle'
  const vehicle = resolveBakasurAnimation(animation).vehicle
  const honours = STATE_BY_ID.get(vehicle)?.baseFace ?? false
  if (!honours && input.expression !== undefined && input.expression !== null) {
    issues.push({
      field: 'expression',
      code: 'expression-ignored',
      message:
        `Expression "${input.expression}" has no visible effect on "${input.animation}" ` +
        `(vehicle "${vehicle}" carries a fixed face).`
    })
  }
  // Timeline steps naming unknown intents are caught per step.
  for (const s of input.timeline?.steps ?? []) {
    if (typeof s?.intent === 'string' && s.intent && !isIntent(s.intent)) {
      issues.push({
        field: 'timeline',
        code: 'timeline-unknown-intent',
        message: `Timeline step intent "${s.intent}" is unknown. Falls back to "${animation}".`
      })
    }
  }

  if (issues.length) return { ok: false, issues }
  return { ok: true, issues, normalized: resolveBakasurPreset(input) }
}

/**
 * Resolve any input to a render-ready configuration. Documented fallbacks,
 * never throws, never a raw upstream silhouette.
 */
export function resolveBakasurPreset(
  input: BakasurPresetInput,
  explicit?: {
    expression?: string | null
    theme?: string
    treatment?: BakasurPresetTreatment | null
  }
): ResolvedBakasurPreset {
  const animation = isIntent(input.animation) ? input.animation : 'idle'
  const def = resolveBakasurAnimation(animation)
  // Explicit user override wins over the preset input per field.
  const expression = effectiveFace(
    animation,
    explicit?.expression !== undefined ? explicit.expression : input.expression
  )
  const shape: BakasurShapeId =
    input.shape !== undefined && isBakasurShapeId(input.shape) ? input.shape : def.shape
  const theme = resolveBakasurTheme(
    explicit?.theme !== undefined ? explicit.theme : input.theme
  ).id
  const { treatment, look } = mergeTreatmentWithIntent(
    def.treatment,
    def.look,
    input.treatment,
    explicit?.treatment
  )
  const timeline = normalizeBakasurTimeline(input.timeline, animation)
  return { animation, vehicle: def.vehicle, expression, shape, theme, treatment, look, timeline }
}

/** A catalogue entry is already structured input; resolve it directly. */
export function resolvePresetDef(
  def: BakasurPresetDef,
  explicit?: {
    expression?: string | null
    theme?: string
    treatment?: BakasurPresetTreatment | null
  }
): ResolvedBakasurPreset {
  return resolveBakasurPreset(
    {
      animation: def.animation,
      expression: def.expression,
      shape: def.shape,
      theme: def.theme,
      treatment: def.treatment,
      timeline: def.timeline
        ? {
            steps: def.timeline.steps?.map((s) => ({ ...s })),
            repeat: def.timeline.repeat,
            direction: def.timeline.direction,
            delay: def.timeline.delay,
            transition: def.timeline.transition
          }
        : undefined
    },
    explicit
  )
}

/**
 * Date a resolved preset onto an engine: vehicle, Bakasur shape, resolved
 * face, gaze bias (or release). Same setter order as applyBakasurAnimation;
 * deterministic for a given (resolved, now).
 */
export function applyResolvedPreset(engine: BotEngine, resolved: ResolvedBakasurPreset, now: number): void {
  engine.setState(resolved.vehicle, now)
  engine.setShape(bakasurRadii(resolved.shape), now)
  const faceExpr = resolved.expression
    ? resolveBakasurExpression(resolved.expression)
    : resolveBakasurExpression('neutral')
  engine.setExpression(faceExpr, now)
  engine.setLook(biasLook(resolved.look), now)
}

function biasLook(look: ResolvedBakasurPreset['look']): Look | null {
  if (!look) return null
  return { yaw: look.yaw, pitch: look.pitch, mix: look.mix, spin: 0, wander: 1 }
}
