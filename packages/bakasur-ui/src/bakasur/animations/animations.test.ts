/*
 * BAKASUR-UI — Original Bakasur work (Phase 5).
 *
 * Adapter contract tests: the table covers every timeline id, every
 * vehicle keeps the Bakasur body, faces are honoured exactly where the
 * vehicle honours them, treatments stay in range, and — structurally —
 * timing cannot be altered here (the def type has no timing fields; this
 * test locks the key set so none can sneak in).
 */
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../../engine/engine'
import { STATE_BY_ID, STATES } from '../../engine/states'
import { BAKASUR_EXPRESSION_BY_ID } from '../expressions/index'
import { BAKASUR_ANIMATIONS, applyBakasurAnimation, bakasurIntents, resolveBakasurAnimation } from './index'
import { BAKASUR_SHAPE_VARIANTS } from './shapes'
import type { BakasurAnimationDef } from './types'

const R = 100
const ALLOWED_KEYS = new Set([
  'intent',
  'disposition',
  'vehicle',
  'expression',
  'shape',
  'look',
  'treatment',
  'semantics',
  'dropped'
])
const DISPOSITIONS = new Set(['KEEP', 'ADAPT', 'REMAP', 'SPECIAL', 'UI-ONLY'])

describe('bakasur animation adapters', () => {
  it('covers every upstream StateId exactly once', () => {
    const upstream = new Set(STATES.map((s) => s.id))
    expect(BAKASUR_ANIMATIONS).toHaveLength(upstream.size)
    expect(new Set(bakasurIntents())).toEqual(upstream)
  })

  it('every vehicle exists and keeps the Bakasur body', () => {
    for (const def of BAKASUR_ANIMATIONS) {
      expect(STATE_BY_ID.has(def.vehicle), `${def.intent} vehicle`).toBe(true)
      expect(STATE_BY_ID.get(def.vehicle)!.baseBody, `${def.intent} baseBody`).toBe(true)
    }
  })

  it('faces are honoured exactly where vehicles honour them', () => {
    for (const def of BAKASUR_ANIMATIONS) {
      const honours = STATE_BY_ID.get(def.vehicle)!.baseFace
      if (!honours) {
        expect(def.expression, `${def.intent} fixed-face vehicle`).toBeNull()
      } else if (def.expression) {
        expect(BAKASUR_EXPRESSION_BY_ID.has(def.expression), `${def.intent} face`).toBe(true)
      }
    }
  })

  it('shapes, looks and treatments stay in range', () => {
    for (const def of BAKASUR_ANIMATIONS) {
      expect(BAKASUR_SHAPE_VARIANTS.has(def.shape), `${def.intent} shape`).toBe(true)
      if (def.look) {
        expect(def.look.mix, `${def.intent} mix`).toBeGreaterThanOrEqual(0)
        expect(def.look.mix, `${def.intent} mix`).toBeLessThanOrEqual(1)
      }
      expect(def.treatment.dim, `${def.intent} dim`).toBeGreaterThanOrEqual(0)
      expect(def.treatment.dim, `${def.intent} dim`).toBeLessThanOrEqual(0.6)
      expect(def.treatment.glow, `${def.intent} glow`).toBeGreaterThanOrEqual(0.5)
      expect(def.treatment.glow, `${def.intent} glow`).toBeLessThanOrEqual(2)
      expect(def.semantics.length, `${def.intent} semantics`).toBeGreaterThan(0)
      expect(def.dropped.length, `${def.intent} dropped`).toBeGreaterThan(0)
      expect(DISPOSITIONS.has(def.disposition), `${def.intent} disposition`).toBe(true)
    }
  })

  it('carries no timing fields (upstream timing preserved by construction)', () => {
    for (const def of BAKASUR_ANIMATIONS) {
      expect(
        Object.keys(def).filter((k) => !ALLOWED_KEYS.has(k)),
        def.intent
      ).toEqual([])
      const forbidden = JSON.stringify(def)
      expect(forbidden).not.toMatch(/"duration"|"morph"|"easing"|"blinkIn"/)
    }
  })

  it('unknown intents degrade to idle, never to raw upstream', () => {
    expect(resolveBakasurAnimation('nope')).toBe(resolveBakasurAnimation('idle'))
    expect(resolveBakasurAnimation('')).toBe(resolveBakasurAnimation('idle'))
  })

  it('application is deterministic per (def, now)', () => {
    for (const def of BAKASUR_ANIMATIONS) {
      const a = new BotEngine(R, 'idle', null, null)
      const b = new BotEngine(R, 'idle', null, null)
      applyBakasurAnimation(a, def, 0)
      applyBakasurAnimation(b, def, 0)
      for (const t of [0.2, 1.5]) {
        expect(a.sample(t).bodyPath, `${def.intent}@${t}`).toBe(b.sample(t).bodyPath)
        expect(
          a.sample(t).eyes.map((y) => y.matrix),
          `${def.intent}@${t}`
        ).toEqual(b.sample(t).eyes.map((y) => y.matrix))
      }
      expect(a.state, def.intent).toBe(def.vehicle)
    }
  })

  it('def type has no room for per-state expression hacks', () => {
    // expression is a catalogue id or null — never inline geometry.
    const inline: (BakasurAnimationDef['expression'] & object)[] = []
    for (const def of BAKASUR_ANIMATIONS) {
      if (def.expression !== null && typeof def.expression !== 'string') inline.push(def.expression)
    }
    expect(inline).toEqual([])
  })
})
