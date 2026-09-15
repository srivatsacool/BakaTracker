/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Treatment composition. Phase 5 defines the treatment shape ({ dim, glow })
 * and the per-intent values; this module is the ONLY place overlays merge:
 *
 *   explicit user override > preset overlay > animation-intent default
 *
 * The Phase 5 animation path is untouched (its treatments are already
 * complete). Ranges match the Phase 5 contract (dim 0..0.6, glow 0.5..2).
 */

import type { BakasurLookBias, BakasurTreatment } from '../animations/types'
import type { BakasurPresetTreatment } from './types'

const DIM_MIN = 0
const DIM_MAX = 0.6
const GLOW_MIN = 0.5
const GLOW_MAX = 2

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function cleanDim(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return clamp(v, DIM_MIN, DIM_MAX)
}

function cleanGlow(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return clamp(v, GLOW_MIN, GLOW_MAX)
}

function cleanLook(
  v: BakasurPresetTreatment['look'],
  root: BakasurLookBias | null
): BakasurLookBias | null {
  // Undefined = inherit the root; explicit null = release the gaze bias.
  if (v === undefined) return root
  if (v === null) return null
  if (typeof v !== 'object') return root
  const mix =
    typeof v.mix === 'number' && Number.isFinite(v.mix) ? clamp(v.mix, 0, 1) : root?.mix ?? 1
  const yaw =
    typeof v.yaw === 'number' && Number.isFinite(v.yaw) ? v.yaw : root?.yaw ?? 0
  const pitch =
    typeof v.pitch === 'number' && Number.isFinite(v.pitch) ? v.pitch : root?.pitch ?? 0
  return { yaw, pitch, mix }
}

/**
 * Merge intent default + preset overlay + explicit override into one
 * range-checked treatment. Later layers win per field; look resolves
 * against the intent's own gaze bias as the inheritance root.
 * Deterministic, side-effect free.
 */
export function mergeTreatmentWithIntent(
  intentTreatment: BakasurTreatment,
  intentLook: BakasurLookBias | null,
  overlay?: BakasurPresetTreatment | null,
  explicit?: BakasurPresetTreatment | null
): { treatment: BakasurTreatment; look: BakasurLookBias | null } {
  const dim = cleanDim(explicit?.dim ?? overlay?.dim, intentTreatment.dim)
  const glow = cleanGlow(explicit?.glow ?? overlay?.glow, intentTreatment.glow)
  const afterOverlay = cleanLook(overlay?.look, intentLook)
  const look =
    explicit?.look !== undefined ? cleanLook(explicit?.look ?? null, afterOverlay) : afterOverlay
  return { treatment: { dim, glow }, look }
}

/** Range validation for a raw overlay (unknown fields are ignored, not errors). */
export function treatmentIssues(t: BakasurPresetTreatment | null | undefined): string[] {
  if (t == null) return []
  const out: string[] = []
  if (t.dim !== undefined && (typeof t.dim !== 'number' || !Number.isFinite(t.dim) || t.dim < DIM_MIN || t.dim > DIM_MAX)) {
    out.push(`treatment.dim must be a finite number in [${DIM_MIN}, ${DIM_MAX}]`)
  }
  if (t.glow !== undefined && (typeof t.glow !== 'number' || !Number.isFinite(t.glow) || t.glow < GLOW_MIN || t.glow > GLOW_MAX)) {
    out.push(`treatment.glow must be a finite number in [${GLOW_MIN}, ${GLOW_MAX}]`)
  }
  if (t.look !== undefined && t.look !== null) {
    if (typeof t.look !== 'object') out.push('treatment.look must be an object or null')
    else if (t.look.mix !== undefined && (typeof t.look.mix !== 'number' || !Number.isFinite(t.look.mix) || t.look.mix < 0 || t.look.mix > 1)) {
      out.push('treatment.look.mix must be a finite number in [0, 1]')
    }
  }
  return out
}
