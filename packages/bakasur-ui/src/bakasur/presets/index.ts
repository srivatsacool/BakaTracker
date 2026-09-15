/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Public preset API. Data flows one way:
 *
 *   preset data → validation → normalization → resolved configuration
 *     → existing runtime/renderer (which never sees catalogue internals).
 */

import {
  BAKASUR_PERSONALITIES,
  BAKASUR_PRESETS,
  getBakasurPersonality,
  getBakasurPreset,
  listBakasurPersonalities,
  listBakasurPresets,
  personalityInput
} from './catalogue'
import {
  BAKASUR_THEMES,
  isBakasurThemeId,
  resolveBakasurTheme
} from './colours'
import type {
  BakasurPersonality,
  BakasurPersonalityId,
  BakasurPresetDef,
  BakasurPresetId,
  BakasurPresetInput,
  BakasurPresetTreatment,
  BakasurValidationResult,
  ResolvedBakasurPreset
} from './types'
import { applyResolvedPreset, resolveBakasurPreset, resolvePresetDef, validateBakasurPreset } from './validate'

export {
  BAKASUR_PERSONALITIES,
  BAKASUR_PRESETS,
  BAKASUR_THEMES,
  applyResolvedPreset,
  getBakasurPersonality,
  getBakasurPreset,
  isBakasurThemeId,
  listBakasurPersonalities,
  listBakasurPresets,
  resolveBakasurPreset,
  resolveBakasurTheme,
  resolvePresetDef,
  validateBakasurPreset
}
export type {
  BakasurPersonality,
  BakasurPersonalityId,
  BakasurPresetDef,
  BakasurPresetId,
  BakasurPresetInput,
  BakasurPresetTreatment,
  BakasurValidationResult,
  ResolvedBakasurPreset
}

/** Resolve a catalogue preset id with optional explicit overrides. */
export function resolvePresetById(
  id: string,
  explicit?: {
    expression?: string | null
    theme?: string
    treatment?: BakasurPresetTreatment | null
  }
): ResolvedBakasurPreset {
  const def = getBakasurPreset(id)
  if (!def) return resolveBakasurPreset({ animation: 'idle' }, explicit)
  return resolvePresetDef(def, explicit)
}

/** Resolve a personality through the same pipeline (data-driven). */
export function resolvePersonality(id: string): ResolvedBakasurPreset {
  const p = getBakasurPersonality(id)
  if (!p) return resolveBakasurPreset({ animation: 'idle' })
  return resolveBakasurPreset(personalityInput(p))
}
