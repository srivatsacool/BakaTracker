/*
 * BAKASUR-UI — Original Bakasur work (Phase 9).
 *
 * Dialogue data model. Everything here is DATA and TYPE unions — no
 * render functions, no runtime objects: JSON.stringify → parse →
 * validate → resolve must round-trip. References reuse the existing
 * catalogue ids (expressions, intents, presets, themes, personalities),
 * so the compiler catches typos and the validator catches imported junk.
 */

import type { BakasurIntent } from '../bakasur/animations/types'
import type { BakasurExpressionId } from '../bakasur/expressions/types'
import type { BakasurPersonalityId, BakasurPresetId, BakasurThemeId } from '../bakasur/presets/types'

/** Speakers known to the layer. The map in speakers.ts is the source of truth. */
export type DialogueSpeakerId = 'bakasur' | 'user' | 'narrator'

export type DialogueRevealMode = 'instant' | 'fade' | 'chars' | 'words'
export type DialogueAnchor = 'above' | 'below' | 'left' | 'right' | 'center' | 'custom'
export type DialogueEntrance = 'fade' | 'rise' | 'none'
export type PresentationStyleId = 'whisper' | 'cinematic' | 'alert' | 'thought' | 'system'

/** Normalized interaction events — the only vocabulary rules speak. */
export type DialogueEventType =
  | 'pointerenter'
  | 'pointerleave'
  | 'pointermove'
  | 'click'
  | 'doubleclick'
  | 'focus'
  | 'keyboard'
  | 'idle'
  | 'sceneStart'
  | 'sceneComplete'
  | 'dialogueStart'
  | 'dialogueComplete'
  | 'choice'

/** Deterministic interaction states, local to the dialogue runtime. */
export type DialogueInteractionState =
  | 'idle'
  | 'hover'
  | 'engaged'
  | 'reacting'
  | 'speaking'
  | 'waiting'
  | 'completed'

/**
 * A reaction resolves through the EXISTING preset pipeline
 * (resolveBakasurPreset + applyResolvedPreset). `intensity` maps to
 * glow as glow = 1 + intensity × 0.8 (the Phase 6 personality law).
 */
export interface ReactionCue {
  preset?: BakasurPresetId
  expression?: BakasurExpressionId
  animation?: BakasurIntent
  theme?: BakasurThemeId
  /** 0..1; drives the treatment glow. */
  intensity?: number
  /** Gaze bias via the existing treatment-look channel. */
  gaze?: { yaw: number; pitch: number; mix: number }
  /** Hold time in seconds; default = its line's reveal + tail. */
  duration?: number
}

export interface DialogueChoice {
  id: string
  label: string
  /** Line id to continue at. */
  next: string
  reaction?: ReactionCue
}

export interface DialogueLine {
  id: string
  text: string
  speaker: DialogueSpeakerId
  /** Seconds before this line starts (gap after the previous one). */
  delay?: number
  /** Minimum visible time; reveal-based estimate when omitted. */
  duration?: number
  /** Reveal mode. Default 'chars' for bakasur, 'instant' for others. */
  reveal?: DialogueRevealMode
  emphasis?: boolean
  position?: DialogueAnchor
  /** Normalized stage position (0..1), used when position is 'custom'. */
  custom?: { x: number; y: number }
  style?: PresentationStyleId
  entrance?: DialogueEntrance
  exit?: boolean
  reaction?: ReactionCue
  /** Choices make the line a wait: playback stops until one is picked. */
  choices?: DialogueChoice[]
  /** Next line id; null/absent ends the sequence. */
  next?: string | null
}

export interface DialogueSequence {
  id: string
  name: string
  description: string
  first: string
  lines: DialogueLine[]
  /** Personality colours default reactions, intensity and presentation. */
  personality?: BakasurPersonalityId
  tags?: string[]
}

export interface DialogueSpeaker {
  id: DialogueSpeakerId
  name: string
  /** Presentational metadata only; voice is deliberately not Phase 9. */
  preset: BakasurPresetId
  theme: BakasurThemeId
}

export interface DialogueIssue {
  field: string
  code: string
  message: string
}

export interface DialogueValidation {
  ok: boolean
  issues: DialogueIssue[]
}

/** One resolved frame of the dialogue timeline (pure function of t). */
export interface DialogueState {
  lineId: string | null
  line: DialogueLine | null
  /** Seconds since the line started. */
  tIn: number
  /** Text visible at tIn under its reveal rule. */
  revealed: string
  /** Reveal finished; surface may hold. */
  full: boolean
  /** A choice line finished revealing: playback must stop here. */
  waitingChoice: boolean
  done: boolean
  /** Total computed duration of the sequence. */
  total: number
  /** Resolved reaction of the current line (cue + personality laws). */
  reaction: ReactionCue | null
}
