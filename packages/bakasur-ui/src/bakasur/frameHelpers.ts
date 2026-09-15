/*
 * BAKASUR-UI — test support (NOT shipped logic; no non-test importer).
 *
 * Rendered-geometry helpers in the tradition of src/engine/skins.test.ts:
 * everything is measured on the OUTPUT (bodyPath string, eye matrices), so
 * the tests verify what the eye sees regardless of engine internals.
 */
import type { RenderedEye } from '../engine/engine'

export interface Pt {
  x: number
  y: number
}

/**
 * Body contour, read off the bodyPath. closedPath emits `M x y` then one `C`
 * per point, so the curve points are the 3rd pair of each C.
 */
export function bodyContour(d: string): Pt[] {
  const pts: Pt[] = []
  for (const seg of d.slice(1).split('C')) {
    const n = seg.match(/-?\d+\.?\d*/g)?.map(Number) ?? []
    if (n.length >= 6) pts.push({ x: n[4]!, y: n[5]! })
    else if (n.length === 2) pts.push({ x: n[0]!, y: n[1]! })
  }
  return pts
}

/** Point-in-polygon by ray casting. */
export function inside(poly: Pt[], x: number, y: number): boolean {
  let on = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!
    const b = poly[j]!
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) on = !on
  }
  return on
}

/** Capsule outline in screen coordinates: stadium sampled, passed through the rendered matrix. */
export function eyeOutline(eye: RenderedEye, N = 32): Pt[] {
  const g = eye.d.match(/-?\d+\.?\d*/g)!.map(Number)
  const hw = Math.abs(g[0]!)
  const r = Math.abs(g[2]!)
  const half = Math.abs(g[1]!)
  const m = eye.matrix.match(/-?\d+\.?\d*/g)!.map(Number)
  const [a, b, c, d, e, f] = m as [number, number, number, number, number, number]
  const out: Pt[] = []
  for (let i = 0; i < N; i++) {
    const u = (i / N) * 4
    let x: number
    let y: number
    if (u < 1) {
      const t = Math.PI * (u - 0.5)
      x = Math.cos(t) * r
      y = -half + Math.sin(t) * r
    } else if (u < 2) {
      x = hw
      y = -half + (u - 1) * 2 * half
    } else if (u < 3) {
      const t = Math.PI * (u - 2 + 0.5)
      x = Math.cos(t) * r
      y = half + Math.sin(t) * r
    } else {
      x = -hw
      y = half - (u - 3) * 2 * half
    }
    out.push({ x: a * x + c * y + e, y: b * x + d * y + f })
  }
  return out
}

/** Eye centre in viewBox units: the translation of the rendered matrix. */
export function eyeCenter(eye: RenderedEye): Pt {
  const m = eye.matrix.match(/-?\d+\.?\d*/g)!.map(Number)
  return { x: m[4]!, y: m[5]! }
}

/** Worst capsule excursion outside the body contour (0 = fully inside). */
export function excursion(body: Pt[], eye: RenderedEye): number {
  let worst = 0
  for (const p of eyeOutline(eye)) {
    if (inside(body, p.x, p.y)) continue
    worst = Math.max(worst, Math.min(...body.map((q) => Math.hypot(q.x - p.x, q.y - p.y))))
  }
  return worst
}
