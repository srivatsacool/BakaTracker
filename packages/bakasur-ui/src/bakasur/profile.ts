/*
 * BAKASUR-UI — Original Bakasur work (Phase 3).
 *
 * Bakasur body profile: an ORGANIC, deliberately ASYMMETRIC silhouette built
 * from low-order radial harmonics with non-mirrored phases. It speaks the
 * engine's one-path radial language (PROFILE_SAMPLES samples of r(theta),
 * same convention as upstream: theta = 0 points right, grows clockwise on
 * screen because y is down), so morphing, closedPath rasterisation,
 * radiusAtAngle eye seating and the whole BotEngine apply unchanged.
 *
 * What makes it NOT a recoloured Bloub:
 * - upstream's idle body is a PERFECT CIRCLE (radial deviation under 0.7%).
 *   This profile deviates several percent, unevenly: a fuller lower-left
 *   haunch, a tucked upper-right, a faint crown lift near the top. It reads
 *   as a creature, not a ball.
 * - odd harmonics (3, 5) with unrelated phases break mirror symmetry, which
 *   no upstream customiser shape does except by accident. No horns or spikes:
 *   at 64 samples those read as soft nubs (the audited resolution limit), so
 *   Phase 3 stays smooth and lets lighting carry the identity.
 *
 * Eye safety: the profile stays near-circular (min radius >= 0.9, max
 * normalised to 1) and keeps generous margin in every direction, so the
 * engine's zero-offset path (unknown radii -> NUL decalage) is VALID here.
 * `eyefit.test.ts` proves it with the same rendered-geometry sweep upstream
 * uses for its own shapes: no eye capsule may leave the silhouette.
 */
import { PROFILE_SAMPLES } from '../engine/profiles'

/** Catalogue id for the Bakasur body. Not part of upstream ShapeId. */
export const BAKASUR_SHAPE_ID = 'bakasur' as const

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

function normalize(radii: number[], max = 1): number[] {
  const peak = Math.max(...radii)
  if (peak <= 0) return radii
  const k = max / peak
  return radii.map((r) => r * k)
}

function buildFlamehornRadii(): number[] {
  // Base pebble harmonics (mild organic body, creature unroundness)
  const base: number[] = Array.from({ length: PROFILE_SAMPLES }, (_, i) => {
    const a = (i / PROFILE_SAMPLES) * Math.PI * 2
    return 1 + 0.045 * Math.cos(2 * a) + 0.02 * Math.cos(4 * a) + 0.012 * Math.sin(a - 0.5)
  })

  // Twin horns + central flame crest
  addBump(base, 233, 10, 18, 0.17) // Left curved horn
  addBump(base, 307, 18, 10, 0.17) // Right curved horn
  addBump(base, 270, 12, 12, 0.12) // Central flame crest

  return normalize(base, 1)
}

/** Canonical Bakasur body profile: Flamehorn geometry */
export const BAKASUR_RADII: number[] = buildFlamehornRadii()

/** Minimum radius over the profile: the eye-safety margin ledger lives here. */
export const BAKASUR_MIN_RADIUS = Math.min(...BAKASUR_RADII)

/** Maximum absolute deviation from 1: how un-circle the body is. */
export const BAKASUR_UNROUNDNESS = Math.max(...BAKASUR_RADII.map((r) => Math.abs(1 - r)))

