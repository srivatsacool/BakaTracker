/*
 * BAKASUR-UI — Original Bakasur work (Phase 3).
 *
 * Eyefit validity for the Bakasur body — the Phase-3 answer to §8 of the
 * brief ("rebuild the required eyefit table ... do not reuse incompatible
 * upstream eye offsets"):
 *
 * The upstream solver table (src/engine/eyefit.ts) is keyed by radii
 * REFERENCE and only knows the 8 upstream shapes; touching it would mean
 * modifying an upstream catalogue file, which Phase 3 forbids. For an
 * UNKNOWN profile the engine applies the NUL decalage (zero offset) — and
 * for a near-circular profile that is exactly the CORRECT entry: on the
 * circle both outlines coincide, so the required offset is 0,0 by
 * construction. This file proves the Bakasur profile is close enough to
 * round that zero-offset is valid, using the same rendered-geometry sweep
 * upstream trusts for its own shapes (time is swept, not just POSES —
 * gaze drift carries eyes over edges a second later).
 *
 * If a future Bakasur shape ever fails this sweep, THAT is the concrete
 * compatibility bug that justifies an engine-adjacent change (per the
 * ENGINE SAFETY clause): a bakasur-side offset table + lookup, still
 * without touching upstream files.
 */
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../engine/engine'
import { EXPRESSIONS, type BotExpression } from '../engine/expressions'
import { STATES, type StateId } from '../engine/states'
import { BAKASUR_EXPRESSIONS, toBotExpression } from './expressions/index'
import { bodyContour, excursion, eyeCenter } from './frameHelpers'
import { BAKASUR_RADII } from './profile'
import { BAKASUR_SHAPE_VARIANTS } from './animations/shapes'

const R = 100
const INSTANTS = 60
const PAS = 1 / 20

function worstExcursion(state: StateId, expr: BotExpression | null): number {
  const e = new BotEngine(R, state, BAKASUR_RADII, expr)
  let worst = 0
  for (let i = 0; i < INSTANTS; i++) {
    const f = e.sample(i * PAS)
    const body = bodyContour(f.bodyPath)
    for (const eye of f.eyes) worst = Math.max(worst, excursion(body, eye))
  }
  return worst
}

/** States whose body the Bakasur profile replaces (baseBody). */
const BASE_BODY = STATES.filter((s) => s.baseBody).map((s) => s.id)

describe('bakasur eyefit validity (zero-offset)', () => {
  it('no eye leaves the Bakasur silhouette on any base-body state x expression', () => {
    const offenders: string[] = []
    for (const state of BASE_BODY) {
      for (const expr of [null, ...EXPRESSIONS]) {
        const out = worstExcursion(state, expr)
        if (out > 0.05) offenders.push(`${state}/${expr?.id ?? 'pose'} ${out.toFixed(1)}`)
      }
    }
    expect(offenders).toEqual([])
  }, 30_000)

  it('all 18 Bakasur-native faces stay inside on every base-body state', () => {
    const offenders: string[] = []
    for (const state of BASE_BODY) {
      for (const face of BAKASUR_EXPRESSIONS) {
        const out = worstExcursion(state, toBotExpression(face))
        if (out > 0.05) offenders.push(`${state}/${face.bakasurId} ${out.toFixed(1)}`)
      }
    }
    expect(offenders).toEqual([])
  }, 30_000)

  it('shape variants hold every face on the idle vehicle (override path)', () => {
    // Sleep/thinking/play/egg/hexagon intents ride shape variants on idle,
    // and idle honours faces — including consumer overrides. Sweep them.
    const offenders: string[] = []
    for (const [shapeId, radii] of BAKASUR_SHAPE_VARIANTS) {
      if (shapeId === 'bakasur') continue
      for (const face of [null, ...BAKASUR_EXPRESSIONS.map(toBotExpression)]) {
        const e = new BotEngine(R, 'idle', radii, face)
        for (let i = 0; i < INSTANTS; i++) {
          const f = e.sample(i * PAS)
          const body = bodyContour(f.bodyPath)
          for (const eye of f.eyes) {
            const out = excursion(body, eye)
            if (out > 0.05) offenders.push(`${shapeId}/${face?.id ?? 'pose'}@${(i * PAS).toFixed(2)} ${out.toFixed(1)}`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  }, 30_000)

  it('shape morph into Bakasur is continuous and settles exactly', () => {
    const cercle = new Array(64).fill(1)
    const e = new BotEngine(R, 'idle', cercle, null)
    e.setShape(BAKASUR_RADII, 0)
    // Endpoints exact: morph starts on the circle, ends on Bakasur.
    const start = bodyContour(e.sample(0).bodyPath)
    const end = bodyContour(e.sample(0.45).bodyPath)
    const refStart = bodyContour(new BotEngine(R, 'idle', cercle, null).sample(0).bodyPath)
    const refEnd = bodyContour(new BotEngine(R, 'idle', BAKASUR_RADII, null).sample(0.45).bodyPath)
    const dist = (a: { x: number; y: number }[], b: { x: number; y: number }[]) =>
      Math.max(...a.map((p, i) => Math.hypot(p.x - b[i]!.x, p.y - b[i]!.y)))
    expect(dist(start, refStart)).toBeCloseTo(0, 6)
    expect(dist(end, refEnd)).toBeLessThan(0.5)
    // Mid-morph is genuinely between the two (interpolation, not a jump
    // cut). Sampled early: easeOutQuint front-loads the morph, so t=0.2 is
    // already ~95% arrived; t=0.05 sits at ~45% of the crossing.
    const mid = bodyContour(e.sample(0.05).bodyPath)
    expect(dist(mid, refStart)).toBeGreaterThan(0.5)
    expect(dist(mid, refEnd)).toBeGreaterThan(0.5)
    // No NaN anywhere along the morph.
    for (let i = 0; i <= 20; i++) {
      expect(e.sample((i / 20) * 0.45).bodyPath).not.toMatch(/NaN/)
    }
  })

  it('gaze moves the eyes and release returns them', () => {
    const e = new BotEngine(R, 'idle', BAKASUR_RADII, null)
    const rest = eyeCenter(e.sample(2).eyes[0]!)
    e.setLook({ yaw: 20, pitch: 10, mix: 1, spin: 0, wander: 0 }, 2)
    const aimed = eyeCenter(e.sample(2.5).eyes[0]!)
    expect(Math.hypot(aimed.x - rest.x, aimed.y - rest.y)).toBeGreaterThan(1)
    e.setLook(null, 2.5)
    const back = eyeCenter(e.sample(4).eyes[0]!)
    // Back within liveliness drift of rest (a few units), not stuck aiming.
    expect(Math.hypot(back.x - rest.x, back.y - rest.y)).toBeLessThan(12)
  })
})
