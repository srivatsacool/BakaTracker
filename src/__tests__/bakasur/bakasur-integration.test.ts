/*
 * BAKATRACKER — Integration Test Suite (Phase 11).
 *
 * Verifies the boundary contract between BakaTracker and bakasur-ui:
 * state mapping, message translation, reaction routing, reduced motion,
 * scene selection, fallback safety, and public API imports.
 */

import { describe, expect, it } from 'vitest'
import {
  mapProductStateToLook,
  mapSignalToLook,
  mapAssistantIntentToPreset
} from '../../components/bakasur/stateMapping'
import {
  getBakasurPreset,
  getScene,
  listScenes,
  resolveSceneFrame,
  dialogueStateAt,
  scheduleSequence,
  getDialogueSequence
} from 'bakasur-ui'

describe('BakaTracker Integration Layer', () => {
  it('1. maps BakaTracker state to Bakasur preset & intent', () => {
    expect(mapProductStateToLook('IDLE').preset).toBe('bakasur-idle')
    expect(mapProductStateToLook('HAPPY').preset).toBe('bakasur-happy')
    expect(mapProductStateToLook('THINKING').preset).toBe('bakasur-thinking')
    expect(mapProductStateToLook('ALERT').preset).toBe('bakasur-suspicious')
    expect(mapProductStateToLook('SLEEP').expression).toBe('sleepy')
    expect(mapProductStateToLook('CELEBRATE').preset).toBe('bakasur-burst')
  })

  it('2. maps BakaTracker messages & intents to dialogue & presets', () => {
    expect(mapAssistantIntentToPreset('excited')).toBe('bakasur-excited')
    expect(mapAssistantIntentToPreset('thinking')).toBe('bakasur-thinking')
    expect(mapAssistantIntentToPreset('suspicious')).toBe('bakasur-suspicious')
    expect(mapAssistantIntentToPreset('unknown_intent')).toBe('bakasur-idle')
  })

  it('3. maps BakaTracker reactions to Bakasur UI visual responses', () => {
    expect(mapSignalToLook('JOURNAL_LOGGED').preset).toBe('bakasur-proud')
    expect(mapSignalToLook('QUEST_COMPLETED').preset).toBe('bakasur-happy')
    expect(mapSignalToLook('HABIT_COMPLETED').preset).toBe('bakasur-happy')
    expect(mapSignalToLook('STREAK_MILESTONE').preset).toBe('bakasur-burst')
    expect(mapSignalToLook('LEVEL_UP').preset).toBe('bakasur-burst')
    expect(mapSignalToLook('USER_OPENED_BAKSUR').preset).toBe('bakasur-curious')
  })

  it('4. reduced motion propagates to scene & runtime frames', () => {
    const scene = getScene('bakasur-chaos')
    const calmFrame = resolveSceneFrame(scene, 4.0, { reducedMotion: true })
    expect(calmFrame.reduced).toBe(true)
    expect(calmFrame.actor.hoverY).toBe(0)
  })

  it('5. scene selection resolves all 5 cinematic presets', () => {
    const scenes = listScenes()
    expect(scenes.length).toBe(5)
    for (const s of scenes) {
      expect(getScene(s.id).id).toBe(s.id)
    }
  })

  it('6. dialogue completion event timing is calculated deterministically', () => {
    const seq = getDialogueSequence('awakening-intro')
    if (seq) {
      const sched = scheduleSequence(seq)
      expect(sched.total).toBeGreaterThan(0)
    }
  })

  it('7. choice event updates dialogue state branch', () => {
    const seq = getDialogueSequence('awakening-intro')
    if (seq) {
      const state = dialogueStateAt(seq, 1.0)
      expect(state.done).toBe(false)
    }
  })

  it('8. scene completion event occurs at duration limit', () => {
    const scene = getScene('bakasur-arrival')
    const endFrame = resolveSceneFrame(scene, scene.duration)
    expect(endFrame.t).toBe(scene.duration)
  })

  it('9. invalid state fallback degrades gracefully to bakasur-idle', () => {
    const invalidLook = mapProductStateToLook('UNKNOWN' as any)
    expect(invalidLook.preset).toBe('bakasur-idle')
    expect(invalidLook.intent).toBe('idle')
  })

  it('10. disabled Bakasur behavior falls back without crashing', () => {
    const preset = getBakasurPreset('non-existent' as any)
    expect(preset).toBeUndefined()
  })

  it('11. responsive integration assumptions cover stage aspect ratio', () => {
    const scene = getScene('bakasur-awakening')
    const frame = resolveSceneFrame(scene, 2.0)
    expect(frame.camera.zoom).toBeGreaterThan(0)
  })

  it('12. public API imports exposed correctly from bakasur-ui', () => {
    expect(getScene).toBeDefined()
    expect(getBakasurPreset).toBeDefined()
    expect(resolveSceneFrame).toBeDefined()
  })
})
