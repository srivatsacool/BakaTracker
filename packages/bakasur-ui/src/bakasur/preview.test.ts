/*
 * BAKASUR-UI — Original Bakasur work (Phase 3).
 *
 * Preview generator for HUMAN visual inspection. Gated behind
 * BAKASUR_WRITE_PREVIEW=1 so normal runs stay pure:
 *
 *   BAKASUR_WRITE_PREVIEW=1 pnpm vitest run src/bakasur/preview
 *
 * Writes standalone deterministic SVGs (frozen instants, void background)
 * to the temp dir printed on success. The suite passes trivially without
 * the env var; with it, it asserts every file was written and non-empty.
 */
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../engine/engine'
import { EXPRESSION_BY_ID } from '../engine/expressions'
import { POSES, type StateId } from '../engine/states'
import { BAKASUR_VOID } from './palette'
import { BAKASUR_RADII } from './profile'
import { renderBakasurSvg } from './render'

const R = 100
const OUT = 'C:\\Users\\MSI\\AppData\\Local\\Temp\\opencode\\bakasur-matrix'

const CELLS: ReadonlyArray<readonly [name: string, state: StateId, at: number, size: number]> = [
  ['a-idle-320', 'idle', POSES.idle, 320],
  ['b-thinking-320', 'thinking', POSES.thinking, 320],
  ['c-wink-320', 'wink', POSES.wink, 320],
  ['d-wide-320', 'wide', POSES.wide, 320],
  ['e-sleep-320', 'sleep', POSES.sleep, 320],
  ['f-burst-320', 'burst', 0.45, 320],
  ['g-orbit-320', 'orbit', POSES.orbit, 320],
  ['h-idle-48', 'idle', POSES.idle, 48]
]

const enabled = process.env.BAKASUR_WRITE_PREVIEW === '1'

describe.skipIf(!enabled)('bakasur preview matrix', () => {
  it('writes one deterministic SVG per matrix cell', () => {
    const written: string[] = []
    for (const [name, state, at, size] of CELLS) {
      const e = new BotEngine(R, state, BAKASUR_RADII, EXPRESSION_BY_ID.get('neutre') ?? null)
      const svg = renderBakasurSvg(e.sample(at), { size, uid: name, background: BAKASUR_VOID })
      const path = `${OUT}\\${name}.svg`
      writeFileSync(path, svg, 'utf8')
      written.push(path)
      expect(svg.length).toBeGreaterThan(1000)
    }
    process.stdout.write(`\nBAKASUR previews: ${written.length} files in ${OUT}\n`)
  })
})
