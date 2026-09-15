/*
 * BAKASUR-UI — Original Bakasur work (Phase 8).
 *
 * Cinematic scene model. DATA ONLY — no functions, no rendering, every
 * interface JSON-serializable. A scene composes the existing systems
 * (preset + Bakasur timeline + theme) under a scene timeline that drives
 * camera, environment, portal, actor and effects.
 *
 * Two timeline layers, never merged into the engine:
 *   SCENE timeline → composition/camera/environment/actor timing
 *   BAKASUR timeline → character animation (existing resolver)
 *
 * Scene units: an 800×500 stage. Positions/scales below are in stage
 * units; `frameViewport` maps them onto real pixels (cover-fit).
 */

import type { BakasurThemeId } from '../bakasur/presets/types'
import type { BakasurTimeline } from '../bakasur/presets/types'

export const SCENE_W = 800
export const SCENE_H = 500

export type SceneEase = 'hold' | 'linear' | 'smooth'

/** One keyframe: value at scene-time t (seconds). */
export interface SceneKey {
  t: number
  v: number
  ease?: SceneEase
}

/**
 * value track. Sampled by `sampleTrack`: before the first key holds the
 * first value, after the last holds the last; `ease` on the DESTINATION
 * key governs the segment arriving at it (origin key as fallback).
 */
export interface SceneTrack {
  keys: SceneKey[]
}

/** Helper for constant tracks (static camera, fixed opacity...). */
export function constTrack(v: number): SceneTrack {
  return { keys: [{ t: 0, v, ease: 'hold' }] }
}

export interface CameraDef {
  x: SceneTrack
  y: SceneTrack
  /** 1 = stage fills the frame (cover), >1 pushes in. */
  zoom: SceneTrack
  /** Degrees. */
  rotation: SceneTrack
  /** Deterministic sinusoidal drift; zeroed under reduced motion. */
  shake?: { amp: number; freq: number }
}

export interface PortalDef {
  x: number
  y: number
  radius: number
  thickness: number
  opacity: SceneTrack
  intensity: SceneTrack
  rotation: SceneTrack
  pulse?: { amp: number; freq: number }
  theme?: BakasurThemeId
}

export interface EnvDef {
  /** 0..1 extra black over the void. */
  darkness: number
  /** Atmospheric glow behind the actor. */
  glow: SceneTrack
  glowX: number
  glowY: number
  /** 0..1 edge darkening. */
  vignette: number
  haze: SceneTrack
}

export interface ParticleDef {
  count: number
  seed: number
  sizeMin: number
  sizeMax: number
  opacity: number
  /** Stage units per second of upward drift. */
  drift: number
  /** Rendered above the actor when true, behind otherwise. */
  foreground: boolean
}

export interface ActorFaceCue {
  t: number
  expression: string
}

export interface GazeCueDef {
  /** Scene-time t when gaze shift begins. */
  t: number
  /** Yaw angle in degrees (-30..30). */
  yaw: number
  /** Pitch angle in degrees (-30..30). */
  pitch: number
  /** Blend mix 0..1 (default: 0.6). */
  mix?: number
  /** Transition duration in seconds (default: 0.8). */
  duration?: number
}

export interface EntranceCueDef {
  kind: 'fade' | 'rise' | 'portal'
  /** Scene-time t when entrance starts (default: 0). */
  t: number
  /** Entrance animation duration in seconds. */
  duration: number
}

export interface PortalCouplingDef {
  /** Rim light boost when Bakasur is active (0..1, default: 0.25). */
  rimResponse?: number
  /** Bakasur glow response to portal pulse (0..1, default: 0.15). */
  pulseCoupling?: number
  /** Time when portal settles post-arrival. */
  arrivalSettleAt?: number
}

export interface DialogueSyncDef {
  /** Delay in seconds before first dialogue line appears (pacing). */
  delay: number
  /** Time when character turns gaze toward viewer before speaking. */
  gazeAt?: number
  /** Time when character begins speaking beat. */
  speakAt?: number
  /** Time when character reacts to completed dialogue beat. */
  reactAt?: number
}

export interface MicroMotionDef {
  /** Hover float amplitude in stage units (default: 3). */
  hoverAmp?: number
  /** Hover float frequency in Hz (default: 0.8). */
  hoverFreq?: number
  /** Breathing scale amplitude multiplier (default: 0.012). */
  breathAmp?: number
  /** Breathing frequency in Hz (default: 0.5). */
  breathFreq?: number
  /** Glow breathing pulse amplitude (default: 0.08). */
  glowBreathAmp?: number
}

export interface ChoreographyDef {
  entrance?: EntranceCueDef
  gazeCues?: GazeCueDef[]
  coupling?: PortalCouplingDef
  dialogueSync?: DialogueSyncDef
  microMotion?: MicroMotionDef
}

export interface ActorDef {
  /** Catalogue preset id (unknown degrades to idle, with an issue). */
  preset: string
  /** Character animation over scene time; default: preset's own timeline. */
  timeline?: BakasurTimeline
  /** Expression overrides at scene times (last cue ≤ t wins). */
  faces?: ActorFaceCue[]
  /** Gaze angle overrides at scene times (interpolated). */
  gazeCues?: GazeCueDef[]
  x: SceneTrack
  y: SceneTrack
  /** Actor height in stage units (Bakasaur ~160 reads mysterious). */
  scale: SceneTrack
  opacity: SceneTrack
}

/** Future background-media hook (§22). Renderers draw `none` today. */
export type SceneBackground = { kind: 'none' } | { kind: 'media'; src: string; opacity: number; fit: 'cover' | 'contain' }

export type EffectKind = 'portalPulse' | 'haze' | 'shake' | 'glow'

/** Sine-envelope burst: amount × sin(π × clamp((t−at)/dur)). */
export interface EffectDef {
  kind: EffectKind
  at: number
  dur: number
  amount: number
}

export interface CinematicScene {
  id: string
  name: string
  description: string
  /** Seconds. Finite, > 0. */
  duration: number
  environment: EnvDef
  camera: CameraDef
  portal?: PortalDef
  background: SceneBackground
  actor: ActorDef
  particles: ParticleDef[]
  effects: EffectDef[]
  choreography?: ChoreographyDef
  mood?: string
  tags?: string[]
}

export interface SceneIssue {
  field: string
  code: string
  message: string
}

export interface SceneValidation {
  ok: boolean
  issues: SceneIssue[]
}
