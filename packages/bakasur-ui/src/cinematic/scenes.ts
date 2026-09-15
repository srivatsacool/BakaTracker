/*
 * BAKASUR-UI — Original Bakasur work (Phase 8).
 *
 * Scene preset catalogue: five DATA compositions, each a distinct
 * staging of the same character. No two share a camera/portal/actor
 * treatment. Unknown ids degrade to awakening (documented, with a
 * validation issue — the preset-layer no-throw rule).
 */

import { constTrack, type CinematicScene } from './types'

export const CINEMATIC_SCENES: Record<string, CinematicScene> = {
  'bakasur-awakening': {
    id: 'bakasur-awakening',
    name: 'Awakening',
    description: 'Dark void, faint portal, slow curious reveal, gentle push-in.',
    duration: 7,
    environment: {
      darkness: 0.15,
      glow: { keys: [{ t: 0, v: 0.4 }, { t: 4, v: 1, ease: 'smooth' }, { t: 7, v: 0.9 }] },
      glowX: 400,
      glowY: 280,
      vignette: 0.55,
      haze: { keys: [{ t: 0, v: 0.2 }, { t: 7, v: 0.4, ease: 'linear' }] }
    },
    camera: {
      x: constTrack(0),
      y: constTrack(0),
      zoom: { keys: [{ t: 0, v: 1 }, { t: 7, v: 1.15, ease: 'smooth' }] },
      rotation: constTrack(0)
    },
    portal: {
      x: 400,
      y: 250,
      radius: 150,
      thickness: 5,
      opacity: { keys: [{ t: 0, v: 0 }, { t: 0.8, v: 0, ease: 'hold' }, { t: 2.4, v: 0.5, ease: 'smooth' }, { t: 7, v: 0.45 }] },
      intensity: { keys: [{ t: 0, v: 0.4 }, { t: 7, v: 0.7, ease: 'linear' }] },
      rotation: { keys: [{ t: 0, v: 0 }, { t: 7, v: 24, ease: 'linear' }] },
      pulse: { amp: 0.03, freq: 0.15 }
    },
    background: { kind: 'none' },
    actor: {
      preset: 'bakasur-curious',
      x: constTrack(400),
      y: constTrack(285),
      scale: { keys: [{ t: 0, v: 0 }, { t: 1.6, v: 0, ease: 'hold' }, { t: 3, v: 140, ease: 'smooth' }, { t: 7, v: 140 }] },
      opacity: { keys: [{ t: 0, v: 0 }, { t: 1.6, v: 0, ease: 'hold' }, { t: 3, v: 1, ease: 'smooth' }, { t: 7, v: 1 }] }
    },
    particles: [{ count: 24, seed: 7, sizeMin: 0.8, sizeMax: 2, opacity: 0.5, drift: 6, foreground: false }],
    effects: [{ kind: 'glow', at: 2.5, dur: 2, amount: 0.25 }],
    choreography: {
      entrance: { kind: 'fade', t: 1.6, duration: 1.4 },
      gazeCues: [
        { t: 0, yaw: -12, pitch: 8, mix: 0.5, duration: 0.8 },
        { t: 3.2, yaw: 0, pitch: 0, mix: 0.75, duration: 1.0 }
      ],
      coupling: { rimResponse: 0.15, pulseCoupling: 0.1, arrivalSettleAt: 3.5 },
      dialogueSync: { delay: 2.0, gazeAt: 3.0, speakAt: 3.5, reactAt: 6.0 },
      microMotion: { hoverAmp: 2, hoverFreq: 0.5, breathAmp: 0.01, breathFreq: 0.4, glowBreathAmp: 0.05 }
    },
    mood: 'quiet-wonder',
    tags: ['reveal']
  },

  'bakasur-arrival': {
    id: 'bakasur-arrival',
    name: 'Arrival',
    description: 'Strong portal, energetic entrance, excited face, brighter rim.',
    duration: 7,
    environment: {
      darkness: 0.05,
      glow: { keys: [{ t: 0, v: 0.5 }, { t: 2, v: 1.3, ease: 'smooth' }, { t: 7, v: 1 }] },
      glowX: 400,
      glowY: 260,
      vignette: 0.45,
      haze: { keys: [{ t: 0, v: 0.3 }, { t: 7, v: 0.5, ease: 'linear' }] }
    },
    camera: {
      x: { keys: [{ t: 0, v: -14 }, { t: 7, v: 10, ease: 'smooth' }] },
      y: constTrack(0),
      zoom: { keys: [{ t: 0, v: 1.05 }, { t: 7, v: 1.2, ease: 'smooth' }] },
      rotation: constTrack(0)
    },
    portal: {
      x: 400,
      y: 250,
      radius: 165,
      thickness: 7,
      opacity: { keys: [{ t: 0, v: 0.2 }, { t: 1.2, v: 0.9, ease: 'smooth' }, { t: 7, v: 0.7 }] },
      intensity: { keys: [{ t: 0, v: 0.6 }, { t: 2, v: 1.4, ease: 'smooth' }, { t: 7, v: 1 }] },
      rotation: { keys: [{ t: 0, v: 0 }, { t: 7, v: -30, ease: 'linear' }] },
      pulse: { amp: 0.05, freq: 0.3 },
      theme: 'ember-violet'
    },
    background: { kind: 'none' },
    actor: {
      preset: 'bakasur-excited',
      timeline: { steps: [{ intent: 'burst', duration: 1.6 }, { intent: 'orbit', duration: 3 }] },
      x: constTrack(400),
      y: constTrack(275),
      scale: { keys: [{ t: 0, v: 0 }, { t: 1.2, v: 0, ease: 'hold' }, { t: 2.2, v: 170, ease: 'smooth' }, { t: 7, v: 165 }] },
      opacity: { keys: [{ t: 0, v: 0 }, { t: 1.2, v: 0, ease: 'hold' }, { t: 2, v: 1, ease: 'smooth' }, { t: 7, v: 1 }] }
    },
    particles: [
      { count: 22, seed: 21, sizeMin: 0.8, sizeMax: 2.2, opacity: 0.55, drift: 9, foreground: false },
      { count: 14, seed: 22, sizeMin: 1, sizeMax: 2.6, opacity: 0.4, drift: 14, foreground: true }
    ],
    effects: [
      { kind: 'portalPulse', at: 1.2, dur: 1.5, amount: 0.12 },
      { kind: 'glow', at: 1.5, dur: 2.5, amount: 0.4 }
    ],
    choreography: {
      entrance: { kind: 'portal', t: 1.0, duration: 1.2 },
      gazeCues: [
        { t: 0, yaw: 18, pitch: -8, mix: 0.6, duration: 0.5 },
        { t: 2.2, yaw: 0, pitch: 0, mix: 0.85, duration: 0.6 }
      ],
      coupling: { rimResponse: 0.3, pulseCoupling: 0.2, arrivalSettleAt: 2.5 },
      dialogueSync: { delay: 1.5, gazeAt: 2.2, speakAt: 2.6, reactAt: 5.5 },
      microMotion: { hoverAmp: 4, hoverFreq: 0.9, breathAmp: 0.015, breathFreq: 0.6, glowBreathAmp: 0.1 }
    },
    mood: 'electric',
    tags: ['entrance']
  },

  'bakasur-observing': {
    id: 'bakasur-observing',
    name: 'Observing',
    description: 'Quiet void, minimal portal, suspicious watch, slow drift.',
    duration: 8,
    environment: {
      darkness: 0.2,
      glow: constTrack(0.5),
      glowX: 400,
      glowY: 280,
      vignette: 0.6,
      haze: constTrack(0.25)
    },
    camera: {
      x: { keys: [{ t: 0, v: -18 }, { t: 8, v: 18, ease: 'smooth' }] },
      y: { keys: [{ t: 0, v: 6 }, { t: 8, v: -6, ease: 'smooth' }] },
      zoom: constTrack(1.05),
      rotation: constTrack(0)
    },
    portal: {
      x: 400,
      y: 250,
      radius: 140,
      thickness: 4,
      opacity: constTrack(0.25),
      intensity: constTrack(0.5),
      rotation: { keys: [{ t: 0, v: 0 }, { t: 8, v: 16, ease: 'linear' }] },
      theme: 'spectral'
    },
    background: { kind: 'none' },
    actor: {
      preset: 'bakasur-suspicious',
      x: { keys: [{ t: 0, v: 385 }, { t: 8, v: 415, ease: 'smooth' }] },
      y: constTrack(280),
      scale: constTrack(150),
      opacity: { keys: [{ t: 0, v: 0 }, { t: 1, v: 1, ease: 'smooth' }, { t: 8, v: 1 }] }
    },
    particles: [{ count: 16, seed: 33, sizeMin: 0.7, sizeMax: 1.8, opacity: 0.45, drift: 5, foreground: false }],
    effects: [],
    choreography: {
      entrance: { kind: 'fade', t: 0, duration: 1.0 },
      gazeCues: [
        { t: 0, yaw: -15, pitch: 5, mix: 0.5, duration: 1.0 },
        { t: 3.5, yaw: 5, pitch: -2, mix: 0.7, duration: 1.2 }
      ],
      coupling: { rimResponse: 0.1, pulseCoupling: 0.05 },
      dialogueSync: { delay: 2.5, gazeAt: 3.5, speakAt: 4.0, reactAt: 7.0 },
      microMotion: { hoverAmp: 2.5, hoverFreq: 0.6, breathAmp: 0.008, breathFreq: 0.45, glowBreathAmp: 0.04 }
    },
    mood: 'wary',
    tags: ['quiet']
  },

  'bakasur-suspicious': {
    id: 'bakasur-suspicious',
    name: 'Suspicious',
    description: 'Darker light, tighter framing, suspicion sharpening to annoyance.',
    duration: 7,
    environment: {
      darkness: 0.32,
      glow: { keys: [{ t: 0, v: 0.45 }, { t: 3.5, v: 0.7, ease: 'smooth' }, { t: 7, v: 0.5 }] },
      glowX: 400,
      glowY: 280,
      vignette: 0.7,
      haze: constTrack(0.3)
    },
    camera: {
      x: constTrack(0),
      y: constTrack(0),
      zoom: { keys: [{ t: 0, v: 1.1 }, { t: 7, v: 1.28, ease: 'smooth' }] },
      rotation: constTrack(0)
    },
    portal: {
      x: 400,
      y: 250,
      radius: 145,
      thickness: 5,
      opacity: { keys: [{ t: 0, v: 0.3 }, { t: 7, v: 0.4, ease: 'linear' }] },
      intensity: constTrack(0.6),
      rotation: { keys: [{ t: 0, v: 0 }, { t: 7, v: 12, ease: 'linear' }] },
      pulse: { amp: 0.04, freq: 0.2 }
    },
    background: { kind: 'none' },
    actor: {
      preset: 'bakasur-suspicious',
      faces: [{ t: 3.5, expression: 'annoyed' }],
      x: constTrack(400),
      y: constTrack(280),
      scale: constTrack(155),
      opacity: { keys: [{ t: 0, v: 0 }, { t: 0.8, v: 1, ease: 'smooth' }, { t: 7, v: 1 }] }
    },
    particles: [{ count: 12, seed: 44, sizeMin: 0.7, sizeMax: 1.6, opacity: 0.4, drift: 4, foreground: false }],
    effects: [{ kind: 'portalPulse', at: 5, dur: 1.5, amount: 0.08 }],
    choreography: {
      entrance: { kind: 'rise', t: 0.2, duration: 0.8 },
      gazeCues: [
        { t: 0, yaw: 20, pitch: -5, mix: 0.8, duration: 0.4 },
        { t: 3.5, yaw: -18, pitch: 2, mix: 0.85, duration: 0.5 }
      ],
      coupling: { rimResponse: 0.2, pulseCoupling: 0.1 },
      dialogueSync: { delay: 1.0, gazeAt: 1.8, speakAt: 2.2, reactAt: 5.0 },
      microMotion: { hoverAmp: 1.5, hoverFreq: 0.7, breathAmp: 0.018, breathFreq: 0.7, glowBreathAmp: 0.06 }
    },
    mood: 'tense',
    tags: ['close']
  },

  'bakasur-chaos': {
    id: 'bakasur-chaos',
    name: 'Chaos',
    description: 'Burst into orbit into comet: strongest effects, controlled camera, still coherent.',
    duration: 8,
    environment: {
      darkness: 0.08,
      glow: { keys: [{ t: 0, v: 0.6 }, { t: 3, v: 1.4, ease: 'smooth' }, { t: 8, v: 0.9 }] },
      glowX: 400,
      glowY: 260,
      vignette: 0.5,
      haze: { keys: [{ t: 0, v: 0.3 }, { t: 4, v: 0.6, ease: 'smooth' }, { t: 8, v: 0.4 }] }
    },
    camera: {
      x: { keys: [{ t: 0, v: 0 }, { t: 4, v: 22, ease: 'smooth' }, { t: 8, v: 0, ease: 'smooth' }] },
      y: constTrack(0),
      zoom: { keys: [{ t: 0, v: 1 }, { t: 4, v: 1.22, ease: 'smooth' }, { t: 8, v: 1.05 }] },
      rotation: { keys: [{ t: 0, v: 0 }, { t: 8, v: -4, ease: 'linear' }] },
      shake: { amp: 2.5, freq: 0.5 }
    },
    portal: {
      x: 400,
      y: 250,
      radius: 160,
      thickness: 6,
      opacity: { keys: [{ t: 0, v: 0.4 }, { t: 3, v: 0.85, ease: 'smooth' }, { t: 8, v: 0.6 }] },
      intensity: { keys: [{ t: 0, v: 0.7 }, { t: 3, v: 1.5, ease: 'smooth' }, { t: 8, v: 1 }] },
      rotation: { keys: [{ t: 0, v: 0 }, { t: 8, v: 60, ease: 'linear' }] },
      pulse: { amp: 0.06, freq: 0.4 },
      theme: 'moonlit'
    },
    background: { kind: 'none' },
    actor: {
      preset: 'bakasur-burst',
      timeline: {
        steps: [
          { intent: 'burst', duration: 2 },
          { intent: 'orbit', duration: 3 },
          { intent: 'comet', duration: 2 }
        ]
      },
      x: { keys: [{ t: 0, v: 400 }, { t: 4, v: 420, ease: 'smooth' }, { t: 8, v: 400, ease: 'smooth' }] },
      y: constTrack(275),
      scale: { keys: [{ t: 0, v: 0 }, { t: 0.8, v: 0, ease: 'hold' }, { t: 1.8, v: 165, ease: 'smooth' }, { t: 8, v: 160 }] },
      opacity: { keys: [{ t: 0, v: 0 }, { t: 0.8, v: 0, ease: 'hold' }, { t: 1.6, v: 1, ease: 'smooth' }, { t: 8, v: 1 }] }
    },
    particles: [
      { count: 28, seed: 55, sizeMin: 0.8, sizeMax: 2.2, opacity: 0.55, drift: 10, foreground: false },
      { count: 20, seed: 56, sizeMin: 1, sizeMax: 2.8, opacity: 0.4, drift: 16, foreground: true }
    ],
    effects: [
      { kind: 'portalPulse', at: 1, dur: 2, amount: 0.1 },
      { kind: 'glow', at: 2.5, dur: 3, amount: 0.35 },
      { kind: 'haze', at: 4, dur: 3, amount: 0.5 }
    ],
    choreography: {
      entrance: { kind: 'portal', t: 0.5, duration: 1.1 },
      gazeCues: [
        { t: 0, yaw: -10, pitch: 10, mix: 0.6, duration: 0.5 },
        { t: 4.0, yaw: 10, pitch: -10, mix: 0.7, duration: 0.8 }
      ],
      coupling: { rimResponse: 0.35, pulseCoupling: 0.25, arrivalSettleAt: 6.0 },
      dialogueSync: { delay: 1.8, gazeAt: 2.5, speakAt: 3.0, reactAt: 6.5 },
      microMotion: { hoverAmp: 5.0, hoverFreq: 1.0, breathAmp: 0.025, breathFreq: 0.8, glowBreathAmp: 0.12 }
    },
    mood: 'wild-joy',
    tags: ['energy']
  }
}

export const SCENE_IDS = Object.keys(CINEMATIC_SCENES)

export function getScene(id: string): CinematicScene {
  return CINEMATIC_SCENES[id] ?? CINEMATIC_SCENES['bakasur-awakening']!
}

export function listScenes(): CinematicScene[] {
  return SCENE_IDS.map((id) => CINEMATIC_SCENES[id]!)
}
