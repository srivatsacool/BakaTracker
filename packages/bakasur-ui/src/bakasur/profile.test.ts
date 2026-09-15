/*
 * BAKASUR-UI — Original Bakasur work (Phase 3).
 *
 * Profile contract: 64 samples, peak-normalised, near-circular but
 * genuinely un-round and asymmetric — original geometry, engine-compatible.
 */
import { describe, expect, it } from 'vitest'
import { PROFILE_SAMPLES } from '../engine/profiles'
import {
  BAKASUR_MIN_RADIUS,
  BAKASUR_RADII,
  BAKASUR_SHAPE_ID,
  BAKASUR_UNROUNDNESS
} from './profile'

describe('bakasur profile', () => {
  it('fits the radial engine contract', () => {
    expect(BAKASUR_SHAPE_ID).toBe('bakasur')
    expect(BAKASUR_RADII).toHaveLength(PROFILE_SAMPLES)
    for (const r of BAKASUR_RADII) expect(Number.isFinite(r)).toBe(true)
    expect(Math.max(...BAKASUR_RADII)).toBeCloseTo(1, 6)
  })

  it('is original geometry, not a circle', () => {
    // Upstream's idle body deviates < 0.7% from round; Bakasur must read as
    // a creature silhouette, an order of magnitude beyond that.
    expect(BAKASUR_UNROUNDNESS).toBeGreaterThan(0.03)
    // ...while staying in the near-circular regime the eye model assumes.
    expect(BAKASUR_MIN_RADIUS).toBeGreaterThanOrEqual(0.85)
  })

  it('is asymmetric (no mirror twin)', () => {
    // Mirror around the vertical axis: theta -> -theta. A symmetric profile
    // would match itself; Bakasur must not.
    const n = BAKASUR_RADII.length
    let diff = 0
    for (let i = 0; i < n; i++) diff = Math.max(diff, Math.abs(BAKASUR_RADII[i]! - BAKASUR_RADII[(n - i) % n]!))
    expect(diff).toBeGreaterThan(0.01)
  })

  it('is smooth (no spikes the 64-sample raster would turn into nubs)', () => {
    // Bound is an order below INTENTIONAL corner sharpness (upstream
    // triangle/hexagone corners step an order of magnitude more per sample
    // and render as deliberate rounded corners); anything under it
    // Catmull-Rom smooths invisibly.
    const n = BAKASUR_RADII.length
    for (let i = 0; i < n; i++) {
      const step = Math.abs(BAKASUR_RADII[i]! - BAKASUR_RADII[(i + 1) % n]!)
      expect(step).toBeLessThan(0.12)
    }
  })
})
