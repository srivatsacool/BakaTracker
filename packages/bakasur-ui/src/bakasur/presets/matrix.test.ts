/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Combination matrix: 18 expressions × 15 animations × 5 themes × 3 shapes
 * (4050 combos) resolve without undefined fields, NaN/Infinity, invalid
 * references or out-of-range treatments — plus a small render smoke proving
 * representative combos draw clean eyes inside the silhouette.
 */
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../../engine/engine'
import { STATE_BY_ID } from '../../engine/states'
import { BAKASUR_ANIMATIONS } from '../animations/index'
import { BAKASUR_EXPRESSIONS } from '../expressions/index'
import { BAKASUR_COMPATIBLE_EXPRESSIONS } from '../eyes'
import { bodyContour, excursion } from '../frameHelpers'
import { BAKASUR_SHAPE_VARIANTS } from '../animations/shapes'
import { renderBakasurSvg } from '../render'
import { BAKASUR_THEME_IDS, resolveBakasurTheme } from './colours'
import { applyResolvedPreset, resolveBakasurPreset, validateBakasurPreset } from './validate'

const R = 100
const SHAPE_IDS = [...BAKASUR_SHAPE_VARIANTS.keys()]
const EXPRESSION_IDS = [...BAKASUR_COMPATIBLE_EXPRESSIONS, null] as const

describe('bakasur combination matrix', () => {
  it('4050 expression x animation x theme x shape combos resolve clean', () => {
    let count = 0
    const offenders: string[] = []
    for (const face of BAKASUR_EXPRESSIONS) {
      for (const anim of BAKASUR_ANIMATIONS) {
        for (const theme of BAKASUR_THEME_IDS) {
          for (const shape of SHAPE_IDS) {
            count++
            const r = resolveBakasurPreset({
              animation: anim.intent,
              expression: face.bakasurId,
              theme,
              shape
            })
            if (r.animation !== anim.intent) offenders.push(`${face.bakasurId}/${anim.intent}: animation`)
            if (!STATE_BY_ID.has(r.vehicle)) offenders.push(`${face.bakasurId}/${anim.intent}: vehicle`)
            if (r.theme !== theme) offenders.push(`${face.bakasurId}/${anim.intent}: theme`)
            if (r.shape !== shape) offenders.push(`${face.bakasurId}/${anim.intent}: shape`)
            if (!(r.treatment.dim >= 0 && r.treatment.dim <= 0.6)) offenders.push(`${face.bakasurId}/${anim.intent}: dim`)
            if (!(r.treatment.glow >= 0.5 && r.treatment.glow <= 2)) offenders.push(`${face.bakasurId}/${anim.intent}: glow`)
            if (r.timeline.steps.length === 0) offenders.push(`${face.bakasurId}/${anim.intent}: timeline`)
            const json = JSON.stringify(r)
            if (/NaN|Infinity/.test(json) || json.includes('undefined')) {
              offenders.push(`${face.bakasurId}/${anim.intent}/${theme}/${shape}: dirty value`)
            }
          }
        }
      }
    }
    expect(count).toBe(18 * 15 * 5 * 3)
    expect(offenders).toEqual([])
  }, 30_000)

  it('validation accepts honouring combos and rejects fixed-face faces', () => {
    // Idle/swirl vehicles honour faces: all 18 pass validation there.
    const honouring = BAKASUR_ANIMATIONS.filter((a) => STATE_BY_ID.get(a.vehicle)?.baseFace)
    expect(honouring.length).toBeGreaterThan(0)
    for (const anim of honouring) {
      for (const face of BAKASUR_COMPATIBLE_EXPRESSIONS) {
        const v = validateBakasurPreset({ animation: anim.intent, expression: face })
        expect(v.ok, `${anim.intent}/${face}`).toBe(true)
      }
    }
    // Fixed-face vehicles reject faces with the explicit incompatibility code.
    const fixed = BAKASUR_ANIMATIONS.filter((a) => !STATE_BY_ID.get(a.vehicle)?.baseFace)
    expect(fixed.length).toBeGreaterThan(0)
    for (const anim of fixed) {
      const v = validateBakasurPreset({ animation: anim.intent, expression: 'happy' })
      expect(v.ok, `${anim.intent}/happy`).toBe(false)
      expect(v.issues.map((i) => i.code)).toContain('expression-ignored')
    }
  })

  it('render smoke: representative combos draw clean, eyes inside the body', () => {
    const combos: Array<[string, string, string]> = [
      ['idle', 'neutral', 'void-violet'],
      ['thinking', 'curious', 'moonlit'],
      ['sleep', 'sleepy', 'spectral'],
      ['notify', 'neutral', 'ember-violet'],
      ['alert', 'neutral', 'ember-violet'],
      ['orbit', 'excited', 'void-violet'],
      ['burst', 'neutral', 'ember-violet'],
      ['comet', 'surprised', 'moonlit']
    ]
    for (const [animation, expression, theme] of combos) {
      const r = resolveBakasurPreset({ animation, expression, theme })
      const e = new BotEngine(R, 'idle', null, null)
      applyResolvedPreset(e, r, 0)
      const frame = e.sample(1.5)
      const svg = renderBakasurSvg(frame, {
        size: 160,
        uid: `smoke-${animation}`,
        treatment: r.treatment,
        colours: resolveBakasurTheme(r.theme)
      })
      expect(svg, `${animation} clean`).not.toMatch(/NaN|Infinity/)
      expect(svg, `${animation} blue`).not.toContain('#2496e8')
      if (frame.eyes.length) {
        const body = bodyContour(frame.bodyPath)
        for (const eye of frame.eyes) expect(excursion(body, eye), `${animation}/${expression}`).toBe(0)
      }
    }
  })

  it('null/undefined expression axes also resolve (19 x 15 x 5 x 3)', () => {
    let count = 0
    for (const expression of EXPRESSION_IDS) {
      for (const anim of BAKASUR_ANIMATIONS) {
        for (const theme of BAKASUR_THEME_IDS) {
          for (const shape of SHAPE_IDS) {
            count++
            const r = resolveBakasurPreset({ animation: anim.intent, expression, theme, shape })
            expect(r.animation).toBe(anim.intent)
          }
        }
      }
    }
    expect(count).toBe(19 * 15 * 5 * 3)
  }, 30_000)
})
