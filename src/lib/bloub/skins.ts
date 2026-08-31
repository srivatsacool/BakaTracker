/*
 * Vendored from Bloub (https://github.com/jeremy-prt/bloub) src/bot/skins.ts
 * Copyright (c) 2026 Jérémy Perret — MIT License
 * Vendored for the BakaTracker Baksur visual prototype (V3.4.1).
 * Modifications:
 *   - TRIMMED: the customiser colour palette and the 7 unused shapes are
 *     dropped (Baksur carries its own palette; fewer shapes = smaller eyefit
 *     solve table). `mixHex` dropped (no depth-fog particles in the subset).
 *   - BAKATRACKER ADDITION (clearly marked below): two original Baksur
 *     prototype shapes, `mochi` and `flamehorn`, built with the SAME
 *     analytical profile machinery (superellipse + radial bumps). They are
 *     registered in `SHAPES` so `eyefit.ts` solves their eye-offset tables
 *     exactly like any native shape.
 * See NOTICE and docs/baksur/ASSET-LICENSES.md for attribution terms.
 */
import { PROFILE_SAMPLES } from './profiles'
import { superellipseProfile } from './shape'

/**
 * A la difference des silhouettes d'animation (`profiles.ts`), celles-ci ne
 * sont PAS relevees sur la video : elles sont construites analytiquement.
 */
export type ShapeId =
  | 'cercle'
  /** BAKATRACKER ADDITION — V3.4.1 prototype direction D */
  | 'mochi'
  /** BAKATRACKER ADDITION — V3.4.1 prototype direction A */
  | 'flamehorn'

export interface BotShape {
  id: ShapeId
  radii: number[]
}

/** Ramene le rayon maximal a `max` pour que toutes les formes pesent pareil a l'oeil. */
function normalize(radii: number[], max = 1): number[] {
  const peak = Math.max(...radii)
  if (peak <= 0) return radii
  const k = max / peak
  return radii.map((r) => r * k)
}

/* ==================================================================
   BAKATRACKER ADDITION (V3.4.1) — Baksur prototype silhouettes.

   Both shapes stay inside Bloub's one-path radial model (64 samples,
   r(theta)), so the full morph/blink/gaze engine applies unchanged.
   Horns and the flame crest are RADIAL BUMPS on the outline — soft nubs
   at 64-sample resolution; docs/baksur/REPORT.md records this limit.

   Angle convention (from profiles.ts): theta = 0 points right, grows
   clockwise on screen (y is down), so straight up = 270 deg; the top
   corners of a superellipse sit at ~225/315 deg.
   ================================================================== */

/**
 * Adds one soft radial bump (a horn / crest nub) centred on `centerDeg`.
 * Cosine-squared falloff; the two half-widths can differ to fake a lean
 * (asymmetric falloff reads as curvature at this resolution).
 */
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

/** Mochi body: the same superellipse family as Bloub's `squircle`. */
const mochiBase = normalize(superellipseProfile(4.2), 1.12)

/** Horned Mochi (direction D): squircle body + two tiny stub horns. */
const mochiRadii: number[] = [...mochiBase]
addBump(mochiRadii, 224, 11, 16, 0.12) // left stub, inner side (toward 270) tighter
addBump(mochiRadii, 316, 16, 11, 0.12) // right stub, mirrored

/** Flamehorn body: a mild organic pebble (even harmonics, mirror-symmetric), peak normalised to 1. */
const flamehornBase = normalize(
  Array.from({ length: PROFILE_SAMPLES }, (_, i) => {
    const a = (i / PROFILE_SAMPLES) * Math.PI * 2
    return 1 + 0.045 * Math.cos(2 * a) + 0.02 * Math.cos(4 * a)
  }),
  1
)

/** Simplified Flamehorn (direction A): organic body + two horns + flame crest. */
const flamehornRadii: number[] = [...flamehornBase]
addBump(flamehornRadii, 233, 10, 18, 0.17) // left horn
addBump(flamehornRadii, 307, 18, 10, 0.17) // right horn
addBump(flamehornRadii, 270, 12, 12, 0.12) // central sculptural crest

export const SHAPES: BotShape[] = [
  { id: 'cercle', radii: new Array(PROFILE_SAMPLES).fill(1) },
  { id: 'mochi', radii: mochiRadii },
  { id: 'flamehorn', radii: flamehornRadii }
]

// Map indexee par `string` et non par `ShapeId` : les appelants interrogent avec
// une valeur relue d'une prop, donc non validee.
export const SHAPE_BY_ID = new Map<string, BotShape>(SHAPES.map((s) => [s.id, s]))
export const DEFAULT_SHAPE = 'cercle'
