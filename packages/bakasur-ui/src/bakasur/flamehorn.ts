/*
 * BAKASUR-UI — Flamehorn character definition extracted from BakaTracker
 * (srivatsacool/BakaTracker, commit fa7bf713a8d2568d516f34646d70fa7d5b82fc71)
 *
 * Direction A: Simplified Flamehorn.
 * Features:
 *   - Base: mild organic pebble with even harmonics (peak-normalized to 1)
 *   - Two curved horns: centered at 233 deg and 307 deg, height 0.17
 *   - Sculptural candle-flame crest: centered at 270 deg (top apex), height 0.12
 */

import { PROFILE_SAMPLES } from '../engine/profiles'

function normalize(radii: number[], max = 1): number[] {
  const peak = Math.max(...radii)
  if (peak <= 0) return radii
  const k = max / peak
  return radii.map((r) => r * k)
}

function addBump(
  radii: number[],
  centerDeg: number,
  innerDeg: number,
  outerDeg: number,
  height: number
): void {
  const n = radii.length
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360
    let d = a - centerDeg
    while (d > 180) d -= 360
    while (d < -180) d += 360
    const half = d >= 0 ? outerDeg : innerDeg
    const x = Math.abs(d) / half
    if (x >= 1) continue
    radii[i] = radii[i]! + height * Math.cos((x * Math.PI) / 2) ** 2
  }
}

/** Canonical Flamehorn base: pebble harmonics (symmetric even orders) */
const flamehornBase = normalize(
  Array.from({ length: PROFILE_SAMPLES }, (_, i) => {
    const a = (i / PROFILE_SAMPLES) * Math.PI * 2
    return 1 + 0.045 * Math.cos(2 * a) + 0.02 * Math.cos(4 * a)
  }),
  1
)

/** Full Flamehorn radial profile with dual horns and central flame crest */
export const FLAMEHORN_RADII: number[] = [...flamehornBase]
addBump(FLAMEHORN_RADII, 233, 10, 18, 0.17) // left horn
addBump(FLAMEHORN_RADII, 307, 18, 10, 0.17) // right horn
addBump(FLAMEHORN_RADII, 270, 12, 12, 0.12) // central crest

export const FLAMEHORN_SHAPE_DEF = {
  id: 'flamehorn',
  name: 'Flamehorn',
  description: 'BakaTracker canonical mascot: organic body with twin horns and flame crest.',
  radii: FLAMEHORN_RADII
} as const
