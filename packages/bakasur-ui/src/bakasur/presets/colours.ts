/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Bakasur colour vocabulary: five named themes in the violet family.
 * `void-violet` is the default and is EXACTLY the Phase 5 palette, so a
 * preset without a theme renders byte-identical Phase 5 output (locked by
 * test: themed render with void-violet equals the unthemed render).
 *
 * Restraint: no rainbow, no cartoon colours, no upstream bright-blue
 * (#2496e8) notification styling, no orange. ember-violet is warm
 * magenta-violet, never orange.
 */

import {
  BAKASUR_BODY_BASE,
  BAKASUR_EYE_GLOW,
  BAKASUR_INNER_LIGHT,
  BAKASUR_PASTILLE,
  BAKASUR_RIM,
  BAKASUR_VOID
} from '../palette'
import type { BakasurThemeId } from './types'

/**
 * A theme is the full colour surface the renderer reads. Field names match
 * BakasurRenderColours structurally, so the runtime passes a theme straight
 * through — no adapter, no mapping table.
 */
export interface BakasurColourTheme {
  id: BakasurThemeId
  name: string
  description: string
  /** Body base (masked fill under the key light). */
  body: string
  /** Void mixed into depth dots + standalone backgrounds. */
  void: string
  /** Internal key-light wash + arc-ramp middle. */
  innerLight: string
  /** Rim/aura bloom flood + arc-ramp start. */
  rim: string
  /** Eye-glow backing the mask holes reveal + arc-ramp end. */
  eyes: string
  /** Notification pastille. */
  pastille: string
}

export const DEFAULT_BAKASUR_THEME_ID: BakasurThemeId = 'void-violet'

export const BAKASUR_THEMES: Record<BakasurThemeId, BakasurColourTheme> = {
  'void-violet': {
    id: 'void-violet',
    name: 'Void violet',
    description: 'D2 Moon Harbinger: deep midnight-indigo body, moonlit silver-blue rim, cool white eyes.',
    body: BAKASUR_BODY_BASE,
    void: BAKASUR_VOID,
    innerLight: BAKASUR_INNER_LIGHT,
    rim: BAKASUR_RIM,
    eyes: BAKASUR_EYE_GLOW,
    pastille: BAKASUR_PASTILLE
  },
  'deep-indigo': {
    id: 'deep-indigo',
    name: 'Deep indigo',
    description: 'Cooler night-indigo read. Indigo, never upstream bright blue.',
    body: '#0b0a1c',
    void: '#050510',
    innerLight: '#6366f1',
    rim: '#818cf8',
    eyes: '#e8eafb',
    pastille: '#6366f1'
  },
  moonlit: {
    id: 'moonlit',
    name: 'Moonlit',
    description: 'Pale silver-lavender: the same dark form under moonlight.',
    body: '#14121f',
    void: '#0a090f',
    innerLight: '#b9a8ff',
    rim: '#cfc2ff',
    eyes: '#f6f2ff',
    pastille: '#a78bfa'
  },
  'ember-violet': {
    id: 'ember-violet',
    name: 'Ember violet',
    description: 'Warm magenta-violet ember. Warmth, never orange.',
    body: '#160c18',
    void: '#090509',
    innerLight: '#a855f7',
    rim: '#c084fc',
    eyes: '#f9ecfd',
    pastille: '#a855f7'
  },
  spectral: {
    id: 'spectral',
    name: 'Spectral',
    description: 'Cool ghostly violet-grey: quiet, distant, still Bakasur.',
    body: '#0e0d18',
    void: '#060609',
    innerLight: '#7c6cf0',
    rim: '#9d8fff',
    eyes: '#eef0ff',
    pastille: '#7c6cf0'
  }
}

export const BAKASUR_THEME_IDS = Object.keys(BAKASUR_THEMES) as BakasurThemeId[]

/**
 * Unknown ids degrade to the default (never throw, never blank) — the same
 * rule Phase 4/5 use for expressions and intents.
 */
export function resolveBakasurTheme(id: string | null | undefined): BakasurColourTheme {
  if (!id) return BAKASUR_THEMES[DEFAULT_BAKASUR_THEME_ID]!
  return (BAKASUR_THEMES as Record<string, BakasurColourTheme>)[id]
    ?? BAKASUR_THEMES[DEFAULT_BAKASUR_THEME_ID]!
}

export function isBakasurThemeId(id: string): id is BakasurThemeId {
  return id in BAKASUR_THEMES
}
