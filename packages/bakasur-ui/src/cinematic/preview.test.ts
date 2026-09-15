/*
 * BAKASUR-UI — Original Bakasur work (Phase 8).
 *
 * Scene contact sheet for HUMAN visual QA. Same gating as the other
 * previews (BAKASUR_WRITE_PREVIEW=1):
 *
 *   BAKASUR_WRITE_PREVIEW=1 pnpm vitest run src/cinematic/preview
 *
 * Writes scene-strip.svg: 5 scenes × 5 fitted times (0/25/50/75/100%),
 * each cell the pure frozen renderer. No UI chrome, no fake art.
 */
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BAKASUR_VOID } from '../bakasur/palette'
import { renderSceneSvg } from './render'
import { listScenes } from './scenes'

const OUT = 'C:\\\\Users\\\\MSI\\\\AppData\\\\Local\\\\Temp\\\\opencode\\\\bakasur-matrix'
const enabled = process.env.BAKASUR_WRITE_PREVIEW === '1'

describe.skipIf(!enabled)('bakasur scene contact sheet', () => {
  it('writes 5 scenes × 5 times', () => {
    const cellW = 340
    const cellH = 212 + 26
    const scenes = listScenes()
    const cols = 5
    const w = cellW * cols
    const h = cellH * scenes.length
    let s =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
      `viewBox="0 0 ${w} ${h}" role="img" aria-label="Bakasur scene strip">` +
      `<rect width="${w}" height="${h}" fill="${BAKASUR_VOID}"/>`
    scenes.forEach((scene, row) => {
      for (let col = 0; col < cols; col++) {
        const t = (col / (cols - 1)) * scene.duration
        const svg = renderSceneSvg(scene, t, cellW - 8, 204, {
          uid: `strip-${scene.id}-${col}`
        })
        // Nested stage: reuse the standalone document as a cell.
        const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
        s += `<g transform="translate(${col * cellW + 4},${row * cellH})">`
        s += `<svg width="${cellW - 8}" height="204" viewBox="0 0 ${cellW - 8} 204">${inner}</svg>`
        s +=
          `<text x="${col * cellW + 4}" y="${row * cellH + 218}" ` +
          `font-family="system-ui,sans-serif" font-size="12" fill="#ece6fb">` +
          `${col === 0 ? scene.name : ''} · ${Math.round((col / 4) * 100)} %</text></g>`
      }
    })
    s += '</svg>'
    writeFileSync(`${OUT}\\\\scene-strip.svg`, s, 'utf8')
    expect(s.length).toBeGreaterThan(10000)
    process.stdout.write(`\nBAKASUR scene strip in ${OUT}\n`)
  })
})
