/*
 * BAKASUR-UI — Original Bakasur work (Phase 4).
 *
 * Contact-sheet generator for HUMAN visual QA. Same gating as the Phase-3
 * previews (BAKASUR_WRITE_PREVIEW=1):
 *
 *   BAKASUR_WRITE_PREVIEW=1 pnpm vitest run src/bakasur/expressions/contact
 *
 * Writes two deterministic documents to the temp dir:
 * - contact-sheet.svg: all 18 faces (idle body, frozen instant, labelled)
 * - acceptance-strip.svg: neutral/curious/suspicious/confused/surprised/
 *   annoyed/unimpressed/sleepy side by side, larger, labelled.
 */
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../../engine/engine'
import { POSES } from '../../engine/states'
import { BAKASUR_VOID } from '../palette'
import { BAKASUR_RADII } from '../profile'
import { renderBakasurInner } from '../render'
import { BAKASUR_EXPRESSIONS, toBotExpression } from './index'
import type { BakasurExpressionId } from './types'

const R = 100
const OUT = 'C:\\Users\\MSI\\AppData\\Local\\Temp\\opencode\\bakasur-matrix'

const ACCEPTANCE: BakasurExpressionId[] = [
  'neutral',
  'curious',
  'suspicious',
  'confused',
  'surprised',
  'annoyed',
  'unimpressed',
  'sleepy'
]

function cell(id: string, uid: string, cellSize: number, faceSize: number): string {
  const face = BAKASUR_EXPRESSIONS.find((e) => e.bakasurId === id)!
  const e = new BotEngine(R, 'idle', BAKASUR_RADII, toBotExpression(face))
  const inner = renderBakasurInner(e.sample(POSES.idle), { size: faceSize, uid })
  const c = cellSize / 2
  return (
    `<g transform="translate(${c},${c})">${inner}</g>` +
    `<text x="${c}" y="${cellSize - 10}" text-anchor="middle" ` +
    `font-family="system-ui,sans-serif" font-size="15" fill="#a79fc4">${id}</text>`
  )
}

function sheet(
  ids: BakasurExpressionId[],
  cols: number,
  cellSize: number,
  faceSize: number
): string {
  const rows = Math.ceil(ids.length / cols)
  const w = cols * cellSize
  const h = rows * cellSize
  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
    `viewBox="0 0 ${w} ${h}" role="img" aria-label="Bakasur expression contact sheet">` +
    `<rect width="${w}" height="${h}" fill="${BAKASUR_VOID}"/>`
  ids.forEach((id, i) => {
    const x = (i % cols) * cellSize
    const y = Math.floor(i / cols) * cellSize
    s += `<g transform="translate(${x},${y})">${cell(id, `sheet-${id}`, cellSize, faceSize)}</g>`
  })
  return s + '</svg>'
}

const enabled = process.env.BAKASUR_WRITE_PREVIEW === '1'

describe.skipIf(!enabled)('bakasur expression contact sheet', () => {
  it('writes the 18-face sheet and the acceptance strip', () => {
    const all = sheet(
      BAKASUR_EXPRESSIONS.map((e) => e.bakasurId),
      6,
      200,
      170
    )
    const strip = sheet(ACCEPTANCE, 4, 330, 300)
    writeFileSync(`${OUT}\\contact-sheet.svg`, all, 'utf8')
    writeFileSync(`${OUT}\\acceptance-strip.svg`, strip, 'utf8')
    expect(all.length).toBeGreaterThan(10000)
    expect(strip.length).toBeGreaterThan(10000)
    process.stdout.write(`\nBAKASUR sheets in ${OUT}\n`)
  })
})
