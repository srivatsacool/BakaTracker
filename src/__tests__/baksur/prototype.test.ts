/**
 * V3.4.1 — Baksur visual prototype validation (pure, DOM-free).
 *
 * Guards the vendored Bloub subset and the two Baksur prototype shapes:
 * sample-count invariant, horn presence, determinism, and per-state frame
 * sanity. See docs/baksur/IMPLEMENTATION-PLAN.md (V3.4.1 validation).
 */
import { describe, expect, it } from 'vitest'
import { PROFILE_SAMPLES } from '../../lib/bloub/profiles'
import { SHAPE_BY_ID, SHAPES } from '../../lib/bloub/skins'
import { BotEngine } from '../../lib/bloub/engine'
import { EXPRESSION_BY_ID } from '../../lib/bloub/expressions'
import { POSES, STATES } from '../../lib/bloub/states'
import { BAKSUR_STATE_MAP, BAKSUR_STATES } from '../../components/shell/baksurShared'

describe('baksur vendored bloub subset', () => {
  it('trims the state catalog to exactly the 5 required states', () => {
    expect(STATES.map((s) => s.id).sort()).toEqual(['idle', 'sleep', 'thinking', 'wide', 'wink'])
    expect(POSES).toHaveProperty('idle')
  })

  it('keeps the 64-sample radial invariant on every shape', () => {
    for (const shape of SHAPES) {
      expect(shape.radii).toHaveLength(PROFILE_SAMPLES)
      shape.radii.forEach((r, i) => {
        expect(Number.isFinite(r), `${shape.id}[${i}]`).toBe(true)
        expect(r).toBeGreaterThan(0)
      })
    }
  })

  it('gives both prototype shapes horns/crest above their body peak', () => {
    for (const id of ['mochi', 'flamehorn'] as const) {
      const radii = SHAPE_BY_ID.get(id)!.radii
      const n = radii.length
      // horns/crown live in the top half (samples n/4..3n/4 are right/left
      // halves; vertical axis is at sample 3n/4). Use the bottom half as the
      // horn-free body reference: angles 0..180deg = samples 0..n/2.
      const body = Math.max(...radii.slice(0, n / 2))
      const peak = Math.max(...radii)
      expect(peak, id).toBeGreaterThan(body * 1.05)
    }
  })

  it('keeps the prototype shapes roughly left/right symmetric', () => {
    for (const id of ['mochi', 'flamehorn'] as const) {
      const radii = SHAPE_BY_ID.get(id)!.radii
      const n = radii.length
      // vertical-axis mirror: sample i (angle i*360/n) mirrors to sample n/2 - i
      let maxDiff = 0
      for (let i = 0; i <= n / 2; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(radii[i]! - radii[(n / 2 - i + n) % n]!))
      }
      expect(maxDiff, id).toBeLessThan(0.06)
    }
  })
})

describe('baksur engine smoke', () => {
  it('produces a non-empty body path and sane eyes for each product state', () => {
    for (const state of BAKSUR_STATES) {
      const bloub = BAKSUR_STATE_MAP[state]
      const engine = new BotEngine(100, bloub, SHAPE_BY_ID.get('mochi')!.radii, null)
      const frame = engine.sample(POSES[bloub])
      expect(frame.bodyPath, state).toMatch(/^M/)
      expect(frame.bodyPath.length, state).toBeGreaterThan(50)
      // V3.4.2 design gate: THINKING and SLEEP keep the body AND the face —
      // no collapsing to the upstream dot forms.
      expect(frame.eyes.length, state).toBeGreaterThan(0)
    }
  })

  it('keeps the full horned silhouette in THINKING and SLEEP', () => {
    // The body path of a V1 state must span about the same width as IDLE
    // (the vendored flamehorn is ~1.17 units of radius across at 100 scale,
    // the viewBox is 316 wide) — a collapsed dot would be a tiny fraction.
    const width = (path: string) => {
      const nums = path.match(/-?\d+(\.\d+)?/g)!.map(Number)
      const xs = nums.filter((_, i) => i % 2 === 0)
      return Math.max(...xs) - Math.min(...xs)
    }
    const idleWidth = width(new BotEngine(100, 'idle', SHAPE_BY_ID.get('flamehorn')!.radii, null).sample(POSES.idle).bodyPath)
    for (const bloub of ['thinking', 'sleep'] as const) {
      const engine = new BotEngine(100, bloub, SHAPE_BY_ID.get('flamehorn')!.radii, null)
      const frame = engine.sample(POSES[bloub])
      expect(width(frame.bodyPath), bloub).toBeGreaterThan(idleWidth * 0.8)
    }
  })

  it('gives IDLE two visible eyes and HAPPY the relaxed expression', () => {
    const idle = new BotEngine(100, 'idle', SHAPE_BY_ID.get('mochi')!.radii, null)
    expect(idle.sample(POSES.idle).eyes).toHaveLength(2)
    // HAPPY = idle body + heureux expression (small squinting eyes)
    const heureux = new BotEngine(100, 'idle', SHAPE_BY_ID.get('mochi')!.radii, null)
    heureux.setExpression(EXPRESSION_BY_ID.get('heureux') ?? null, 0)
    const happy = heureux.sample(2)
    expect(happy.eyes).toHaveLength(2)
  })

  it('is deterministic: same clock, same frame', () => {
    const a = new BotEngine(100, 'idle', SHAPE_BY_ID.get('flamehorn')!.radii, null)
    const b = new BotEngine(100, 'idle', SHAPE_BY_ID.get('flamehorn')!.radii, null)
    expect(a.sample(1.234).bodyPath).toBe(b.sample(1.234).bodyPath)
  })

  it('morphs between states without NaN in paths', () => {
    const engine = new BotEngine(100, 'idle', SHAPE_BY_ID.get('mochi')!.radii, null)
    engine.setState('wide', 0)
    const mid = engine.sample(0.2) // mid-morph
    expect(mid.bodyPath).not.toContain('NaN')
    engine.setState('sleep', 0.5)
    expect(engine.sample(0.7).bodyPath).not.toContain('NaN')
  })
})
