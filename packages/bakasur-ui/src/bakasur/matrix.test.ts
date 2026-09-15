// @vitest-environment happy-dom
/*
 * BAKASUR-UI — Original Bakasur work (Phase 3).
 *
 * Visual test matrix. Every cell samples the engine on the BAKASUR_RADII
 * body and asserts what the audience would see; the render layer is checked
 * through renderBakasurSvg (the same function the component and the preview
 * generator use) plus one mounted-component assertion.
 *
 *   A. idle      B. thinking   C. wink   D. wide/surprised   E. sleep
 *   F. body-morph animation (burst: collapse + behind-dots)
 *   G. eye/gaze movement (Look channel)
 *   H. frozenAt determinism (same t -> byte-identical frame)
 *   + desktop (320) vs small (48) size rendering
 *   + no-outline rule: idle render carries zero `stroke` attributes
 */
import { createApp, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../engine/engine'
import { EXPRESSION_BY_ID } from '../engine/expressions'
import { POSES } from '../engine/states'
import BakasurBot from '../runtime/BakasurBot.vue'
import { BAKASUR_EYE_FILL } from './eyes'
import { bodyContour, excursion, eyeCenter } from './frameHelpers'
import { BAKASUR_RADII } from './profile'
import { renderBakasurSvg } from './render'

const R = 100
const UID = 'matrix'

function engine(state: 'idle' | 'thinking' | 'wink' | 'wide' | 'sleep' | 'burst', expr = 'neutre') {
  return new BotEngine(R, state, BAKASUR_RADII, EXPRESSION_BY_ID.get(expr) ?? null)
}

describe('bakasur visual matrix', () => {
  it('A. idle: two glowing eyes inside the dark body', () => {
    const f = engine('idle').sample(POSES.idle)
    expect(f.bodyPath.length).toBeGreaterThan(100)
    expect(f.bodyAlpha).toBe(1)
    expect(f.eyes).toHaveLength(2)
    for (const eye of f.eyes) expect(eye.alpha).toBeGreaterThan(0)
    const body = bodyContour(f.bodyPath)
    for (const eye of f.eyes) expect(excursion(body, eye)).toBe(0)
  })

  it('B. thinking: body present, deterministic', () => {
    const e = engine('thinking')
    const a = e.sample(POSES.thinking)
    const b = e.sample(POSES.thinking)
    expect(a.bodyPath.length).toBeGreaterThan(100)
    expect(a).toEqual(b)
  })

  it('C. wink: asymmetric celebratory face renders', () => {
    const f = engine('wink').sample(POSES.wink)
    expect(f.eyes).toHaveLength(2)
    // The closed eye is a wider dash than the open eye (upstream geometry).
    const widths = f.eyes.map((y) => Math.abs(Number(y.d.match(/-?\d+\.?\d*/g)![0])))
    expect(widths[0]).not.toBeCloseTo(widths[1]!, 1)
  })

  it('D. wide: surprised eyes, wider than idle', () => {
    const idleHw = Math.abs(
      Number(engine('idle').sample(POSES.idle).eyes[0]!.d.match(/-?\d+\.?\d*/g)![0])
    )
    const wideHw = Math.abs(
      Number(engine('wide').sample(POSES.wide).eyes[0]!.d.match(/-?\d+\.?\d*/g)![0])
    )
    expect(wideHw).toBeGreaterThan(idleHw)
  })

  it('E. sleep: body present, deterministic', () => {
    const e = engine('sleep')
    const a = e.sample(POSES.sleep)
    expect(a.bodyPath.length).toBeGreaterThan(50)
    expect(a).toEqual(e.sample(POSES.sleep))
  })

  it('F. burst: body-morph animation with behind-body particles', () => {
    const f = engine('burst').sample(0.45)
    expect(f.dotsBehind).toBe(true)
    expect(f.dots.length).toBeGreaterThan(0)
    expect(f.bodyPath.length).toBeGreaterThan(50)
    expect(f.bodyPath).not.toMatch(/NaN/)
  })

  it('G. gaze: Look channel moves the eyes on the Bakasur body', () => {
    const e = engine('idle')
    const rest = eyeCenter(e.sample(2).eyes[0]!)
    e.setLook({ yaw: -15, pitch: 8, mix: 1, spin: 0, wander: 0 }, 2)
    const aimed = eyeCenter(e.sample(2.5).eyes[0]!)
    expect(Math.hypot(aimed.x - rest.x, aimed.y - rest.y)).toBeGreaterThan(1)
  })

  it('H. frozenAt: same instant renders byte-identical frames', () => {
    const e = engine('idle')
    const a = e.sample(1.237)
    const b = e.sample(1.237)
    expect(a.bodyPath).toBe(b.bodyPath)
    expect(a.eyes.map((y) => y.matrix)).toEqual(b.eyes.map((y) => y.matrix))
  })

  it('sizes: geometry is size-independent (48 vs 320 share the bodyPath)', () => {
    const f = engine('idle').sample(POSES.idle)
    const small = renderBakasurSvg(f, { size: 48, uid: UID })
    const large = renderBakasurSvg(f, { size: 320, uid: UID })
    expect(small).toContain('width="48"')
    expect(large).toContain('width="320"')
    expect(small).toContain(f.bodyPath)
    expect(large).toContain(f.bodyPath)
  })

  it('no outlines: idle render carries zero stroke attributes', () => {
    const f = engine('idle').sample(POSES.idle)
    const svg = renderBakasurSvg(f, { size: 160, uid: UID })
    expect(svg).not.toMatch(/stroke/)
    expect(svg).toContain(`fill="${BAKASUR_EYE_FILL}"`)
  })

  it('component: BakasurBot mounts a labelled, masked, Bakasur-filled svg', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    createApp({ render: () => h(BakasurBot, { state: 'idle', frozenAt: 1 }) }).mount(el)
    const svg = el.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('-158 -158 316 316')
    expect(svg.getAttribute('aria-label')).toBe('Bakasur')
    expect(svg.querySelector('mask')).not.toBeNull()
    const fills = [...svg.querySelectorAll('path, rect, circle')].map((n) => n.getAttribute('fill'))
    expect(fills).toContain(BAKASUR_EYE_FILL)
    expect(svg.querySelector('[stroke]')).toBeNull()
    document.body.removeChild(el)
  })
})
