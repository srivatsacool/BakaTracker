/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Colour override tests: the default theme is exactly Phase 5 output,
 * explicit overrides beat preset themes, and effect colours (pastille,
 * orbit rings, arcs) always follow the resolved theme. No upstream
 * bright blue (#2496e8) and no orange survive anywhere.
 */
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../../engine/engine'
import { POSES } from '../../engine/states'
import {
  BAKASUR_BODY_BASE,
  BAKASUR_EYE_GLOW,
  BAKASUR_INNER_LIGHT,
  BAKASUR_PASTILLE,
  BAKASUR_RIM,
  BAKASUR_VOID
} from '../palette'
import { renderBakasurSvg } from '../render'
import { applyBakasurAnimation, resolveBakasurAnimation } from '../animations/index'
import { BAKASUR_THEMES, resolveBakasurTheme } from './colours'
import type { BakasurThemeId } from './types'
import { applyResolvedPreset, resolvePresetDef } from './validate'
import { getBakasurPreset } from './catalogue'

const R = 100
const UPSTREAM_BLUE = '#2496e8'
const ORANGE_BLOCKLIST = ['#ff7a00', '#f97316', '#fb923c', '#ea580c', '#ff5a00', '#ffa500']

function themedFrame(presetId: string, theme: string, t: number) {
  const def = getBakasurPreset(presetId)!
  const resolved = resolvePresetDef(def, { theme })
  const e = new BotEngine(R, 'idle', null, null)
  applyResolvedPreset(e, resolved, 0)
  return { resolved, frame: e.sample(t) }
}

function svgOf(presetId: string, theme: string, t: number, uid: string): string {
  const { resolved, frame } = themedFrame(presetId, theme, t)
  const colours = resolveBakasurTheme(resolved.theme)
  return renderBakasurSvg(frame, { size: 160, uid, treatment: resolved.treatment, colours })
}

describe('bakasur colour themes', () => {
  it('void-violet is exactly the Phase 5 palette', () => {
    const v = BAKASUR_THEMES['void-violet']!
    expect(v.body).toBe(BAKASUR_BODY_BASE)
    expect(v.void).toBe(BAKASUR_VOID)
    expect(v.innerLight).toBe(BAKASUR_INNER_LIGHT)
    expect(v.rim).toBe(BAKASUR_RIM)
    expect(v.eyes).toBe(BAKASUR_EYE_GLOW)
    expect(v.pastille).toBe(BAKASUR_PASTILLE)
  })

  it('a void-violet themed render is byte-identical to the unthemed Phase 5 render', () => {
    for (const intent of ['idle', 'notify', 'orbit', 'sleep', 'alert'] as const) {
      const def = resolveBakasurAnimation(intent)
      const e = new BotEngine(R, 'idle', null, null)
      applyBakasurAnimation(e, def, 0)
      const t = def.vehicle === 'swirl' ? 0.5 : Math.max(POSES[def.vehicle], 1.2)
      const frame = e.sample(t)
      const plain = renderBakasurSvg(frame, { size: 160, uid: `p-${intent}`, treatment: def.treatment })
      const themed = renderBakasurSvg(frame, {
        size: 160,
        uid: `p-${intent}`,
        treatment: def.treatment,
        colours: resolveBakasurTheme('void-violet')
      })
      expect(themed, intent).toBe(plain)
    }
  })

  it('explicit colour beats the preset theme', () => {
    // bakasur-alert ships ember-violet; an explicit moonlit wins.
    const ember = svgOf('bakasur-alert', 'ember-violet', 1.5, 'c-ember')
    const moon = svgOf('bakasur-alert', 'moonlit', 1.5, 'c-moon')
    expect(ember).toContain(BAKASUR_THEMES['ember-violet']!.rim)
    expect(ember).not.toContain(BAKASUR_THEMES['moonlit']!.rim)
    expect(moon).toContain(BAKASUR_THEMES['moonlit']!.rim)
    expect(moon).not.toContain(BAKASUR_THEMES['ember-violet']!.rim)
    expect(moon).not.toBe(ember)
  })

  it('the notification pastille follows the resolved theme', () => {
    const violet = svgOf('bakasur-notify', 'void-violet', 1.5, 'c-nv')
    expect(violet).toContain(`fill="${BAKASUR_PASTILLE}"`)
    const emberHex = BAKASUR_THEMES['ember-violet']!.pastille
    const ember = svgOf('bakasur-notify', 'ember-violet', 1.5, 'c-ne')
    expect(ember).toContain(`fill="${emberHex}"`)
    expect(ember).not.toContain(`fill="${BAKASUR_PASTILLE}"`)
  })

  it('orbit rings follow the resolved theme', () => {
    const moonHex = BAKASUR_THEMES['moonlit']!
    const svg = svgOf('bakasur-orbit', 'moonlit', 0.5, 'c-om')
    const stops = [...svg.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1]!.toLowerCase())
    expect(stops.length).toBeGreaterThan(0)
    expect(stops).toContain(moonHex.rim.toLowerCase())
    expect(stops).not.toContain(BAKASUR_RIM.toLowerCase())
  })

  it('no upstream blue or orange in any theme or any themed render', () => {
    const themes = Object.values(BAKASUR_THEMES)
    expect(themes).toHaveLength(5)
    for (const t of themes) {
      const hexes = [t.body, t.void, t.innerLight, t.rim, t.eyes, t.pastille].map((h) => h.toLowerCase())
      expect(hexes, `${t.id} blue`).not.toContain(UPSTREAM_BLUE)
      for (const o of ORANGE_BLOCKLIST) expect(hexes, `${t.id} orange`).not.toContain(o)
    }
    const ids: BakasurThemeId[] = ['void-violet', 'deep-indigo', 'moonlit', 'ember-violet', 'spectral']
    for (const theme of ids) {
      for (const preset of ['bakasur-idle', 'bakasur-notify', 'bakasur-orbit', 'bakasur-burst']) {
        const svg = svgOf(preset, theme, preset === 'bakasur-orbit' ? 0.5 : 1.5, `b-${theme}-${preset}`)
        expect(svg, `${theme}/${preset} blue`).not.toContain(UPSTREAM_BLUE)
        for (const o of ORANGE_BLOCKLIST) expect(svg, `${theme}/${preset} orange`).not.toContain(o)
        expect(svg, `${theme}/${preset} clean`).not.toMatch(/NaN|Infinity/)
      }
    }
  })

  it('unknown theme ids resolve to void-violet', () => {
    expect(resolveBakasurTheme('rainbow').id).toBe('void-violet')
    expect(resolveBakasurTheme(null).id).toBe('void-violet')
  })
})
