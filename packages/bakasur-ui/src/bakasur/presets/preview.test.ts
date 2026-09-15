/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Preset contact sheet for HUMAN visual QA. Same gating as the other
 * previews (BAKASUR_WRITE_PREVIEW=1):
 *
 *   BAKASUR_WRITE_PREVIEW=1 pnpm vitest run src/bakasur/presets/preview
 *
 * Writes preset-strip.svg: 14 representative presets × 3 colour themes,
 * one settled frozen frame per cell, labelled with preset + theme.
 */
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../../engine/engine'
import { POSES } from '../../engine/states'
import { BAKASUR_VOID } from '../palette'
import { renderBakasurInner } from '../render'
import { BAKASUR_PRESETS } from './catalogue'
import { resolveBakasurTheme } from './colours'
import type { BakasurPresetId, BakasurThemeId } from './types'
import { applyResolvedPreset, resolvePresetDef } from './validate'

const R = 100
const OUT = 'C:\\\\Users\\\\MSI\\\\AppData\\\\Local\\\\Temp\\\\opencode\\\\bakasur-matrix'

const ROWS: BakasurPresetId[] = [
  'bakasur-idle',
  'bakasur-thinking',
  'bakasur-curious',
  'bakasur-suspicious',
  'bakasur-surprised',
  'bakasur-angry',
  'bakasur-sleepy',
  'bakasur-mischievous',
  'bakasur-unimpressed',
  'bakasur-notify',
  'bakasur-alert',
  'bakasur-orbit',
  'bakasur-comet',
  'bakasur-burst'
]
const COLS: BakasurThemeId[] = ['void-violet', 'ember-violet', 'moonlit']

const enabled = process.env.BAKASUR_WRITE_PREVIEW === '1'

describe.skipIf(!enabled)('bakasur preset contact sheet', () => {
  it('writes one settled frame per preset x theme', () => {
    const labelW = 200
    const cell = 260
    const w = labelW + COLS.length * cell
    const h = ROWS.length * cell
    let s =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
      `viewBox="0 0 ${w} ${h}" role="img" aria-label="Bakasur preset strip">` +
      `<rect width="${w}" height="${h}" fill="${BAKASUR_VOID}"/>`
    // Column headers.
    COLS.forEach((theme, j) => {
      const x = labelW + j * cell + cell / 2
      s +=
        `<text x="${x}" y="24" text-anchor="middle" ` +
        `font-family="system-ui,sans-serif" font-size="15" fill="#ece6fb">${theme}</text>`
    })
    ROWS.forEach((id, i) => {
      const def = BAKASUR_PRESETS[id]!
      const y = i * cell
      s +=
        `<text x="16" y="${y + cell / 2}" ` +
        `font-family="system-ui,sans-serif" font-size="15" fill="#ece6fb">${id.replace('bakasur-', '')}</text>`
      COLS.forEach((theme, j) => {
        const resolved = resolvePresetDef(def, { theme })
        const colours = resolveBakasurTheme(resolved.theme)
        const e = new BotEngine(R, 'idle', null, null)
        applyResolvedPreset(e, resolved, 0)
        const t = resolved.vehicle === 'swirl' ? 0.5 : Math.max(POSES[resolved.vehicle], 1.2)
        const inner = renderBakasurInner(e.sample(t), {
          size: 220,
          uid: `preset-${id}-${theme}`,
          treatment: resolved.treatment,
          colours
        })
        const x = labelW + j * cell + cell / 2
        s += `<g transform="translate(${x},${y + cell / 2 - 12})">${inner}</g>`
      })
    })
    s += '</svg>'
    writeFileSync(`${OUT}\\\\preset-strip.svg`, s, 'utf8')
    expect(s.length).toBeGreaterThan(10000)
    process.stdout.write(`\nBAKASUR preset strip in ${OUT}\n`)
  })
})
