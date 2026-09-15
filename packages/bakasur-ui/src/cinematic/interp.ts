/*
 * BAKASUR-UI — Original Bakasur work (Phase 8).
 *
 * Deterministic track sampling + effect envelopes. Pure functions, no
 * clock, no randomness — the same (scene, t) always yields the same
 * numbers. Reuses the engine's tested `lerp`/`clamp` (import, not copy).
 */

import { clamp, lerp } from '../engine/math'
import type { EffectDef, EffectKind, SceneTrack } from './types'

function smoothstep(u: number): number {
  const x = clamp(u, 0, 1)
  return x * x * (3 - 2 * x)
}

/**
 * Sample a value track at scene-time t. Non-finite t holds the first key.
 * Empty track → 0. Single key → its value everywhere. The segment ease
 * comes from the DESTINATION key, falling back to the origin key;
 * neither means hold. Before the first key holds it, after the last
 * holds the last value.
 */
export function sampleTrack(track: SceneTrack, t: number): number {
  const keys = track.keys
  if (keys.length === 0) return 0
  const first = keys[0]!
  if (keys.length === 1 || !Number.isFinite(t) || t <= first.t) return first.v
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!
    const b = keys[i + 1]!
    if (t <= b.t) {
      const span = b.t - a.t
      if (span <= 0) return b.v
      const u = (t - a.t) / span
      const ease = b.ease ?? a.ease
      if (ease === undefined || ease === 'hold') return u < 1 ? a.v : b.v
      if (ease === 'smooth') return lerp(a.v, b.v, smoothstep(u))
      return lerp(a.v, b.v, u)
    }
  }
  return keys[keys.length - 1]!.v
}

/**
 * Sum of sine-envelope contributions of one effect kind at t.
 * Outside [at, at+dur] an effect contributes exactly 0.
 */
export function effectAt(effects: EffectDef[], kind: EffectKind, t: number): number {
  let sum = 0
  for (const e of effects) {
    if (e.kind !== kind || !Number.isFinite(t)) continue
    if (e.dur <= 0 || t < e.at || t > e.at + e.dur) continue
    sum += e.amount * Math.sin(Math.PI * ((t - e.at) / e.dur))
  }
  return sum
}

/** Structural issues for one track (finite numbers, ordered times). */
export function trackIssues(track: SceneTrack, field: string): string[] {
  const out: string[] = []
  track.keys.forEach((k, i) => {
    if (!Number.isFinite(k.t) || k.t < 0) out.push(`${field}.keys[${i}].t must be a finite number >= 0`)
    if (!Number.isFinite(k.v)) out.push(`${field}.keys[${i}].v must be finite`)
    if (i > 0 && k.t < track.keys[i - 1]!.t) out.push(`${field}.keys[${i}].t is out of order`)
    if (k.ease !== undefined && k.ease !== 'hold' && k.ease !== 'linear' && k.ease !== 'smooth') {
      out.push(`${field}.keys[${i}].ease must be hold, linear or smooth`)
    }
  })
  return out
}
