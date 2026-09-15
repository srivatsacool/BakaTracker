/*
 * BAKASUR-UI — Original Bakasur work (Phase 5).
 *
 * Animation contact sheet for HUMAN visual QA. Same gating as the other
 * previews (BAKASUR_WRITE_PREVIEW=1):
 *
 *   BAKASUR_WRITE_PREVIEW=1 pnpm vitest run src/bakasur/animations/preview
 *
 * Writes anim-strip.svg: one representative frozen frame per intent
 * (vehicle settled, intent treatment applied), labelled with
 * intent + disposition + vehicle.
 */
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../../engine/engine'
import { POSES } from '../../engine/states'
import { BAKASUR_VOID } from '../palette'
import { renderBakasurInner } from '../render'
import { BAKASUR_ANIMATIONS, applyBakasurAnimation } from './index'

const R = 100
const OUT = 'C:\\Users\\MSI\\AppData\\Local\\Temp\\opencode\\bakasur-matrix'

const enabled = process.env.BAKASUR_WRITE_PREVIEW === '1'

describe.skipIf(!enabled)('bakasur animation contact sheet', () => {
  it('writes one settled frame per intent', () => {
    const cols = 5
    const cell = 260
    const rows = Math.ceil(BAKASUR_ANIMATIONS.length / cols)
    const w = cols * cell
    const h = rows * cell
    let s =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
      `viewBox="0 0 ${w} ${h}" role="img" aria-label="Bakasur animation strip">` +
      `<rect width="${w}" height="${h}" fill="${BAKASUR_VOID}"/>`
    BAKASUR_ANIMATIONS.forEach((def, i) => {
      const e = new BotEngine(R, 'idle', null, null)
      applyBakasurAnimation(e, def, 0)
      // Settled vehicle, but swirl rings fade by 1.22s — sample mid-bouquet.
      const t = def.vehicle === 'swirl' ? 0.5 : Math.max(POSES[def.vehicle], 1.2)
      const inner = renderBakasurInner(e.sample(t), {
        size: 220,
        uid: `anim-${def.intent}`,
        treatment: def.treatment
      })
      const x = (i % cols) * cell
      const y = Math.floor(i / cols) * cell
      const c = cell / 2
      s += `<g transform="translate(${x + c},${y + c - 12})">${inner}</g>`
      s +=
        `<text x="${x + c}" y="${y + cell - 28}" text-anchor="middle" ` +
        `font-family="system-ui,sans-serif" font-size="15" fill="#ece6fb">${def.intent}</text>`
      s +=
        `<text x="${x + c}" y="${y + cell - 10}" text-anchor="middle" ` +
        `font-family="system-ui,sans-serif" font-size="12" fill="#a79fc4">${def.disposition} / ${def.vehicle}</text>`
    })
    s += '</svg>'
    writeFileSync(`${OUT}\\anim-strip.svg`, s, 'utf8')
    expect(s.length).toBeGreaterThan(10000)
    process.stdout.write(`\nBAKASUR anim strip in ${OUT}\n`)
  })
})
