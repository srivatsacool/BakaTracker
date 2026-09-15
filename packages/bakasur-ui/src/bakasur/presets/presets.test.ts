/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Preset contract tests: catalogue integrity (24 compositions, no inline
 * geometry), structured validation, documented fallbacks, determinism,
 * JSON serialization and personality resolution.
 */
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../../engine/engine'
import { BAKASUR_ANIMATIONS } from '../animations/index'
import { BAKASUR_EXPRESSION_BY_ID } from '../expressions/index'
import {
  BAKASUR_PERSONALITIES,
  BAKASUR_PRESETS,
  getBakasurPersonality,
  getBakasurPreset,
  listBakasurPersonalities,
  listBakasurPresets,
  personalityInput
} from './catalogue'
import { BAKASUR_THEMES } from './colours'
import { isBakasurShapeId } from './shapes'
import { intentAt, normalizeBakasurTimeline } from './timeline'
import {
  applyResolvedPreset,
  resolveBakasurPreset,
  resolvePresetDef,
  validateBakasurPreset
} from './validate'
import { resolvePersonality, resolvePresetById } from './index'

const R = 100
const INTENT_IDS = new Set(BAKASUR_ANIMATIONS.map((d) => d.intent))

const PRESET_DEF_KEYS = new Set([
  'id',
  'name',
  'description',
  'animation',
  'expression',
  'shape',
  'theme',
  'treatment',
  'timeline',
  'tags',
  'mood',
  'preview'
])

function appliedBody(resolved: ReturnType<typeof resolveBakasurPreset>, t: number): string {
  const e = new BotEngine(R, 'idle', null, null)
  applyResolvedPreset(e, resolved, 0)
  return e.sample(t).bodyPath
}

describe('bakasur preset catalogue', () => {
  it('holds exactly the 24 specified presets, all valid', () => {
    expect(listBakasurPresets()).toHaveLength(24)
    const core = ['bakasur-idle', 'bakasur-thinking', 'bakasur-attentive', 'bakasur-curious', 'bakasur-suspicious', 'bakasur-confused']
    const reaction = ['bakasur-surprised', 'bakasur-excited', 'bakasur-happy', 'bakasur-laughing', 'bakasur-annoyed', 'bakasur-angry', 'bakasur-scared', 'bakasur-proud', 'bakasur-unimpressed', 'bakasur-sleepy', 'bakasur-mischievous', 'bakasur-deadpan']
    const system = ['bakasur-notify', 'bakasur-alert', 'bakasur-exclaim']
    const cinematic = ['bakasur-orbit', 'bakasur-comet', 'bakasur-burst']
    for (const id of [...core, ...reaction, ...system, ...cinematic]) {
      expect(getBakasurPreset(id)?.id, id).toBe(id)
    }
  })

  it('presets are compositions, never independent implementations', () => {
    for (const def of listBakasurPresets()) {
      expect(Object.keys(def).filter((k) => !PRESET_DEF_KEYS.has(k)), def.id).toEqual([])
      expect(INTENT_IDS.has(def.animation), `${def.id} animation`).toBe(true)
      if (def.expression !== undefined) {
        expect(BAKASUR_EXPRESSION_BY_ID.has(def.expression), `${def.id} face`).toBe(true)
      }
      if (def.shape !== undefined) {
        expect(isBakasurShapeId(def.shape), `${def.id} shape`).toBe(true)
      }
      if (def.theme !== undefined) {
        expect(def.theme in BAKASUR_THEMES, `${def.id} theme`).toBe(true)
      }
      expect(def.name.length, `${def.id} name`).toBeGreaterThan(0)
      expect(def.description.length, `${def.id} description`).toBeGreaterThan(0)
      // Every catalogue preset validates clean (faces only on honouring vehicles).
      expect(validateBakasurPreset(def).ok, `${def.id} valid`).toBe(true)
    }
  })

  it('unknown preset ids degrade to idle, never to nothing', () => {
    expect(resolvePresetById('nope').animation).toBe('idle')
    expect(getBakasurPreset('nope')).toBeUndefined()
  })
})

describe('bakasur preset validation', () => {
  it('accepts a full valid input with a normalized configuration', () => {
    const v = validateBakasurPreset({
      animation: 'thinking',
      expression: 'curious',
      shape: 'bakasur-thinking',
      theme: 'moonlit',
      treatment: { dim: 0.1, glow: 1.2 },
      timeline: { steps: [{ intent: 'thinking', duration: 2 }], repeat: 2 }
    })
    expect(v.ok).toBe(true)
    expect(v.issues).toEqual([])
    expect(v.normalized?.animation).toBe('thinking')
    expect(v.normalized?.theme).toBe('moonlit')
  })

  it('reports structured errors for every bad axis', () => {
    const v = validateBakasurPreset({
      animation: 'nope',
      expression: 'vague',
      shape: 'blob',
      theme: 'rainbow',
      treatment: { dim: 9, glow: -1 },
      timeline: { steps: [], repeat: 0 }
    })
    expect(v.ok).toBe(false)
    expect(v.normalized).toBeUndefined()
    const fields = v.issues.map((i) => i.field)
    for (const f of ['animation', 'expression', 'shape', 'theme', 'treatment', 'timeline']) {
      expect(fields, f).toContain(f)
    }
    for (const i of v.issues) {
      expect(i.code.length).toBeGreaterThan(0)
      expect(i.message.length).toBeGreaterThan(0)
    }
  })

  it('flags a face on a fixed-face vehicle as incompatible', () => {
    const v = validateBakasurPreset({ animation: 'notify', expression: 'happy' })
    expect(v.ok).toBe(false)
    expect(v.issues.map((i) => i.code)).toContain('expression-ignored')
  })

  it('flags timeline steps naming unknown intents', () => {
    const v = validateBakasurPreset({
      animation: 'idle',
      timeline: { steps: [{ intent: 'idle', duration: 1 }, { intent: 'nope', duration: 1 }] }
    })
    expect(v.ok).toBe(false)
    expect(v.issues.map((i) => i.code)).toContain('timeline-unknown-intent')
  })
})

describe('bakasur preset resolution', () => {
  it('applies documented fallbacks without throwing', () => {
    const r = resolveBakasurPreset({
      animation: 'nope',
      expression: 'vague',
      shape: 'blob',
      theme: 'rainbow',
      timeline: { steps: [] }
    })
    expect(r.animation).toBe('idle')
    expect(r.theme).toBe('void-violet')
    expect(r.shape).toBe('bakasur')
    expect(r.expression).toBeNull()
    expect(r.timeline.steps).toHaveLength(1)
  })

  it('explicit overrides beat preset input per field', () => {
    const base = resolvePresetDef(BAKASUR_PRESETS['bakasur-thinking']!)
    expect(base.theme).toBe('void-violet')
    const over = resolvePresetDef(BAKASUR_PRESETS['bakasur-thinking']!, {
      expression: 'sleepy',
      theme: 'moonlit',
      treatment: { glow: 1.5 }
    })
    expect(over.expression).toBe('sleepy')
    expect(over.theme).toBe('moonlit')
    expect(over.treatment.glow).toBe(1.5)
    // Untouched fields stand.
    expect(over.animation).toBe(base.animation)
    expect(over.shape).toBe(base.shape)
  })

  it('explicit null expression releases to the resting pose', () => {
    const r = resolvePresetDef(BAKASUR_PRESETS['bakasur-thinking']!, { expression: null })
    expect(r.expression).toBeNull()
  })

  it('idle resting pose renders completely upright eyes without tilt or crooked roll', () => {
    const engine = new BotEngine(R, 'idle', null, null)
    const resolved = resolveBakasurPreset({ animation: 'idle' })
    applyResolvedPreset(engine, resolved, 0)
    const frame = engine.sample(0)
    expect(frame.eyes).toHaveLength(2)
    for (const eye of frame.eyes) {
      const match = eye.matrix.match(/matrix\(([^,]+),([^,]+),([^,]+),([^,]+),/)
      expect(match).not.toBeNull()
      const [, a, b, c] = match!.map(Number)
      // Upright capsule has near-zero b and c matrix components (no tilt/roll)
      expect(Math.abs(b!)).toBeLessThan(0.06)
      expect(Math.abs(c!)).toBeLessThan(0.06)
      expect(a!).toBeGreaterThan(0.9)
    }
  })

  it('is deterministic per input and replay-stable on the engine', () => {
    for (const def of listBakasurPresets()) {
      const a = resolvePresetDef(def)
      const b = JSON.parse(JSON.stringify(a)) as typeof a
      expect(b).toEqual(a)
      for (const t of [0.5, 2]) {
        expect(appliedBody(a, t), `${def.id}@${t}`).toBe(appliedBody(b, t))
      }
    }
  })
})

describe('bakasur preset serialization', () => {
  it('every preset def and every resolved preset survives JSON round-trip', () => {
    for (const def of listBakasurPresets()) {
      const back = JSON.parse(JSON.stringify(def)) as typeof def
      expect(back).toEqual(def)
      expect(resolvePresetDef(back)).toEqual(resolvePresetDef(def))
    }
  })

  it('serializes no functions', () => {
    for (const def of listBakasurPresets()) {
      const s = JSON.stringify(resolvePresetDef(def))
      expect(s).not.toMatch(/function|=>|\(\)/)
    }
  })
})

describe('bakasur personalities', () => {
  it('holds the 8 specified personalities, all resolving through the pipeline', () => {
    expect(listBakasurPersonalities()).toHaveLength(8)
    for (const id of ['calm', 'curious', 'suspicious', 'chaotic', 'smug', 'sleepy', 'excited', 'unimpressed']) {
      expect(getBakasurPersonality(id)?.id, id).toBe(id)
    }
  })

  it('intensity maps deterministically to glow inside the contract range', () => {
    for (const p of Object.values(BAKASUR_PERSONALITIES)) {
      expect(p.intensity).toBeGreaterThanOrEqual(0)
      expect(p.intensity).toBeLessThanOrEqual(1)
      const r = resolveBakasurPreset(personalityInput(p))
      expect(r.treatment.glow, p.id).toBeCloseTo(1 + p.intensity * 0.8, 10)
      expect(r.expression, p.id).toBe(p.expression)
      expect(r.animation, p.id).toBe(p.animation)
      expect(r.theme, p.id).toBe(p.theme)
    }
  })

  it('unknown personalities degrade to idle', () => {
    expect(resolvePersonality('nope').animation).toBe('idle')
  })
})

describe('bakasur timeline model', () => {
  it('defaults to one 2 s beat on the fallback intent', () => {
    const t = normalizeBakasurTimeline(undefined, 'idle')
    expect(t.steps).toHaveLength(1)
    expect(t.steps[0]).toEqual({ intent: 'idle', duration: 2, hold: 0 })
    expect(t.repeat).toBe(1)
    expect(t.totalDuration).toBe(2)
  })

  it('intentAt is pure: delay, beats, end-hold and invalid time', () => {
    const t = normalizeBakasurTimeline(
      { steps: [{ intent: 'idle', duration: 1 }, { intent: 'thinking', duration: 2 }], delay: 0.5 },
      'idle'
    )
    expect(intentAt(t, -1)).toBe('idle')
    expect(intentAt(t, 0.2)).toBe('idle')
    expect(intentAt(t, 1.4)).toBe('idle')
    expect(intentAt(t, 1.5)).toBe('thinking')
    expect(intentAt(t, 1.6)).toBe('thinking')
    expect(intentAt(t, 99)).toBe('thinking')
    expect(intentAt(t, NaN)).toBe('idle')
  })

  it('repeat and direction stay deterministic', () => {
    const t = normalizeBakasurTimeline(
      { steps: [{ intent: 'idle', duration: 1 }, { intent: 'thinking', duration: 1 }], repeat: 2, direction: 'alternate' },
      'idle'
    )
    expect(t.totalDuration).toBe(2)
    expect(intentAt(t, 0.5)).toBe('idle')
    expect(intentAt(t, 2.5)).toBe('thinking')
    expect(intentAt(t, 99)).toBe('thinking')
  })
})
