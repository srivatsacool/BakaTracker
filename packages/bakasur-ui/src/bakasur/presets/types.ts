/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Preset model types. A preset is DATA: Shape × Expression × Animation ×
 * Colour × Timeline × Treatment + metadata. No SVG, no render logic, no
 * functions — every interface here is JSON-serializable by construction.
 *
 * Precedence (documented once, enforced in validate.ts):
 *   explicit user override > preset overlay > animation-intent default.
 */

import type { StateId } from '../../engine/states'
import type {
  BakasurIntent,
  BakasurLookBias,
  BakasurShapeId,
  BakasurTreatment
} from '../animations/types'
import type { BakasurExpressionId } from '../expressions/types'

/** The five intentional colour themes (violet family only). */
export type BakasurThemeId =
  | 'void-violet'
  | 'deep-indigo'
  | 'moonlit'
  | 'ember-violet'
  | 'spectral'

/** The 24 catalogue presets: 6 core + 12 reaction + 3 system + 3 cinematic. */
export type BakasurPresetId =
  | 'bakasur-idle'
  | 'bakasur-thinking'
  | 'bakasur-attentive'
  | 'bakasur-curious'
  | 'bakasur-suspicious'
  | 'bakasur-confused'
  | 'bakasur-surprised'
  | 'bakasur-excited'
  | 'bakasur-happy'
  | 'bakasur-laughing'
  | 'bakasur-annoyed'
  | 'bakasur-angry'
  | 'bakasur-scared'
  | 'bakasur-proud'
  | 'bakasur-unimpressed'
  | 'bakasur-sleepy'
  | 'bakasur-mischievous'
  | 'bakasur-deadpan'
  | 'bakasur-notify'
  | 'bakasur-alert'
  | 'bakasur-exclaim'
  | 'bakasur-orbit'
  | 'bakasur-comet'
  | 'bakasur-burst'

/** Higher-level personality presets (data-driven, resolve via the pipeline). */
export type BakasurPersonalityId =
  | 'calm'
  | 'curious'
  | 'suspicious'
  | 'chaotic'
  | 'smug'
  | 'sleepy'
  | 'excited'
  | 'unimpressed'

export type TimelineDirection = 'forward' | 'reverse' | 'alternate'

/** One deterministic beat: hold an intent, then an optional frozen hold. */
export interface BakasurTimelineStep {
  intent: string
  /** Seconds on this intent. Finite, > 0 after normalization. */
  duration: number
  /** Optional frozen tail in seconds. Finite, >= 0. Default 0. */
  hold?: number
}

/**
 * Deterministic timing data. Controls calls into the runtime layer;
 * the framework-free engine model is untouched (no timing enters it).
 * Fully JSON-serializable.
 */
export interface BakasurTimeline {
  /** Beats in order. Default: one 2 s beat on the preset's animation. */
  steps?: readonly BakasurTimelineStep[]
  /** Whole-sequence repeats. Integer >= 1. Default 1. */
  repeat?: number
  /** Play order. Default 'forward'. */
  direction?: TimelineDirection
  /** Pre-roll silence in seconds. Finite, >= 0. Default 0. */
  delay?: number
  /** Gap between beats in seconds (intent already applied). Default 0. */
  transition?: number
}

/** Timeline with every default filled and every value range-checked. */
export interface NormalizedBakasurTimeline {
  steps: ReadonlyArray<{ intent: BakasurIntent; duration: number; hold: number }>
  repeat: number
  direction: TimelineDirection
  delay: number
  transition: number
  /** Sum of step durations + holds + transitions. Deterministic. */
  totalDuration: number
}

/**
 * Partial treatment overlay. Undefined = inherit the intent default;
 * look null = explicitly release the intent's gaze bias.
 */
export interface BakasurPresetTreatment {
  dim?: number
  glow?: number
  look?: BakasurLookBias | null
}

/** A catalogue preset: composition of the underlying systems, never geometry. */
export interface BakasurPresetDef {
  id: BakasurPresetId
  name: string
  description: string
  /** Animation intent; timelines and consumers already speak these ids. */
  animation: BakasurIntent
  /** Face override. Undefined = the intent's face stands. */
  expression?: BakasurExpressionId
  /** Shape override. Undefined = the intent's shape stands. */
  shape?: BakasurShapeId
  /** Colour theme. Default 'void-violet' (= Phase 5 output). */
  theme?: BakasurThemeId
  /** Treatment overlay. Default: inherit the intent untouched. */
  treatment?: BakasurPresetTreatment
  /** Timing. Default: one 2 s beat on the animation. */
  timeline?: BakasurTimeline
  tags?: readonly string[]
  /** Personality/mood tag for the Phase 9 layer. */
  mood?: string
  preview?: { size?: number; at?: number }
}

/** User-supplied preset input: ids are plain strings, validated on entry. */
export interface BakasurPresetInput {
  animation: string
  expression?: string | null
  shape?: string
  theme?: string
  treatment?: BakasurPresetTreatment
  timeline?: BakasurTimeline
}

/** Personality preset: expression + animation + theme + intensity, all data. */
export interface BakasurPersonality {
  id: BakasurPersonalityId
  name: string
  description: string
  expression: BakasurExpressionId
  animation: BakasurIntent
  theme: BakasurThemeId
  /** 0..1 dramatic weight. Maps deterministically to glow (see catalogue). */
  intensity: number
  idleBehaviour?: string
  tags?: readonly string[]
  blurb: string
}

/**
 * Fully resolved configuration: everything the runtime needs, nothing it
 * must look up. JSON-serializable; sufficient to render deterministically.
 */
export interface ResolvedBakasurPreset {
  animation: BakasurIntent
  /** Engine vehicle (always baseBody=true, inherited from the intent). */
  vehicle: StateId
  /** Effective face after explicit > preset > intent precedence. */
  expression: BakasurExpressionId | null
  shape: BakasurShapeId
  theme: BakasurThemeId
  treatment: BakasurTreatment
  look: BakasurLookBias | null
  timeline: NormalizedBakasurTimeline
}

export interface BakasurPresetIssue {
  field: 'animation' | 'expression' | 'shape' | 'theme' | 'treatment' | 'timeline' | 'preset' | 'personality'
  code: string
  message: string
}

export interface BakasurValidationResult {
  ok: boolean
  issues: readonly BakasurPresetIssue[]
  /** Present only when ok: the normalized, render-ready configuration. */
  normalized?: ResolvedBakasurPreset
}
