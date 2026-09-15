/*
 * BAKASUR-UI — Original Bakasur work (Phase 3).
 *
 * Single SVG renderer for Bakasur: ONE function turns a BotFrame into SVG,
 * used by BOTH the live component (inner content via v-html) and the
 * deterministic preview/matrix generator (standalone document). One render
 * path means previews prove what ships.
 *
 * Render order (same depth contract as upstream):
 *   aura+rim bloom (filtered body copy) -> back arcs -> behind-dots ->
 *   eye-glow backing -> masked body (base + inner key light) ->
 *   front dots -> notification pastille -> front arcs.
 *
 * Hard rules:
 * - NO `stroke` on body, backing, dots or pastille. Rim presence comes only
 *   from the soft bloom filter. (Orbit ribbons keep their engine-specified
 *   stroke: they are animation output, not an outline.)
 * - Geometry comes from the frame untouched: no re-scaling, no nudging.
 * - Colours come from palette.ts + lighting.ts, never from upstream skins.
 */
import { type DotRender } from '../engine/decor'
import type { BotFrame } from '../engine/engine'
import { r2 } from '../engine/math'
import { DEMI_VIEWBOX, RAYON } from '../engine/repere'
import { mixHex } from '../engine/skins'
import type { BakasurTreatment } from './animations/types'
import { BAKASUR_LIGHTING } from './lighting'
import {
  BAKASUR_BODY_BASE,
  BAKASUR_EYE_GLOW,
  BAKASUR_INNER_LIGHT,
  BAKASUR_PASTILLE,
  BAKASUR_RIM,
  BAKASUR_VOID
} from './palette'

/**
 * Bakasur arc ramp: engine arcs arrive with hue-wheel (rainbow) gradients.
 * The Bakasur renderer resamples them onto the theme ramp — same stop
 * count, Bakasur colours. Deterministic, no upstream hue survives.
 */
function arcRamp(colours: BakasurRenderColours): [string, string, string] {
  return [colours.rim, colours.innerLight, colours.eyes]
}

function arcStops(count: number, colours: BakasurRenderColours): string[] {
  const ramp = arcRamp(colours)
  if (count <= 1) return [ramp[0]!]
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const pos = (i / (count - 1)) * (ramp.length - 1)
    const lo = Math.floor(pos)
    const hi = Math.min(ramp.length - 1, lo + 1)
    out.push(lo === hi ? ramp[lo]! : mixHex(ramp[lo]!, ramp[hi]!, pos - lo))
  }
  return out
}

/**
 * Theme colour surface for one render. Field names match the Phase 6
 * BakasurColourTheme structurally, so a resolved theme passes straight
 * through. Omitted = Phase 5 constants (byte-identical output).
 */
export interface BakasurRenderColours {
  body: string
  void: string
  innerLight: string
  rim: string
  eyes: string
  pastille: string
}

/** Phase 5 output, exactly: the default when no theme is supplied. */
export const BAKASUR_RENDER_COLOURS: BakasurRenderColours = {
  body: BAKASUR_BODY_BASE,
  void: BAKASUR_VOID,
  innerLight: BAKASUR_INNER_LIGHT,
  rim: BAKASUR_RIM,
  eyes: BAKASUR_EYE_GLOW,
  pastille: BAKASUR_PASTILLE
}

export interface BakasurRenderOpts {
  /** Rendered box size in px (geometry itself is size-independent). */
  size: number
  /** Per-instance id prefix (mask/gradient/filter ids). Deterministic. */
  uid: string
  /** Standalone-document background. Undefined = transparent. */
  background?: string
  /** Per-intent treatment from the animation adapter. Defaults: calm. */
  treatment?: BakasurTreatment
  /** Theme colour surface. Undefined = Phase 5 constants. */
  colours?: BakasurRenderColours
}

const R = RAYON
const VB = DEMI_VIEWBOX

function dotFill(dot: DotRender, colours: BakasurRenderColours): string {
  if (dot.color) return dot.color
  if (dot.depth === undefined) return colours.body
  return mixHex(colours.void, colours.body, dot.depth)
}

function renderDot(dot: DotRender, key: string, colours: BakasurRenderColours): string {
  const fill = dotFill(dot, colours)
  if (dot.d) {
    return `<path d="${dot.d}" transform="translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})" fill="${fill}" opacity="${dot.opacity}" key="${key}"/>`
  }
  return `<circle cx="${dot.x}" cy="${dot.y}" r="${dot.r}" fill="${fill}" opacity="${dot.opacity}" key="${key}"/>`
}

/** defs + scene content, WITHOUT the outer svg element (for v-html). */
export function renderBakasurInner(frame: BotFrame, opts: BakasurRenderOpts): string {
  const L = BAKASUR_LIGHTING
  const C = opts.colours ?? BAKASUR_RENDER_COLOURS
  const dim = opts.treatment?.dim ?? 0
  const glow = opts.treatment?.glow ?? 1
  const maskId = `bakasur-mask-${opts.uid}`
  const keyId = `bakasur-key-${opts.uid}`
  const shadowBlurId = `bakasur-depth-shadow-${opts.uid}`
  const sheenBlurId = `bakasur-depth-sheen-${opts.uid}`
  const grainPatId = `bakasur-grain-pat-${opts.uid}`
  const grainFiltId = `bakasur-grain-filt-${opts.uid}`
  const rimId = `bakasur-rim-${opts.uid}`

  let s = '<defs>'
  s += `<mask id="${maskId}" maskUnits="userSpaceOnUse" x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}">`
  s += `<path d="${frame.bodyPath}" fill="#fff"/>`
  for (let i = 0; i < frame.eyes.length; i++) {
    const eye = frame.eyes[i]!
    s += `<path d="${eye.d}" transform="${eye.matrix}" opacity="${eye.alpha}" fill="#000"/>`
  }
  if (frame.notch) {
    s += `<circle cx="${frame.notch.x}" cy="${frame.notch.y}" r="${frame.notch.r}" fill="#000"/>`
  }
  s += '</mask>'
  s += `<radialGradient id="${keyId}" gradientUnits="objectBoundingBox" cx="${L.keyX}" cy="${L.keyY}" r="0.95">`
  for (const [offset, , opacity] of L.stops) {
    s += `<stop offset="${r2(offset * 100)}%" stop-color="${C.innerLight}" stop-opacity="${opacity}"/>`
  }
  s += '</radialGradient>'
  s += `<filter id="${shadowBlurId}" filterUnits="userSpaceOnUse" x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}">`
  s += '<feGaussianBlur stdDeviation="30"/>'
  s += '</filter>'
  s += `<filter id="${sheenBlurId}" filterUnits="userSpaceOnUse" x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}">`
  s += '<feGaussianBlur stdDeviation="22"/>'
  s += '</filter>'
  s += `<pattern id="${grainPatId}" width="6" height="6" patternUnits="userSpaceOnUse">`
  s += `<circle cx="1.5" cy="1.5" r="0.75" fill="${C.eyes}" opacity="0.06"/>`
  s += '<circle cx="4.5" cy="4.5" r="0.75" fill="#000000" opacity="0.10"/>'
  s += `<circle cx="4.5" cy="1.5" r="0.5" fill="${C.eyes}" opacity="0.04"/>`
  s += '<circle cx="1.5" cy="4.5" r="0.5" fill="#000000" opacity="0.07"/>'
  s += '</pattern>'
  s += `<filter id="${grainFiltId}" filterUnits="userSpaceOnUse" x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}">`
  s += '<feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" result="noise"/>'
  s += `<feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${L.textureOpacity} 0"/>`
  s += '</filter>'
  s += `<filter id="${rimId}" filterUnits="userSpaceOnUse" x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}" color-interpolation-filters="sRGB">`
  s += `<feDropShadow dx="0" dy="0" stdDeviation="${L.rimBlur}" flood-color="${C.rim}" flood-opacity="${r2(L.rimOpacity * glow)}"/>`
  s += `<feDropShadow dx="0" dy="0" stdDeviation="${L.auraBlur}" flood-color="${C.rim}" flood-opacity="${r2(L.auraOpacity * glow)}"/>`
  s += '</filter>'
  for (const arc of frame.arcs) {
    const stops = arcStops(arc.grad.stops.length, C)
    s += `<linearGradient id="bakasur-${opts.uid}-${arc.id}" gradientUnits="userSpaceOnUse" x1="${arc.grad.x1}" y1="${arc.grad.y1}" x2="${arc.grad.x2}" y2="${arc.grad.y2}">`
    for (let i = 0; i < stops.length; i++) {
      s += `<stop offset="${r2((i / (stops.length - 1 || 1)) * 100)}%" stop-color="${stops[i]}"/>`
    }
    s += '</linearGradient>'
  }
  s += '</defs>'

  if (frame.arcs.length) {
    s += '<g fill="none" stroke-linecap="round">'
    for (const arc of frame.arcs) {
      s += `<path d="${arc.back}" stroke="url(#bakasur-${opts.uid}-${arc.id})" stroke-width="${arc.width}" opacity="${arc.opacity}"/>`
    }
    s += '</g>'
  }

  if (frame.dotsBehind) {
    s += '<g>'
    for (let i = 0; i < frame.dots.length; i++) s += renderDot(frame.dots[i]!, `pb${i}`, C)
    s += '</g>'
  }

  s += `<g opacity="${frame.bodyAlpha}">`
  // Eye-glow backing: the mask holes reveal it, so the eyes read as pale
  // light on the dark body. Filtered copy first (soft bloom), crisp on top.
  s += `<path d="${frame.bodyPath}" fill="${C.eyes}" filter="url(#${rimId})"/>`
  s += `<path d="${frame.bodyPath}" fill="${C.eyes}"/>`
  s += `<g mask="url(#${maskId})">`
  s += `<rect x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}" fill="${C.body}"/>`
  s += `<ellipse cx="40" cy="50" rx="90" ry="75" fill="#000000" opacity="0.52" filter="url(#${shadowBlurId})"/>`
  s += `<rect x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}" fill="url(#${keyId})"/>`
  s += `<ellipse cx="-35" cy="-45" rx="55" ry="42" fill="${C.eyes}" opacity="0.22" filter="url(#${sheenBlurId})"/>`
  if (L.textureOpacity > 0) {
    s += `<rect x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}" fill="url(#${grainPatId})"/>`
    s += `<rect x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}" filter="url(#${grainFiltId})"/>`
  }
  if (dim > 0) {
    s += `<rect x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}" fill="#000000" opacity="${dim}"/>`
  }
  s += '</g></g>'


  if (!frame.dotsBehind) {
    s += '<g>'
    for (let i = 0; i < frame.dots.length; i++) s += renderDot(frame.dots[i]!, `pf${i}`, C)
    s += '</g>'
  }

  if (frame.notif) {
    s += `<circle cx="${frame.notif.x}" cy="${frame.notif.y}" r="${frame.notif.r}" fill="${C.pastille}"/>`
  }

  if (frame.arcs.length) {
    s += '<g fill="none" stroke-linecap="round">'
    for (const arc of frame.arcs) {
      s += `<path d="${arc.front}" stroke="url(#bakasur-${opts.uid}-${arc.id})" stroke-width="${arc.width}" opacity="${arc.opacity}"/>`
    }
    s += '</g>'
  }

  return s
}

/** Standalone deterministic SVG document (previews, frozen frames, export). */
export function renderBakasurSvg(frame: BotFrame, opts: BakasurRenderOpts): string {
  const bg =
    opts.background !== undefined
      ? `<rect x="${-VB}" y="${-VB}" width="${VB * 2}" height="${VB * 2}" fill="${opts.background}"/>`
      : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.size}" height="${opts.size}" ` +
    `viewBox="${-VB} ${-VB} ${VB * 2} ${VB * 2}" role="img" aria-label="Bakasur">` +
    bg +
    renderBakasurInner(frame, opts) +
    '</svg>'
  )
}
