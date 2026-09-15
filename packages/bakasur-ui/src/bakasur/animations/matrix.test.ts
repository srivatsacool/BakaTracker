// @vitest-environment happy-dom
/*
 * BAKASUR-UI — Original Bakasur work (Phase 5).
 *
 * Full-state render matrix + identity envelope + expression compatibility.
 *
 * Identity (§13 of the brief) is measured, not asserted subjectively: every
 * intent must render a body contour within 3% of its adapter shape
 * (breath/drift budget), and shape-variant intents must measurably differ
 * from the base body (the variant is really applied). All intents use
 * baseBody vehicles, so this envelope is enforceable — and enforced.
 */
import { createApp, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../../engine/engine'
import { STATE_BY_ID } from '../../engine/states'
import BakasurBot from '../../runtime/BakasurBot.vue'
import { BAKASUR_EXPRESSIONS, toBotExpression } from '../expressions/index'
import { bodyContour, excursion, eyeCenter, type Pt } from '../frameHelpers'
import { BAKASUR_PASTILLE } from '../palette'
import { BAKASUR_RADII } from '../profile'
import { BAKASUR_RENDER_COLOURS, renderBakasurSvg } from '../render'
import { BAKASUR_ANIMATIONS, applyBakasurAnimation, resolveBakasurAnimation } from './index'
import { bakasurRadii } from './shapes'

const R = 100

function centroid(pts: Pt[]): Pt {
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length
  }
}

/** Centroid-normalised max contour deviation, in viewBox units (R=100). */
function deviation(a: Pt[], b: Pt[]): number {
  const ca = centroid(a)
  const cb = centroid(b)
  let worst = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    worst = Math.max(
      worst,
      Math.hypot(a[i]!.x - ca.x - (b[i]!.x - cb.x), a[i]!.y - ca.y - (b[i]!.y - cb.y))
    )
  }
  return worst
}

function appliedFrame(intent: string, t: number) {
  const def = resolveBakasurAnimation(intent)
  const e = new BotEngine(R, 'idle', null, null)
  applyBakasurAnimation(e, def, 0)
  return { def, frame: e.sample(t) }
}

describe('bakasur animation matrix', () => {
  it('identity envelope: every intent renders its adapter shape (±3 units)', () => {
    for (const def of BAKASUR_ANIMATIONS) {
      const { frame } = appliedFrame(def.intent, 2)
      expect(frame.bodyPath.length, def.intent).toBeGreaterThan(50)
      expect(frame.bodyPath, def.intent).not.toMatch(/NaN|Infinity/)
      const ref = new BotEngine(R, def.vehicle, bakasurRadii(def.shape), null).sample(2)
      // Null face on the reference: expression does not reshape the body.
      expect(
        deviation(bodyContour(frame.bodyPath), bodyContour(ref.bodyPath)),
        `${def.intent} identity`
      ).toBeLessThan(3)
    }
  })

  it('shape variants are really applied (differ from base, match variant)', () => {
    for (const def of BAKASUR_ANIMATIONS.filter((d) => d.shape !== 'bakasur')) {
      const { frame } = appliedFrame(def.intent, 2)
      const fromBase = deviation(bodyContour(frame.bodyPath), bodyContour(
        new BotEngine(R, def.vehicle, BAKASUR_RADII, null).sample(2).bodyPath
      ))
      expect(fromBase, `${def.intent} variant applied`).toBeGreaterThan(0.3)
    }
  })

  it('all 15 intents render clean small + large, deterministic, Bakasur-only colours', () => {
    for (const def of BAKASUR_ANIMATIONS) {
      const { frame } = appliedFrame(def.intent, 1.5)
      for (const size of [48, 160]) {
        const svg = renderBakasurSvg(frame, { size, uid: `m-${def.intent}`, treatment: def.treatment })
        expect(svg, `${def.intent}@${size}`).toContain(frame.bodyPath)
        expect(svg, `${def.intent}@${size}`).not.toMatch(/NaN|Infinity/)
        expect(svg, `${def.intent} upstream blue`).not.toContain('#2496e8')
        expect(svg, `${def.intent} raw stroke`).not.toMatch(/stroke="#[0-9a-f]/)
      }
      const again = appliedFrame(def.intent, 1.5).frame
      expect(again.bodyPath, `${def.intent} frozen`).toBe(frame.bodyPath)
      // Eyes, where the vehicle shows them, stay fitted on the Bakasur body.
      if (frame.eyes.length) {
        const body = bodyContour(frame.bodyPath)
        for (const eye of frame.eyes) expect(excursion(body, eye), def.intent).toBe(0)
      }
    }
  })

  it('arc gradients use only the Bakasur ramp (no hue wheel survives)', () => {
    const allowed = new Set([
      BAKASUR_RENDER_COLOURS.rim.toLowerCase(),
      BAKASUR_RENDER_COLOURS.innerLight.toLowerCase(),
      BAKASUR_RENDER_COLOURS.eyes.toLowerCase()
    ])
    for (const def of BAKASUR_ANIMATIONS) {
      const { frame } = appliedFrame(def.intent, 1.2)
      if (!frame.arcs.length) continue
      const svg = renderBakasurSvg(frame, { size: 160, uid: `a-${def.intent}`, treatment: def.treatment })
      const stops = [...svg.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1]!.toLowerCase())
      expect(stops.length, def.intent).toBeGreaterThan(0)
      for (const s of stops) expect(allowed.has(s), `${def.intent} arc ${s}`).toBe(true)
    }
  })

  it('idle-vehicle intents honour all 18 faces; fixed-face vehicles ignore them', () => {
    const idleIntents = BAKASUR_ANIMATIONS.filter(
      (d) => STATE_BY_ID.get(d.vehicle)!.baseFace
    ).map((d) => d.intent)
    expect(idleIntents.length).toBeGreaterThan(0)
    for (const intent of idleIntents) {
      const def = resolveBakasurAnimation(intent)
      for (const face of BAKASUR_EXPRESSIONS) {
        const e = new BotEngine(R, 'idle', null, null)
        applyBakasurAnimation(e, def, 0)
        e.setExpression(toBotExpression(face), 0)
        const f = e.sample(1.5)
        expect(f.eyes, `${intent}/${face.bakasurId}`).toHaveLength(2)
        const body = bodyContour(f.bodyPath)
        for (const eye of f.eyes) expect(excursion(body, eye), `${intent}/${face.bakasurId}`).toBe(0)
      }
    }
    for (const def of BAKASUR_ANIMATIONS.filter((d) => !STATE_BY_ID.get(d.vehicle)!.baseFace)) {
      const plain = appliedFrame(def.intent, 1.5).frame
      const e = new BotEngine(R, 'idle', null, null)
      applyBakasurAnimation(e, def, 0)
      e.setExpression(toBotExpression(BAKASUR_EXPRESSIONS[5]!), 0)
      expect(e.sample(1.5).eyes[0]!.d, `${def.intent} fixed face`).toBe(plain.eyes[0]?.d)
    }
  })

  it('gaze biases distinguish alert/exclaim from wide', () => {
    const at = (intent: string) => {
      const { frame } = appliedFrame(intent, 1.5)
      return frame.eyes.map(eyeCenter)
    }
    const wide = at('wide')
    const alert = at('alert')
    const exclaim = at('exclaim')
    const shift = (a: Pt[], b: Pt[]) =>
      Math.max(...a.map((p, i) => Math.hypot(p.x - b[i]!.x, p.y - b[i]!.y)))
    // Stare (alert) and snap-up (exclaim) both move the settled gaze.
    expect(shift(alert, wide), 'alert stare').toBeGreaterThan(2)
    expect(shift(exclaim, wide), 'exclaim snap-up').toBeGreaterThan(2)
    // ...in different directions: exclaim looks up, alert does not.
    expect(exclaim[0]!.y, 'exclaim up').toBeLessThan(wide[0]!.y)
  })

  it('component: sleep dims, notify pastilles violet, override wins', () => {
    const mount = (state: 'sleep' | 'notify', expression?: string) => {
      const el = document.createElement('div')
      document.body.appendChild(el)
      createApp({ render: () => h(BakasurBot, { state, frozenAt: 1.5, expression }) }).mount(el)
      const svg = el.querySelector('svg')!
      const html = svg.innerHTML
      document.body.removeChild(el)
      return html
    }
    expect(mount('sleep')).toContain('opacity="0.35"')
    expect(mount('notify')).toContain(`fill="${BAKASUR_PASTILLE}"`)
    // Override: sleep intent (sleepy slits) + curious override renders
    // different eyes than the intent default.
    const def = mount('sleep')
    const over = mount('sleep', 'curious')
    expect(over).not.toBe(def)
  })
})
