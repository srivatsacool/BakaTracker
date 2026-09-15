/*
 * BAKASUR-UI — Original Bakasur work (Phase 9).
 *
 * Speakers + presentation styles: metadata only. The surface is ONE
 * cinematic treatment with five moods (whisper/cinematic/alert/thought/
 * system) — sizes, opacities and violet accents differ, the structure
 * never does. No bubbles, no tails, no paper. Voice/audio deliberately
 * absent (a placeholder field carries metadata for a later phase).
 */

import type {
  DialogueSpeaker,
  DialogueSpeakerId,
  PresentationStyleId
} from './types'

export const DIALOGUE_SPEAKERS: Record<DialogueSpeakerId, DialogueSpeaker> = {
  bakasur: { id: 'bakasur', name: 'Bakasur', preset: 'bakasur-idle', theme: 'void-violet' },
  user: { id: 'user', name: 'You', preset: 'bakasur-attentive', theme: 'void-violet' },
  narrator: { id: 'narrator', name: 'Narrator', preset: 'bakasur-deadpan', theme: 'spectral' }
}

export function isSpeakerId(id: string): id is DialogueSpeakerId {
  return id in DIALOGUE_SPEAKERS
}

export interface PresentationStyle {
  id: PresentationStyleId
  name: string
  description: string
  /** CSS class suffix on the surface (`dlg--<id>`). */
  /** Relative font size (rem at 1440; scaled down on narrow stages). */
  size: number
  opacity: number
  /** Border/edge glow strength 0..1 (violet only). */
  edge: number
  /** Italic read (thought), monospace read (system), plain otherwise. */
  variant: 'plain' | 'italic' | 'mono'
}

export const PRESENTATION_STYLES: Record<PresentationStyleId, PresentationStyle> = {
  whisper: { id: 'whisper', name: 'Whisper', description: 'Small, faint, intimate.', size: 0.92, opacity: 0.72, edge: 0.18, variant: 'plain' },
  cinematic: { id: 'cinematic', name: 'Cinematic', description: 'The default voice: clean, restrained glow.', size: 1.15, opacity: 0.94, edge: 0.4, variant: 'plain' },
  alert: { id: 'alert', name: 'Alert', description: 'Emphasis without shouting: brighter rim.', size: 1.08, opacity: 1, edge: 0.75, variant: 'plain' },
  thought: { id: 'thought', name: 'Thought', description: 'Interior: italic, dimmed, lifted.', size: 1.0, opacity: 0.8, edge: 0.25, variant: 'italic' },
  system: { id: 'system', name: 'System', description: 'Meta lines: mono, small, top-anchored.', size: 0.85, opacity: 0.66, edge: 0.2, variant: 'mono' }
}

export function isStyleId(id: string): id is PresentationStyleId {
  return id in PRESENTATION_STYLES
}

/**
 * Normalized anchor → CSS placement inside the stage, with safe zones
 * that keep text off the character face band (stage center) and the
 * portal. Values are % of stage width/height.
 */
export const ANCHOR_ZONES: Record<
  string,
  { bottom?: string; top?: string; left: string; right: string; maxWidth: string }
> = {
  above: { bottom: '62%', left: '12%', right: '12%', maxWidth: '76%' },
  below: { top: '66%', left: '12%', right: '12%', maxWidth: '76%' },
  left: { bottom: '8%', top: 'auto', left: '6%', right: '54%', maxWidth: '40%' },
  right: { bottom: '8%', top: 'auto', left: '54%', right: '6%', maxWidth: '40%' },
  center: { bottom: '8%', left: '12%', right: '12%', maxWidth: '76%' }
}

/** Reveal speeds (characters/second, words/second). Deterministic. */
export const REVEAL_CPS = 34
export const REVEAL_WPS = 4.2
/** Hold tail after a reveal finishes (seconds). */
export const REVEAL_TAIL = 1.1
