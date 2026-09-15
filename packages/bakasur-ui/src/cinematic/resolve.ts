/*
 * BAKASUR-UI — Original Bakasur work (Phase 8).
 *
 * Scene validation + deterministic frame resolution. Pure functions:
 * the same (scene, t) always yields the same ResolvedFrame — the
 * component, the frozen renderer and the tests all read through here.
 * Reduced motion zeroes shake/pulse/drift but preserves structure.
 */

import { TAU, createRng } from '../engine/math'
import { BAKASUR_EXPRESSION_BY_ID } from '../bakasur/expressions/index'
import { getBakasurPreset } from '../bakasur/presets/catalogue'
import { isBakasurThemeId, resolveBakasurTheme, type BakasurColourTheme } from '../bakasur/presets/colours'
import type { BakasurIntent } from '../bakasur/animations/types'
import type { BakasurTimeline, ResolvedBakasurPreset } from '../bakasur/presets/types'
import { intentAt, normalizeBakasurTimeline } from '../bakasur/presets/timeline'
import { resolvePresetDef } from '../bakasur/presets/validate'
import { effectAt, sampleTrack, trackIssues } from './interp'
import {
  SCENE_H,
  SCENE_W,
  type ActorDef,
  type ChoreographyDef,
  type CinematicScene,
  type EffectKind,
  type GazeCueDef,
  type ParticleDef,
  type SceneIssue,
  type SceneValidation
} from './types'

export interface ResolvedParticle {
  x: number
  y: number
  r: number
  opacity: number
  front: boolean
}

export interface ResolvedGaze {
  yaw: number
  pitch: number
  mix: number
}

export interface ResolvedActor {
  /** Preset input driving the runtime (preset + face cue at t). */
  animation: BakasurIntent
  expression: string | null
  gaze?: ResolvedGaze
  theme: BakasurColourTheme
  /** Full preset resolution (treatment/shape/look for the renderer). */
  preset: ResolvedBakasurPreset
  intent: BakasurIntent
  opacity: number
  x: number
  y: number
  scale: number
  hoverY: number
  breathScale: number
}

export interface ResolvedFrame {
  t: number
  duration: number
  camera: { x: number; y: number; zoom: number; rotation: number }
  env: { darkness: number; glow: number; vignette: number; haze: number; glowBreath: number }
  portal: { x: number; y: number; radius: number; thickness: number; opacity: number; intensity: number; rotation: number } | null
  portalTheme: BakasurColourTheme
  particles: ResolvedParticle[]
  actor: ResolvedActor
  effects: Record<EffectKind, number>
  reduced: boolean
  choreography?: ChoreographyDef
}

/* ---------------------------------------------------------- validation */

function finite(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function checkTimeline(tl: BakasurTimeline | undefined, issues: SceneIssue[]): void {
  if (tl === undefined) return
  for (const [i, s] of (tl.steps ?? []).entries()) {
    if (typeof s?.intent !== 'string' || !s.intent) issues.push({ field: 'actor.timeline', code: 'bad-intent', message: `Step ${i} needs a non-empty intent id.` })
    if (s.duration !== undefined && (!finite(s.duration) || s.duration <= 0)) {
      issues.push({ field: 'actor.timeline', code: 'bad-duration', message: `Step ${i} duration must be finite > 0.` })
    }
  }
  if (tl.repeat !== undefined && (!finite(tl.repeat) || tl.repeat < 1)) {
    issues.push({ field: 'actor.timeline', code: 'bad-repeat', message: 'repeat must be >= 1.' })
  }
}

export function validateScene(scene: unknown): SceneValidation {
  const issues: SceneIssue[] = []
  const push = (field: string, code: string, message: string): void => {
    issues.push({ field, code, message })
  }
  if (typeof scene !== 'object' || scene === null) return { ok: false, issues: [{ field: 'scene', code: 'not-object', message: 'Scene must be an object.' }] }
  const s = scene as Partial<CinematicScene>
  if (!s.id || typeof s.id !== 'string') push('id', 'bad-id', 'Scene needs a non-empty string id.')
  if (!finite(s.duration) || (s.duration as number) <= 0) push('duration', 'bad-duration', 'duration must be finite > 0.')
  if (!s.actor || typeof s.actor !== 'object') {
    push('actor', 'missing-actor', 'Scene needs an actor.')
    return { ok: false, issues }
  }
  const a = s.actor as Partial<ActorDef>
  if (typeof a.preset !== 'string' || !getBakasurPreset(a.preset)) {
    push('actor.preset', 'unknown-preset', `Unknown Bakasur preset "${String(a.preset)}". Degrades to bakasur-idle.`)
  }
  for (const [i, cue] of (a.faces ?? []).entries()) {
    if (!finite(cue?.t) || (cue?.t as number) < 0) push('actor.faces', 'bad-cue-time', `Face cue ${i} needs t >= 0.`)
    if (typeof cue?.expression !== 'string' || !BAKASUR_EXPRESSION_BY_ID.has(cue.expression)) {
      push('actor.faces', 'unknown-expression', `Face cue ${i} names unknown expression "${String(cue?.expression)}".`)
    }
  }
  checkTimeline(a.timeline, issues)
  const cam = s.camera
  if (cam) {
    for (const f of ['x', 'y', 'zoom', 'rotation'] as const) {
      for (const m of trackIssues(cam[f] ?? { keys: [] }, `camera.${f}`)) push(`camera.${f}`, 'bad-track', m)
    }
    if (cam.shake && (!finite(cam.shake.amp) || !finite(cam.shake.freq))) push('camera.shake', 'bad-shake', 'shake amp/freq must be finite.')
  }
  const p = s.portal
  if (p) {
    if (!finite(p.radius) || p.radius <= 0) push('portal.radius', 'bad-radius', 'radius must be finite > 0.')
    if (!finite(p.thickness) || p.thickness <= 0) push('portal.thickness', 'bad-thickness', 'thickness must be finite > 0.')
    for (const f of ['opacity', 'intensity', 'rotation'] as const) {
      for (const m of trackIssues(p[f] ?? { keys: [] }, `portal.${f}`)) push(`portal.${f}`, 'bad-track', m)
    }
    if (p.theme !== undefined && !isBakasurThemeId(p.theme)) push('portal.theme', 'unknown-theme', `Unknown theme "${p.theme}".`)
  }
  if (s.environment) {
    for (const m of trackIssues(s.environment.glow ?? { keys: [] }, 'environment.glow')) push('environment.glow', 'bad-track', m)
    for (const m of trackIssues(s.environment.haze ?? { keys: [] }, 'environment.haze')) push('environment.haze', 'bad-track', m)
    if (!finite(s.environment.darkness)) push('environment.darkness', 'bad-value', 'darkness must be finite.')
    if (!finite(s.environment.vignette)) push('environment.vignette', 'bad-value', 'vignette must be finite.')
  }
  for (const [i, pd] of (s.particles ?? []).entries()) {
    if (!finite(pd?.count) || (pd?.count as number) < 0 || (pd?.count as number) > 200) {
      push('particles', 'bad-count', `Particle layer ${i}: count must be 0..200 (restraint).`)
    }
    if (!finite(pd?.seed)) push('particles', 'bad-seed', `Particle layer ${i}: seed must be finite.`)
  }
  for (const [i, e] of (s.effects ?? []).entries()) {
    if (!['portalPulse', 'haze', 'shake', 'glow'].includes(e?.kind as string)) push('effects', 'bad-kind', `Effect ${i} has unknown kind.`)
    if (!finite(e?.at) || (e?.at as number) < 0 || !finite(e?.dur) || (e?.dur as number) <= 0) {
      push('effects', 'bad-window', `Effect ${i} needs at >= 0 and dur > 0.`)
    }
    if (!finite(e?.amount)) push('effects', 'bad-amount', `Effect ${i} amount must be finite.`)
  }
  if (s.background && s.background.kind !== 'none' && s.background.kind !== 'media') {
    push('background', 'bad-kind', 'background.kind must be none or media.')
  }
  if (s.choreography) {
    const ch = s.choreography
    if (ch.entrance) {
      if (!['fade', 'rise', 'portal'].includes(ch.entrance.kind)) {
        push('choreography.entrance', 'bad-kind', `Entrance kind "${ch.entrance.kind}" is invalid.`)
      }
      if (!finite(ch.entrance.t) || ch.entrance.t < 0) push('choreography.entrance', 'bad-time', 'Entrance t must be finite >= 0.')
      if (!finite(ch.entrance.duration) || ch.entrance.duration <= 0) push('choreography.entrance', 'bad-duration', 'Entrance duration must be finite > 0.')
    }
    for (const [i, gc] of (ch.gazeCues ?? []).entries()) {
      if (!finite(gc.t) || gc.t < 0) push('choreography.gazeCues', 'bad-cue-time', `Gaze cue ${i} t must be >= 0.`)
      if (!finite(gc.yaw) || Math.abs(gc.yaw) > 90) push('choreography.gazeCues', 'bad-yaw', `Gaze cue ${i} yaw out of range.`)
      if (!finite(gc.pitch) || Math.abs(gc.pitch) > 90) push('choreography.gazeCues', 'bad-pitch', `Gaze cue ${i} pitch out of range.`)
    }
    if (ch.coupling) {
      if (ch.coupling.rimResponse !== undefined && (!finite(ch.coupling.rimResponse) || ch.coupling.rimResponse < 0)) {
        push('choreography.coupling', 'bad-value', 'rimResponse must be finite >= 0.')
      }
      if (ch.coupling.pulseCoupling !== undefined && (!finite(ch.coupling.pulseCoupling) || ch.coupling.pulseCoupling < 0)) {
        push('choreography.coupling', 'bad-value', 'pulseCoupling must be finite >= 0.')
      }
    }
  }
  return { ok: issues.length === 0, issues }
}

/* ---------------------------------------------------------- resolution */

export function faceAt(faces: ActorDef['faces'], t: number): string | undefined {
  let out: string | undefined
  for (const cue of faces ?? []) {
    if (cue.t <= t) out = cue.expression
  }
  return out
}

export function resolveGazeAt(
  cues: GazeCueDef[] | undefined,
  t: number
): ResolvedGaze | undefined {
  if (!cues || cues.length === 0) return undefined
  let current: GazeCueDef | undefined
  let next: GazeCueDef | undefined
  for (const c of cues) {
    if (c.t <= t) {
      current = c
    } else if (!next) {
      next = c
    }
  }
  if (!current) return undefined
  const dur = current.duration ?? 0.8
  const mix = current.mix ?? 0.6
  if (!next || t >= current.t + dur) {
    return { yaw: current.yaw, pitch: current.pitch, mix }
  }
  const progress = Math.min(1, Math.max(0, (t - current.t) / dur))
  const easeProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI)
  const yaw = current.yaw + (next.yaw - current.yaw) * easeProgress
  const pitch = current.pitch + (next.pitch - current.pitch) * easeProgress
  const blendMix = mix + ((next.mix ?? 0.6) - mix) * easeProgress
  return { yaw: Math.round(yaw * 100) / 100, pitch: Math.round(pitch * 100) / 100, mix: Math.round(blendMix * 100) / 100 }
}

function particleAt(def: ParticleDef, i: number, t: number, reduced: boolean): ResolvedParticle {
  const rng = createRng(def.seed * 7919 + i * 104729)
  const bx = rng() * SCENE_W
  const by = rng() * SCENE_H
  const r = def.sizeMin + rng() * Math.max(0, def.sizeMax - def.sizeMin)
  const phase = rng() * TAU
  const drift = reduced ? 0 : def.drift
  const x = bx + (reduced ? 0 : Math.sin(t * 0.2 + phase) * 8)
  const y = (((by - drift * t) % SCENE_H) + SCENE_H) % SCENE_H
  const opacity = reduced ? def.opacity * 0.8 : def.opacity * (0.6 + 0.4 * Math.sin(t * 0.7 + phase))
  return { x, y, r, opacity: Math.max(0, opacity), front: def.foreground }
}

/**
 * Resolve one deterministic frame. Unknown presets degrade to idle
 * (validator reports); non-finite t holds the opening frame.
 */
export function resolveSceneFrame(
  scene: CinematicScene,
  t: number,
  opts?: { reducedMotion?: boolean }
): ResolvedFrame {
  const reduced = opts?.reducedMotion ?? false
  const tt = Number.isFinite(t) ? Math.min(Math.max(0, t), scene.duration) : 0
  const preset = getBakasurPreset(scene.actor.preset) ?? getBakasurPreset('bakasur-idle')!
  const face = faceAt(scene.actor.faces, tt)
  const resolved = face === undefined ? resolvePresetDef(preset) : resolvePresetDef(preset, { expression: face })
  const timeline = normalizeBakasurTimeline(scene.actor.timeline ?? preset.timeline, resolved.animation)
  const theme = resolveBakasurTheme(resolved.theme)

  const micro = scene.choreography?.microMotion
  const hoverAmp = reduced ? 0 : (micro?.hoverAmp ?? 3)
  const hoverFreq = reduced ? 0 : (micro?.hoverFreq ?? 0.8)
  const breathAmp = reduced ? 0 : (micro?.breathAmp ?? 0.012)
  const breathFreq = reduced ? 0 : (micro?.breathFreq ?? 0.5)
  const glowBreathAmp = reduced ? 0 : (micro?.glowBreathAmp ?? 0.08)

  const hoverY = hoverAmp * Math.cos(tt * hoverFreq * TAU)
  const breathScale = 1 + breathAmp * Math.sin(tt * breathFreq * TAU)
  const glowBreath = glowBreathAmp * Math.sin(tt * 0.4 * TAU)

  const gazeCues = scene.actor.gazeCues ?? scene.choreography?.gazeCues
  const gaze = resolveGazeAt(gazeCues, tt)

  const shake = scene.camera.shake
  const shakeAmp = reduced || !shake ? 0 : shake.amp + effectAt(scene.effects, 'shake', tt)
  const camX = sampleTrack(scene.camera.x, tt) + shakeAmp * Math.sin(tt * (shake?.freq ?? 1) * TAU)
  const camY = sampleTrack(scene.camera.y, tt) + shakeAmp * 0.7 * Math.sin(tt * (shake?.freq ?? 1) * TAU + 1.3)

  const pulse = scene.portal?.pulse
  const pulseAmp = reduced || !pulse ? 0 : pulse.amp + effectAt(scene.effects, 'portalPulse', tt)

  const entrance = scene.choreography?.entrance
  let entranceOpacityMult = 1
  let entranceYOffset = 0
  let entranceScaleMult = 1

  if (entrance) {
    const startT = entrance.t ?? 0
    const dur = entrance.duration > 0 ? entrance.duration : 1
    if (tt < startT) {
      entranceOpacityMult = 0
      if (entrance.kind === 'rise') entranceYOffset = 40
      if (entrance.kind === 'portal') entranceScaleMult = 0.2
    } else if (tt < startT + dur) {
      const rawProgress = (tt - startT) / dur
      const smoothProgress = reduced ? rawProgress : (0.5 - 0.5 * Math.cos(rawProgress * Math.PI))
      entranceOpacityMult = smoothProgress
      if (!reduced) {
        if (entrance.kind === 'rise') entranceYOffset = (1 - smoothProgress) * 40
        if (entrance.kind === 'portal') entranceScaleMult = 0.2 + 0.8 * smoothProgress
      }
    }
  }

  const baseActorOpacity = sampleTrack(scene.actor.opacity, tt)
  const actorOpacity = Math.max(0, Math.min(1, baseActorOpacity * entranceOpacityMult))

  const coupling = scene.choreography?.coupling
  const rimBoost = coupling?.rimResponse ?? 0.2
  const pulseBoost = coupling?.pulseCoupling ?? 0.15
  const settleAt = coupling?.arrivalSettleAt

  let portalCouplingBonus = actorOpacity * rimBoost + pulseAmp * pulseBoost
  if (settleAt !== undefined && tt > settleAt) {
    const settleProgress = Math.min(1, (tt - settleAt) / 1.5)
    portalCouplingBonus *= (1 - 0.3 * settleProgress)
  }

  // Environmental response to major events (§8)
  const arrivalEnvBoost = actorOpacity > 0 ? actorOpacity * 0.08 : 0
  const hasGazeFocus = gaze !== undefined && gaze.mix > 0.5
  const gazeEnvBoost = hasGazeFocus ? 0.04 : 0
  let exitFade = 0
  if (tt > scene.duration - 1.5 && scene.duration > 3) {
    const exitProgress = (tt - (scene.duration - 1.5)) / 1.5
    exitFade = exitProgress * 0.1
  }

  const envGlow = Math.max(
    0,
    sampleTrack(scene.environment.glow, tt) +
      effectAt(scene.effects, 'glow', tt) +
      glowBreath +
      arrivalEnvBoost +
      gazeEnvBoost -
      exitFade
  )

  const p = scene.portal
  const portal = p
    ? {
        x: p.x,
        y: p.y,
        radius: p.radius * (1 + pulseAmp * Math.sin(tt * (pulse?.freq ?? 1) * TAU)),
        thickness: p.thickness,
        opacity: sampleTrack(p.opacity, tt),
        intensity: Math.min(2, sampleTrack(p.intensity, tt) + portalCouplingBonus),
        rotation: sampleTrack(p.rotation, tt)
      }
    : null

  const particles: ResolvedParticle[] = []
  for (const def of scene.particles) {
    const n = Math.max(0, Math.min(200, Math.floor(def.count)))
    for (let i = 0; i < n; i++) particles.push(particleAt(def, i, tt, reduced))
  }

  return {
    t: tt,
    duration: scene.duration,
    camera: {
      x: camX,
      y: camY,
      zoom: sampleTrack(scene.camera.zoom, tt),
      rotation: sampleTrack(scene.camera.rotation, tt)
    },
    env: {
      darkness: scene.environment.darkness,
      glow: envGlow,
      vignette: scene.environment.vignette,
      haze: sampleTrack(scene.environment.haze, tt) + effectAt(scene.effects, 'haze', tt),
      glowBreath
    },
    portal,
    portalTheme: resolveBakasurTheme(p?.theme ?? resolved.theme),
    particles,
    actor: {
      animation: resolved.animation,
      expression: resolved.expression,
      gaze,
      theme,
      preset: resolved,
      intent: intentAt(timeline, tt),
      opacity: actorOpacity,
      x: sampleTrack(scene.actor.x, tt),
      y: sampleTrack(scene.actor.y, tt) + hoverY + entranceYOffset,
      scale: sampleTrack(scene.actor.scale, tt) * breathScale * entranceScaleMult,
      hoverY,
      breathScale
    },
    effects: {
      portalPulse: effectAt(scene.effects, 'portalPulse', tt),
      haze: effectAt(scene.effects, 'haze', tt),
      shake: effectAt(scene.effects, 'shake', tt),
      glow: effectAt(scene.effects, 'glow', tt)
    },
    choreography: scene.choreography,
    reduced
  }
}

/**
 * Deterministic frame validator (§20).
 * Verifies finite values, opacities, transforms, scale and absence of NaN/Infinity.
 */
export function validateFrameValues(frame: ResolvedFrame): { ok: boolean; issues: string[] } {
  const issues: string[] = []
  const checkNum = (val: unknown, name: string) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      issues.push(`Invalid non-finite value at ${name}: ${String(val)}`)
    }
  }

  checkNum(frame.t, 'frame.t')
  checkNum(frame.duration, 'frame.duration')
  checkNum(frame.camera.x, 'camera.x')
  checkNum(frame.camera.y, 'camera.y')
  checkNum(frame.camera.zoom, 'camera.zoom')
  checkNum(frame.camera.rotation, 'camera.rotation')

  checkNum(frame.env.darkness, 'env.darkness')
  checkNum(frame.env.glow, 'env.glow')
  checkNum(frame.env.vignette, 'env.vignette')
  checkNum(frame.env.haze, 'env.haze')
  checkNum(frame.env.glowBreath, 'env.glowBreath')

  if (frame.portal) {
    checkNum(frame.portal.x, 'portal.x')
    checkNum(frame.portal.y, 'portal.y')
    checkNum(frame.portal.radius, 'portal.radius')
    checkNum(frame.portal.thickness, 'portal.thickness')
    checkNum(frame.portal.opacity, 'portal.opacity')
    checkNum(frame.portal.intensity, 'portal.intensity')
    checkNum(frame.portal.rotation, 'portal.rotation')
    if (frame.portal.opacity < 0 || frame.portal.opacity > 1) {
      issues.push(`Portal opacity out of [0, 1] range: ${frame.portal.opacity}`)
    }
  }

  checkNum(frame.actor.x, 'actor.x')
  checkNum(frame.actor.y, 'actor.y')
  checkNum(frame.actor.scale, 'actor.scale')
  checkNum(frame.actor.opacity, 'actor.opacity')
  if (frame.actor.opacity < 0 || frame.actor.opacity > 1) {
    issues.push(`Actor opacity out of [0, 1] range: ${frame.actor.opacity}`)
  }

  for (const [i, p] of frame.particles.entries()) {
    checkNum(p.x, `particles[${i}].x`)
    checkNum(p.y, `particles[${i}].y`)
    checkNum(p.r, `particles[${i}].r`)
    checkNum(p.opacity, `particles[${i}].opacity`)
  }

  return { ok: issues.length === 0, issues }
}

/**
 * Cover-fit the 800×500 stage onto vw×vh pixels, centered. Crops sides or
 * top/bottom (never letterboxes); the camera focal point stays centered.
 */
export function frameViewport(vw: number, vh: number): { scale: number; tx: number; ty: number } {
  const scale = Math.max(vw / SCENE_W, vh / SCENE_H)
  return { scale, tx: (vw - SCENE_W * scale) / 2, ty: (vh - SCENE_H * scale) / 2 }
}

