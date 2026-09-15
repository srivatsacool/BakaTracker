/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Deterministic timeline model. Timing data lives HERE, never in the
 * framework-free engine: a timeline only decides which intent is dated onto
 * the runtime at which instant. Pure functions, no clock, JSON in/out.
 */

import { BAKASUR_ANIMATIONS } from '../animations/catalogue'
import type { BakasurIntent } from '../animations/types'
import type {
  BakasurTimeline,
  NormalizedBakasurTimeline,
  TimelineDirection
} from './types'

const DEFAULT_BEAT = 2
const DEFAULT_TRANSITION = 0

/** Every intent id the preset layer accepts (== the 15 upstream StateIds). */
const INTENT_IDS: ReadonlySet<string> = new Set(BAKASUR_ANIMATIONS.map((d) => d.intent))

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function cleanDirection(d: unknown): TimelineDirection {
  return d === 'reverse' || d === 'alternate' || d === 'forward' ? d : 'forward'
}

function cleanRepeat(r: unknown): number {
  if (!isFiniteNum(r)) return 1
  return Math.max(1, Math.floor(r))
}

function cleanNonNeg(v: unknown, fallback: number): number {
  if (!isFiniteNum(v)) return fallback
  return Math.max(0, v)
}

function cleanPositive(v: unknown, fallback: number): number {
  if (!isFiniteNum(v) || v <= 0) return fallback
  return v
}

/**
 * Normalize user timing data against a fallback intent. Unknown intent
 * strings degrade to the fallback (Phase 5 rule); malformed numbers take
 * documented defaults. Never throws.
 */
export function normalizeBakasurTimeline(
  timeline: BakasurTimeline | null | undefined,
  fallbackIntent: BakasurIntent
): NormalizedBakasurTimeline {
  const raw = timeline?.steps?.length
    ? timeline.steps
    : [{ intent: fallbackIntent, duration: DEFAULT_BEAT, hold: 0 }]
  const steps = raw.map((s) => {
    const intent = INTENT_IDS.has(s.intent) ? (s.intent as BakasurIntent) : fallbackIntent
    return {
      intent,
      duration: cleanPositive(s.duration, DEFAULT_BEAT),
      hold: cleanNonNeg(s.hold, 0)
    }
  })
  const transition = cleanNonNeg(timeline?.transition, DEFAULT_TRANSITION)
  const totalDuration =
    steps.reduce((sum, s) => sum + s.duration + s.hold, 0) +
    transition * Math.max(0, steps.length - 1)
  return {
    steps,
    repeat: cleanRepeat(timeline?.repeat),
    direction: cleanDirection(timeline?.direction),
    delay: cleanNonNeg(timeline?.delay, 0),
    transition,
    totalDuration
  }
}

/**
 * Which intent holds at instant t (seconds from timeline start). Pure:
 * pre-delay shows the first beat, post-end holds the last — deterministic,
 * never undefined, never a raw upstream id.
 */
export function intentAt(timeline: NormalizedBakasurTimeline, t: number): BakasurIntent {
  const steps = timeline.steps
  const first = steps[0]!.intent
  const last = steps[steps.length - 1]!.intent
  if (!Number.isFinite(t) || steps.length === 0) return first
  const local = t - timeline.delay
  if (local <= 0) return first
  const total = timeline.totalDuration
  if (total <= 0) return first
  if (local >= total * timeline.repeat) return last
  let within = local % total
  if (timeline.direction === 'reverse') within = total - within
  const order =
    timeline.direction === 'alternate' && Math.floor(local / total) % 2 === 1
      ? [...steps].reverse()
      : steps
  for (const s of order) {
    if (within < s.duration + s.hold) return s.intent
    within -= s.duration + s.hold
    if (within < timeline.transition) return s.intent
    within -= timeline.transition
  }
  return last
}

/** Structural validation only (intent ids are checked by validate.ts). */
export function timelineIssues(timeline: BakasurTimeline | null | undefined): string[] {
  if (timeline == null) return []
  const out: string[] = []
  if (timeline.steps !== undefined) {
    if (!Array.isArray(timeline.steps)) out.push('timeline.steps must be an array')
    else if (timeline.steps.length === 0) out.push('timeline.steps must not be empty')
    else {
      timeline.steps.forEach((s, i) => {
        if (typeof s?.intent !== 'string' || !s.intent) out.push(`timeline.steps[${i}].intent must be a non-empty string`)
        if (s.duration !== undefined && (!isFiniteNum(s.duration) || s.duration <= 0)) {
          out.push(`timeline.steps[${i}].duration must be a finite number > 0`)
        }
        if (s.hold !== undefined && (!isFiniteNum(s.hold) || s.hold < 0)) {
          out.push(`timeline.steps[${i}].hold must be a finite number >= 0`)
        }
      })
    }
  }
  if (timeline.repeat !== undefined && (!isFiniteNum(timeline.repeat) || timeline.repeat < 1)) {
    out.push('timeline.repeat must be a finite number >= 1')
  }
  if (timeline.direction !== undefined && !['forward', 'reverse', 'alternate'].includes(timeline.direction)) {
    out.push('timeline.direction must be forward, reverse or alternate')
  }
  for (const f of ['delay', 'transition'] as const) {
    const v = timeline[f]
    if (v !== undefined && (!isFiniteNum(v) || v < 0)) out.push(`timeline.${f} must be a finite number >= 0`)
  }
  return out
}
