/*
 * BAKASUR-UI — Original Bakasur work (Phase 9).
 *
 * Reactions + interaction rules. A ReactionCue resolves through the
 * EXISTING preset pipeline (resolveBakasurPreset / resolvePresetDef) —
 * this file defines no animation of its own, it only turns
 * "event happened" into "which Bakasur configuration is showing".
 *
 * Intensity law (Phase 6): glow = 1 + intensity × 0.8. Personality
 * reweights the cue before resolution; never inside components.
 */

import { BAKASUR_EXPRESSION_BY_ID } from '../bakasur/expressions/index'
import { getBakasurPreset, getBakasurPersonality } from '../bakasur/presets/catalogue'
import { resolveBakasurPreset, resolvePresetDef } from '../bakasur/presets/validate'
import type { BakasurPresetTreatment, ResolvedBakasurPreset } from '../bakasur/presets/types'
import type {
  DialogueEventType,
  DialogueInteractionState,
  DialogueSpeakerId,
  ReactionCue
} from './types'

/** Default face a cue without preset shows on the idle vehicle. */
export function cueToResolved(cue: ReactionCue | null, speaker: DialogueSpeakerId): ResolvedBakasurPreset {
  const base = getBakasurPreset(cue?.preset ?? 'bakasur-idle')
  if (cue?.preset && base) {
    return resolvePresetDef(base, {
      expression: cue.expression ?? undefined,
      theme: cue.theme,
      treatment: cueTreatment(cue)
    })
  }
  return resolveBakasurPreset(
    {
      animation: cue?.animation ?? base?.animation ?? 'idle',
      expression: cue?.expression ?? base?.expression,
      theme: cue?.theme ?? speakerTheme(speaker)
    },
    { treatment: cue ? cueTreatment(cue) : undefined }
  )
}

function speakerTheme(speaker: DialogueSpeakerId): string {
  return speaker === 'narrator' ? 'spectral' : 'void-violet'
}

function cueTreatment(cue: ReactionCue) {
  const t: BakasurPresetTreatment = {}
  if (cue.intensity !== undefined) t.glow = 1 + Math.min(1, Math.max(0, cue.intensity)) * 0.8
  if (cue.gaze !== undefined) t.look = cue.gaze
  return Object.keys(t).length ? t : undefined
}

/**
 * Personality influence (data-driven): a curious sequence nudges neutral
 * cues toward curious/attentive, suspicious toward suspicious/unimpressed
 * etc. Only expression swaps and intensity scaling — geometry never.
 */
const PERSONALITY_NUDGE: Record<string, { swap: Partial<Record<string, string>>; boost: number }> = {
  calm: { swap: {}, boost: 0 },
  curious: { swap: { neutral: 'curious', attentive: 'curious', deadpan: 'curious' }, boost: 0.05 },
  suspicious: { swap: { neutral: 'suspicious', attentive: 'suspicious', curious: 'suspicious' }, boost: 0.1 },
  chaotic: { swap: { neutral: 'mischievous', surprised: 'excited', curious: 'excited' }, boost: 0.15 },
  smug: { swap: { neutral: 'proud', proud: 'proud', curious: 'suspicious' }, boost: 0.05 },
  sleepy: { swap: { neutral: 'sleepy', proud: 'unimpressed', excited: 'unimpressed' }, boost: -0.1 },
  excited: { swap: { neutral: 'excited', happy: 'excited', proud: 'excited' }, boost: 0.15 },
  unimpressed: { swap: { neutral: 'unimpressed', attentive: 'unimpressed', surprised: 'unimpressed' }, boost: -0.05 }
}

export function applyPersonality(cue: ReactionCue | null, personality?: string): ReactionCue | null {
  if (!cue || !personality) return cue
  const p = getBakasurPersonality(personality)
  const nudge = p ? PERSONALITY_NUDGE[p.id] : undefined
  if (!p || !nudge) return cue
  const current = cue.expression ?? (cue.preset ? getBakasurPreset(cue.preset)?.expression : undefined)
  const swapped = current ? nudge.swap[current] : undefined
  const intensity =
    cue.intensity === undefined ? undefined : Math.min(1, Math.max(0, cue.intensity + nudge.boost))
  const expression = (swapped ?? current) as ReactionCue['expression']
  const out: ReactionCue = { ...cue }
  if (expression && BAKASUR_EXPRESSION_BY_ID.has(expression)) out.expression = expression
  if (intensity !== undefined) out.intensity = intensity
  // A personality also defines the resting face when the cue had none.
  if (!out.preset && !out.expression && !out.animation) out.expression = p.expression
  return out
}

/* ---------------------------------------------------------- interaction */

/** Data rule: normalized event (+ optional guard) → reaction cue. */
export interface InteractionRule {
  event: DialogueEventType
  /** Only when the dialogue state matches (e.g. idle only when speaking done). */
  when?: Partial<Record<DialogueInteractionState, true>>
  reaction: ReactionCue
  /** Cooldown seconds for repeated events (pointermove spam). Default 0. */
  cooldown?: number
}

export const DEFAULT_RULES: InteractionRule[] = [
  { event: 'pointerenter', reaction: { expression: 'attentive', animation: 'idle', intensity: 0.3 } },
  { event: 'pointerleave', reaction: { expression: 'neutral', animation: 'idle' } },
  { event: 'click', reaction: { expression: 'surprised', animation: 'exclaim', intensity: 0.6 } },
  { event: 'doubleclick', reaction: { expression: 'mischievous', animation: 'play', intensity: 0.5 } },
  { event: 'focus', reaction: { expression: 'attentive', animation: 'idle', intensity: 0.25 } },
  { event: 'keyboard', reaction: { expression: 'curious', animation: 'thinking', intensity: 0.3 } },
  { event: 'idle', reaction: { expression: 'sleepy', animation: 'sleep', intensity: 0.1 } },
  { event: 'sceneStart', reaction: { preset: 'bakasur-alert' } },
  { event: 'sceneComplete', reaction: { expression: 'proud', animation: 'egg', intensity: 0.55 } },
  { event: 'dialogueStart', reaction: { expression: 'attentive', animation: 'idle', intensity: 0.3 } },
  { event: 'dialogueComplete', reaction: { expression: 'proud', animation: 'idle', intensity: 0.45 } }
]

export function findRule(rules: InteractionRule[], event: DialogueEventType, state: DialogueInteractionState): InteractionRule | undefined {
  return rules.find((r) => r.event === event && (!r.when || r.when[state]))
}

/* ------------------------------------------------------------ state mgmt */

/** A state transition can be driven by an event or a runtime signal. */
export type DialogueSignal =
  | DialogueEventType
  | 'line:start'
  | 'line:end'
  | 'react:end'
  | 'choice:pick'
  | 'choice:resolve'
  | 'skip'

const TRANSITIONS: Record<DialogueInteractionState, Partial<Record<DialogueSignal, DialogueInteractionState>>> = {
  idle: { pointerenter: 'hover', click: 'engaged', 'line:start': 'speaking', sceneStart: 'engaged' },
  hover: { pointerleave: 'idle', click: 'engaged', 'line:start': 'speaking', idle: 'idle' },
  engaged: { 'line:start': 'speaking', 'react:end': 'idle', pointerleave: 'idle' },
  reacting: { 'react:end': 'idle', 'line:start': 'speaking' },
  speaking: { 'line:end': 'idle', choice: 'waiting' },
  waiting: { 'choice:pick': 'reacting', 'choice:resolve': 'speaking', skip: 'idle' },
  completed: { 'line:start': 'speaking', click: 'engaged' }
}

export function nextState(state: DialogueInteractionState, signal: DialogueSignal): DialogueInteractionState {
  return TRANSITIONS[state][signal] ?? state
}
