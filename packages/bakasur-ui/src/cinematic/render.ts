/*
 * BAKASUR-UI — Original Bakasur work (Phase 8).
 *
 * Pure SVG scene renderer: environment, portal, particles and the Bakasur
 * actor composed in depth order (background → env → back particles →
 * portal → actor → front particles → haze → vignette). Deterministic
 * string output — tests, contact sheets and frozen frames read here.
 * The live component reuses these builders and swaps only the actor
 * layer for the animated BakasurBot.
 */

import { BotEngine } from '../engine/engine'
import { r2 } from '../engine/math'
import { applyResolvedPreset } from '../bakasur/presets/validate'
import { renderBakasurInner } from '../bakasur/render'
import type { BakasurColourTheme } from '../bakasur/presets/colours'
import { frameViewport, resolveSceneFrame, type ResolvedFrame, type ResolvedParticle } from './resolve'
import { SCENE_H, SCENE_W, type CinematicScene } from './types'

/** Body diameter (200) over the Bakasur viewBox span (316). */
const BODY_FILL = 200 / 316

export function envLayer(frame: ResolvedFrame, theme: BakasurColourTheme, uid: string): string {
  const { darkness, glow } = frame.env
  let s = `<rect x="0" y="0" width="${SCENE_W}" height="${SCENE_H}" fill="${theme.void}"/>`
  s += `<radialGradient id="cx-env-${uid}" gradientUnits="userSpaceOnUse" cx="400" cy="270" r="420">`
  s += `<stop offset="0%" stop-color="${theme.innerLight}" stop-opacity="${r2(0.16 * glow)}"/>`
  s += `<stop offset="55%" stop-color="${theme.innerLight}" stop-opacity="${r2(0.05 * glow)}"/>`
  s += `<stop offset="100%" stop-color="${theme.innerLight}" stop-opacity="0"/>`
  s += `</radialGradient><rect x="0" y="0" width="${SCENE_W}" height="${SCENE_H}" fill="url(#cx-env-${uid})"/>`
  if (darkness > 0) {
    s += `<rect x="0" y="0" width="${SCENE_W}" height="${SCENE_H}" fill="#000000" opacity="${r2(Math.min(1, darkness))}"/>`
  }
  return s
}

/** Lens effects sit over the actor (front layer in live playback). */
export function lensLayer(frame: ResolvedFrame, theme: BakasurColourTheme, uid: string): string {
  const { vignette, haze } = frame.env
  let s = ''
  if (haze > 0) {
    s += `<rect x="0" y="0" width="${SCENE_W}" height="${SCENE_H}" fill="${theme.rim}" opacity="${r2(Math.min(0.3, haze * 0.12))}"/>`
  }
  if (vignette > 0) {
    s += `<radialGradient id="cx-vig-${uid}" gradientUnits="userSpaceOnUse" cx="400" cy="250" r="430">`
    s += `<stop offset="55%" stop-color="#000000" stop-opacity="0"/>`
    s += `<stop offset="100%" stop-color="#000000" stop-opacity="${r2(Math.min(1, vignette))}"/>`
    s += `</radialGradient><rect x="0" y="0" width="${SCENE_W}" height="${SCENE_H}" fill="url(#cx-vig-${uid})"/>`
  }
  return s
}

export function portalLayer(frame: NonNullable<ResolvedFrame['portal']>, theme: BakasurColourTheme, uid: string): string {
  const { x, y, radius, thickness, opacity, intensity, rotation } = frame
  if (opacity <= 0 || radius <= 0) return ''
  const o = r2(Math.min(1, opacity))
  const k = Math.max(0, intensity)
  let s = `<g opacity="${o}">`
  s += `<filter id="cx-por-${uid}" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">`
  s += `<feDropShadow dx="0" dy="0" stdDeviation="${r2(6 + 10 * k)}" flood-color="${theme.rim}" flood-opacity="${r2(Math.min(0.9, 0.25 + 0.3 * k))}"/>`
  s += `</filter><g filter="url(#cx-por-${uid})">`
  s += `<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="${r2(radius)}" ry="${r2(radius * 0.96)}" fill="none" stroke="${theme.rim}" stroke-width="${r2(thickness)}"/>`
  s += `<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="${r2(radius * 0.82)}" ry="${r2(radius * 0.79)}" fill="none" stroke="${theme.innerLight}" stroke-width="${r2(Math.max(1, thickness * 0.4))}" opacity="0.8"/>`
  s += `<g transform="rotate(${r2(rotation)} ${r2(x)} ${r2(y)})">`
  s += `<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="${r2(radius * 1.08)}" ry="${r2(radius * 1.04)}" fill="none" stroke="${theme.eyes}" stroke-width="${r2(Math.max(1, thickness * 0.3))}" stroke-dasharray="${r2(radius * 1.7)} ${r2(radius * 2.6)}" opacity="0.7"/>`
  s += `</g></g></g>`
  return s
}

export function particlesLayer(list: ResolvedParticle[], theme: BakasurColourTheme): string {
  if (!list.length) return ''
  let s = '<g>'
  for (const p of list) {
    s += `<circle cx="${r2(p.x)}" cy="${r2(p.y)}" r="${r2(Math.max(0.4, p.r))}" fill="${theme.eyes}" opacity="${r2(Math.min(1, p.opacity))}"/>`
  }
  return s + '</g>'
}

export function actorLayer(frame: ResolvedFrame, uid: string): string {
  const a = frame.actor
  if (a.opacity <= 0 || a.scale <= 0) return ''
  const e = new BotEngine(100, 'idle', null, null)
  applyResolvedPreset(e, a.preset, 0)
  const inner = renderBakasurInner(e.sample(frame.t), {
    size: 200,
    uid: `cx-act-${uid}`,
    treatment: a.preset.treatment,
    colours: a.theme
  })
  // Nested svg: BakasurBot renders the same box, so live/frozen agree.
  const side = a.scale / BODY_FILL
  const x = a.x - side / 2
  const y = a.y - side / 2
  return (
    `<svg x="${r2(x)}" y="${r2(y)}" width="${r2(side)}" height="${r2(side)}" ` +
    `viewBox="-158 -158 316 316" opacity="${r2(Math.min(1, a.opacity))}">${inner}</svg>`
  )
}

/** Camera x/y are offsets from stage center; identity frames exactly. */
export function cameraTransform(frame: ResolvedFrame): string {
  const c = frame.camera
  return (
    `translate(400 250) scale(${r2(c.zoom)}) rotate(${r2(c.rotation)}) ` +
    `translate(${r2(-400 - c.x)} ${r2(-250 - c.y)})`
  )
}

/**
 * Full standalone scene SVG at scene-time t (frozen frame). Live playback
 * uses the same layer builders through SceneView; only its actor layer is
 * the animated component instead of this string.
 */
export function renderSceneSvg(
  scene: CinematicScene,
  t: number,
  w: number,
  h: number,
  opts?: { reducedMotion?: boolean; uid?: string }
): string {
  const frame = resolveSceneFrame(scene, t, opts)
  const uid = opts?.uid ?? `${scene.id}-${Math.round(t * 100)}`
  const vp = frameViewport(w, h)
  const back = frame.particles.filter((p) => !p.front)
  const front = frame.particles.filter((p) => p.front)
  const theme = frame.actor.theme
  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
    `viewBox="0 0 ${w} ${h}" role="img" aria-label="${scene.name}">`
  s += `<g transform="translate(${r2(vp.tx)} ${r2(vp.ty)}) scale(${r2(vp.scale)})">`
  s += `<g transform="${cameraTransform(frame)}">`
  s += envLayer(frame, theme, uid)
  s += particlesLayer(back, theme)
  if (frame.portal) s += portalLayer(frame.portal, frame.portalTheme, uid)
  s += actorLayer(frame, uid)
  s += particlesLayer(front, theme)
  s += lensLayer(frame, theme, uid)
  s += `</g></g></svg>`
  return s
}
