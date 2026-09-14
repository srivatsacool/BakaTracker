/*
 * BAKATRACKER — Bakasur Live Preview & Visual QA Tests (Phase 12.5)
 */

import { describe, it, expect } from 'vitest'
import {
  listBakasurPresets,
  getBakasurPreset,
  resolvePresetDef,
  resolveBakasurTheme,
  listScenes,
  getScene,
  listDialogueSequences,
  getDialogueSequence,
  BAKASUR_THEME_IDS
} from 'bakasur-ui'

describe('Bakasur Live Preview Infrastructure & Public API Integration', () => {
  it('loads preset catalogue cleanly from bakasur-ui public API', () => {
    const presets = listBakasurPresets()
    expect(presets.length).toBeGreaterThan(15)
    expect(getBakasurPreset('bakasur-idle')).toBeDefined()
    expect(getBakasurPreset('bakasur-thinking')).toBeDefined()
  })

  it('resolves preset definitions for Character Mode selection', () => {
    const idleDef = getBakasurPreset('bakasur-idle')!
    const resolved = resolvePresetDef(idleDef, { expression: 'excited', theme: 'ember-violet' })
    expect(resolved).toBeDefined()
    expect(resolved.look).toBeDefined()
    expect(resolved.theme).toBe('ember-violet')
  })

  it('validates themes and theme resolution for Character Mode controls', () => {
    expect(BAKASUR_THEME_IDS).toContain('void-violet')
    expect(BAKASUR_THEME_IDS).toContain('deep-indigo')
    expect(BAKASUR_THEME_IDS).toContain('ember-violet')
    const theme = resolveBakasurTheme('moonlit')
    expect(theme.name).toBe('Moonlit')
  })

  it('loads cinematic scenes for Cinematic Mode selection', () => {
    const scenes = listScenes()
    expect(scenes.length).toBe(5)
    const sceneIds = scenes.map(s => s.id)
    expect(sceneIds).toContain('bakasur-awakening')
    expect(sceneIds).toContain('bakasur-arrival')
    expect(sceneIds).toContain('bakasur-observing')
    expect(sceneIds).toContain('bakasur-suspicious')
    expect(sceneIds).toContain('bakasur-chaos')
    expect(getScene('bakasur-awakening')).toBeDefined()
  })

  it('loads dialogue sequences for Dialogue Mode selection', () => {
    const sequences = listDialogueSequences()
    expect(sequences.length).toBeGreaterThan(0)
    const seq = getDialogueSequence('awakening-intro')
    expect(seq).toBeDefined()
    expect(seq?.lines?.length).toBeGreaterThan(0)
  })

  it('handles invalid configuration fallbacks without throwing', () => {
    const invalidPreset = getBakasurPreset('non-existent-preset')
    expect(invalidPreset).toBeUndefined()

    // getScene falls back to the first scene (bakasur-awakening) for unknown IDs
    // rather than throwing — this is the documented API contract.
    const invalidScene = getScene('non-existent-scene')
    expect(invalidScene).toBeDefined()
    expect(invalidScene.id).toBe('bakasur-awakening')

    const fallbackTheme = resolveBakasurTheme('non-existent-theme')
    expect(fallbackTheme.id).toBe('void-violet')
  })
})
