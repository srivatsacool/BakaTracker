/*
 * BAKASUR-UI — Original Bakasur work (Phase 4).
 *
 * Catalogue contract + distinction + determinism + resolution tests.
 * Geometry validity on the body (clipping sweep) lives in eyefit.test.ts;
 * this file locks the DATA contract and the viewer-facing differences.
 */
import { describe, expect, it } from 'vitest'
import { BotEngine } from '../../engine/engine'
import { EXPRESSIONS, type ExpressionId } from '../../engine/expressions'
import { POSES } from '../../engine/states'
import { BAKASUR_COMPATIBLE_EXPRESSIONS } from '../eyes'
import { bodyContour } from '../frameHelpers'
import { BAKASUR_RADII } from '../profile'
import { renderBakasurSvg } from '../render'
import {
  BAKASUR_EXPRESSIONS,
  UPSTREAM_COVERAGE,
  bakasurForUpstream,
  resolveBakasurExpression,
  toBotExpression
} from './index'
import type { BakasurExpression, BakasurExpressionId } from './types'

const R = 100

/** Acceptance set: must read distinctly WITHOUT labels (brief §QA). */
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

/** Viewer-space distance between two faces (eye geometry + gaze + split). */
function faceDistance(a: BakasurExpression, b: BakasurExpression): number {
  let d = 0
  for (let i = 0; i < 2; i++) {
    const ea = a.eyes[i]!
    const eb = b.eyes[i]!
    d += Math.abs(ea.w - eb.w) + Math.abs(ea.h - eb.h)
    d += Math.abs((ea.tilt ?? 0) - (eb.tilt ?? 0)) * 0.01
    d += Math.abs(ea.open - eb.open) * 0.5
  }
  d += Math.abs(a.split - b.split) * 0.05
  d +=
    (Math.abs(a.gaze.yaw - b.gaze.yaw) +
      Math.abs(a.gaze.pitch - b.gaze.pitch) +
      Math.abs(a.gaze.roll - b.gaze.roll)) *
    0.02
  return d
}

describe('bakasur expression catalogue', () => {
  it('exposes 18 native faces with unique ids', () => {
    expect(BAKASUR_EXPRESSIONS).toHaveLength(18)
    expect(new Set(BAKASUR_EXPRESSIONS.map((e) => e.bakasurId)).size).toBe(18)
    expect([...BAKASUR_COMPATIBLE_EXPRESSIONS].sort()).toEqual(
      [...BAKASUR_EXPRESSIONS.map((e) => e.bakasurId)].sort()
    )
  })

  it('every alias is a real upstream id (compat labels stay valid)', () => {
    const upstream = new Set(EXPRESSIONS.map((e) => e.id))
    for (const e of BAKASUR_EXPRESSIONS) {
      expect(upstream.has(e.aliasId), `${e.bakasurId} alias ${e.aliasId}`).toBe(true)
    }
  })

  it('tilts only eyes elongated enough to show it (upstream rule, mirrored)', () => {
    for (const e of BAKASUR_EXPRESSIONS) {
      for (const eye of e.eyes) {
        const tilt = Math.abs(eye.tilt ?? 0)
        if (tilt < 1) continue
        const ratio = eye.w / eye.h
        const band = tilt >= 20 ? [0.6, 1.7] : [0.8, 1.25]
        expect(
          ratio < band[0]! || ratio > band[1]!,
          `${e.bakasurId}: ratio ${ratio.toFixed(2)} hides a ${tilt}deg tilt`
        ).toBe(true)
      }
    }
  })

  it('stays inside the engine envelope (gaze, split, size, openness)', () => {
    for (const e of BAKASUR_EXPRESSIONS) {
      expect(Math.abs(e.gaze.yaw), `${e.bakasurId} yaw`).toBeLessThanOrEqual(22)
      expect(Math.abs(e.gaze.pitch), `${e.bakasurId} pitch`).toBeLessThanOrEqual(20)
      expect(Math.abs(e.gaze.roll), `${e.bakasurId} roll`).toBeLessThanOrEqual(15)
      expect(e.split, `${e.bakasurId} split`).toBeGreaterThanOrEqual(14)
      expect(e.split, `${e.bakasurId} split`).toBeLessThanOrEqual(21)
      for (const eye of e.eyes) {
        expect(eye.w, `${e.bakasurId} w`).toBeGreaterThan(0.1)
        expect(eye.w, `${e.bakasurId} w`).toBeLessThan(0.5)
        expect(eye.h, `${e.bakasurId} h`).toBeGreaterThan(0.08)
        expect(eye.h, `${e.bakasurId} h`).toBeLessThan(0.65)
        expect(eye.open, `${e.bakasurId} open`).toBeGreaterThan(0)
        expect(eye.open, `${e.bakasurId} open`).toBeLessThanOrEqual(1)
      }
      expect(e.meta.intensity, `${e.bakasurId} intensity`).toBeGreaterThanOrEqual(0)
      expect(e.meta.intensity, `${e.bakasurId} intensity`).toBeLessThanOrEqual(1)
      expect(e.meta.mood.length, `${e.bakasurId} mood`).toBeGreaterThan(0)
      expect(e.meta.followSafe, `${e.bakasurId} followSafe`).toBe(e.gaze.roll === 0)
    }
  })

  it('acceptance set reads distinctly without labels', () => {
    const faces = ACCEPTANCE.map((id) => BAKASUR_EXPRESSIONS.find((e) => e.bakasurId === id)!)
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        const d = faceDistance(faces[i]!, faces[j]!)
        expect(d, `${faces[i]!.bakasurId} vs ${faces[j]!.bakasurId}`).toBeGreaterThan(0.15)
      }
    }
  })

  it('every face renders two contained eyes and freezes deterministically', () => {
    for (const e of BAKASUR_EXPRESSIONS) {
      const engine = new BotEngine(R, 'idle', BAKASUR_RADII, toBotExpression(e))
      const a = engine.sample(POSES.idle)
      expect(a.eyes, e.bakasurId).toHaveLength(2)
      expect(engine.sample(POSES.idle).bodyPath, `${e.bakasurId} frozen`).toBe(a.bodyPath)
      // Small-size render: same geometry, valid document, no NaN.
      const svg = renderBakasurSvg(a, { size: 48, uid: e.bakasurId })
      expect(svg, e.bakasurId).toContain(a.bodyPath)
      expect(svg, e.bakasurId).not.toMatch(/NaN/)
    }
  })

  it('expression morphs glide (neutral to surprised) and stay pure in time', () => {
    const from = toBotExpression(BAKASUR_EXPRESSIONS.find((e) => e.bakasurId === 'neutral')!)
    const to = toBotExpression(BAKASUR_EXPRESSIONS.find((e) => e.bakasurId === 'surprised')!)
    const e = new BotEngine(R, 'idle', BAKASUR_RADII, from)
    e.setExpression(to, 1)
    const early = e.sample(1.02).eyes[0]!.d
    const settled = new BotEngine(R, 'idle', BAKASUR_RADII, to).sample(1).eyes[0]!.d
    expect(early).not.toBe(settled)
    expect(e.sample(1 + BotEngine.SHAPE_MORPH + 0.05).eyes[0]!.d).toBe(settled)
    const mid = e.sample(1.12).eyes[0]!.matrix
    e.sample(3)
    expect(e.sample(1.12).eyes[0]!.matrix).toBe(mid)
    for (const t of [1, 1.12, 1.5]) {
      expect(e.sample(t).bodyPath).not.toMatch(/NaN|Infinity/)
    }
  })

  it('resolution: native first, upstream compat second, null otherwise', () => {
    const sus = resolveBakasurExpression('suspicious')!
    expect(sus.id).toBe('mefiant')
    expect(sus.split).toBe(15.5)
    // Upstream ids still resolve (existing timelines keep working).
    expect(resolveBakasurExpression('colere')!.split).toBe(17)
    expect(resolveBakasurExpression('nope')).toBeNull()
    expect(resolveBakasurExpression(null)).toBeNull()
    // Resolved copies never alias catalogue objects.
    expect(resolveBakasurExpression('neutral')).not.toBe(resolveBakasurExpression('neutral'))
  })

  it('upstream coverage: all 16 upstream ids map to a Bakasur face', () => {
    const covered = new Set<ExpressionId>()
    for (const [up, bak] of UPSTREAM_COVERAGE) {
      covered.add(up)
      expect(bakasurForUpstream(up).bakasurId).toBe(bak)
    }
    expect(covered.size).toBe(16)
    // Mapped faces actually render on the Bakasur body.
    for (const [, bak] of UPSTREAM_COVERAGE) {
      const face = BAKASUR_EXPRESSIONS.find((e) => e.bakasurId === bak)!
      const f = new BotEngine(R, 'idle', BAKASUR_RADII, toBotExpression(face)).sample(POSES.idle)
      expect(f.eyes).toHaveLength(2)
      expect(bodyContour(f.bodyPath).length).toBeGreaterThan(32)
    }
  })
})
