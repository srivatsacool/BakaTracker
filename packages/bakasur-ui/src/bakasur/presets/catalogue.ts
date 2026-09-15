/*
 * BAKASUR-UI — Original Bakasur work (Phase 6).
 *
 * Preset + personality catalogue. Every entry is a COMPOSITION of the
 * underlying systems (intent + face + shape + theme + treatment + timing) —
 * no inline geometry, no SVG, no render logic. Data only; resolution lives
 * in validate.ts, application in index.ts.
 *
 * Expression-driven presets ride the idle vehicle (the only vehicle besides
 * swirl that honours faces); system/cinematic presets reuse their Phase 5
 * intents verbatim so Phase 5 behaviour is preserved, not reimplemented.
 */

import type { BakasurPersonality, BakasurPersonalityId, BakasurPresetDef, BakasurPresetId, BakasurPresetInput } from './types'

export const BAKASUR_PRESETS: Record<BakasurPresetId, BakasurPresetDef> = {
  /* CORE — resting vocabulary. */
  'bakasur-idle': {
    id: 'bakasur-idle',
    name: 'Idle',
    description: 'Resting presence: breathing, blink, drift. Untouched.',
    animation: 'idle',
    theme: 'void-violet',
    tags: ['core', 'rest'],
    mood: 'flat'
  },
  'bakasur-thinking': {
    id: 'bakasur-thinking',
    name: 'Thinking',
    description: 'Held-breath compression, curious face, dimmed key.',
    animation: 'thinking',
    theme: 'void-violet',
    timeline: {
      steps: [
        { intent: 'idle', duration: 1 },
        { intent: 'thinking', duration: 2.5 }
      ]
    },
    tags: ['core'],
    mood: 'inquiring'
  },
  'bakasur-attentive': {
    id: 'bakasur-attentive',
    name: 'Attentive',
    description: 'Notices something: idle vehicle, attentive face.',
    animation: 'idle',
    expression: 'attentive',
    theme: 'void-violet',
    tags: ['core'],
    mood: 'bright'
  },
  'bakasur-curious': {
    id: 'bakasur-curious',
    name: 'Curious',
    description: 'Held display beat with curious attention (hexagon intent).',
    animation: 'hexagon',
    theme: 'moonlit',
    tags: ['core'],
    mood: 'inquiring'
  },
  'bakasur-suspicious': {
    id: 'bakasur-suspicious',
    name: 'Suspicious',
    description: 'Judging sidelong: idle vehicle, suspicious face.',
    animation: 'idle',
    expression: 'suspicious',
    theme: 'void-violet',
    timeline: {
      steps: [
        { intent: 'idle', duration: 0.8 },
        { intent: 'idle', duration: 2 }
      ]
    },
    tags: ['core'],
    mood: 'wary'
  },
  'bakasur-confused': {
    id: 'bakasur-confused',
    name: 'Confused',
    description: 'Does not understand: mismatched face on the idle vehicle.',
    animation: 'idle',
    expression: 'confused',
    theme: 'void-violet',
    tags: ['core'],
    mood: 'lost'
  },

  /* REACTION — one face each, all on the face-honouring idle vehicle. */
  'bakasur-surprised': {
    id: 'bakasur-surprised',
    name: 'Surprised',
    description: 'Sudden discovery: widened face, still body.',
    animation: 'idle',
    expression: 'surprised',
    theme: 'moonlit',
    tags: ['reaction'],
    mood: 'startled'
  },
  'bakasur-excited': {
    id: 'bakasur-excited',
    name: 'Excited',
    description: 'Positive energy without the orbital rings (see bakasur-orbit).',
    animation: 'idle',
    expression: 'excited',
    theme: 'ember-violet',
    tags: ['reaction'],
    mood: 'electric'
  },
  'bakasur-happy': {
    id: 'bakasur-happy',
    name: 'Happy',
    description: 'Playful beat: the play intent, untouched.',
    animation: 'play',
    theme: 'void-violet',
    tags: ['reaction'],
    mood: 'warm'
  },
  'bakasur-laughing': {
    id: 'bakasur-laughing',
    name: 'Laughing',
    description: 'Stronger positive: flatter arcs, higher gaze.',
    animation: 'idle',
    expression: 'laughing',
    theme: 'ember-violet',
    tags: ['reaction'],
    mood: 'joyful'
  },
  'bakasur-annoyed': {
    id: 'bakasur-annoyed',
    name: 'Annoyed',
    description: 'Restrained irritation, convergent tilt.',
    animation: 'idle',
    expression: 'annoyed',
    theme: 'void-violet',
    tags: ['reaction'],
    mood: 'irritated'
  },
  'bakasur-angry': {
    id: 'bakasur-angry',
    name: 'Angry',
    description: 'Strong negative: tight slits, steep crowns.',
    animation: 'idle',
    expression: 'angry',
    theme: 'ember-violet',
    tags: ['reaction'],
    mood: 'furious'
  },
  'bakasur-scared': {
    id: 'bakasur-scared',
    name: 'Scared',
    description: 'Danger: widest set, roundest, gaze down.',
    animation: 'idle',
    expression: 'scared',
    theme: 'spectral',
    tags: ['reaction'],
    mood: 'alarmed'
  },
  'bakasur-proud': {
    id: 'bakasur-proud',
    name: 'Proud',
    description: 'Gathered cocoon stillness, raised glow (egg intent).',
    animation: 'egg',
    theme: 'moonlit',
    tags: ['reaction'],
    mood: 'smug'
  },
  'bakasur-unimpressed': {
    id: 'bakasur-unimpressed',
    name: 'Unimpressed',
    description: 'Deadpan judgment sliding off to the side.',
    animation: 'idle',
    expression: 'unimpressed',
    theme: 'spectral',
    tags: ['reaction'],
    mood: 'dismissive'
  },
  'bakasur-sleepy': {
    id: 'bakasur-sleepy',
    name: 'Sleepy',
    description: 'Settled rest shape, slit face, dimmed key (sleep intent).',
    animation: 'sleep',
    theme: 'spectral',
    tags: ['reaction', 'rest'],
    mood: 'drowsy'
  },
  'bakasur-mischievous': {
    id: 'bakasur-mischievous',
    name: 'Mischievous',
    description: 'Plotting: uneven openness, sidelong, deliberate.',
    animation: 'idle',
    expression: 'mischievous',
    theme: 'void-violet',
    tags: ['reaction'],
    mood: 'scheming'
  },
  'bakasur-deadpan': {
    id: 'bakasur-deadpan',
    name: 'Deadpan',
    description: 'Level stare: flat narrow slits, dead level gaze.',
    animation: 'idle',
    expression: 'deadpan',
    theme: 'spectral',
    tags: ['reaction'],
    mood: 'flat'
  },

  /* SYSTEM — Phase 5 intents verbatim. */
  'bakasur-notify': {
    id: 'bakasur-notify',
    name: 'Notify',
    description: 'Sanctioned pop + violet pastille (notify intent).',
    animation: 'notify',
    theme: 'void-violet',
    tags: ['system'],
    mood: 'bright'
  },
  'bakasur-alert': {
    id: 'bakasur-alert',
    name: 'Alert',
    description: 'Wide vehicle + fixed stare + heightened rim (alert intent).',
    animation: 'alert',
    theme: 'ember-violet',
    tags: ['system'],
    mood: 'alarmed'
  },
  'bakasur-exclaim': {
    id: 'bakasur-exclaim',
    name: 'Exclaim',
    description: 'Emphasis beat: snapped-up gaze, strongest glow.',
    animation: 'exclaim',
    theme: 'ember-violet',
    tags: ['system'],
    mood: 'startled'
  },

  /* CINEMATIC-READY — ring/pastille vehicles, faces where honoured. */
  'bakasur-orbit': {
    id: 'bakasur-orbit',
    name: 'Orbit',
    description: 'Orbital rings on the intact body + excited face.',
    animation: 'orbit',
    theme: 'void-violet',
    tags: ['cinematic'],
    mood: 'electric'
  },
  'bakasur-comet': {
    id: 'bakasur-comet',
    name: 'Comet',
    description: 'Trail concept via swirl rings + surprised face.',
    animation: 'comet',
    theme: 'moonlit',
    tags: ['cinematic'],
    mood: 'startled'
  },
  'bakasur-burst': {
    id: 'bakasur-burst',
    name: 'Burst',
    description: 'Celebration energy: sanctioned pop + high glow.',
    animation: 'burst',
    theme: 'ember-violet',
    tags: ['cinematic'],
    mood: 'joyful'
  }
}

export const BAKASUR_PRESET_IDS = Object.keys(BAKASUR_PRESETS) as BakasurPresetId[]

export function getBakasurPreset(id: string): BakasurPresetDef | undefined {
  return (BAKASUR_PRESETS as Record<string, BakasurPresetDef>)[id]
}

export function listBakasurPresets(): BakasurPresetDef[] {
  return BAKASUR_PRESET_IDS.map((id) => BAKASUR_PRESETS[id]!)
}

/* Personalities — higher-level, still data. Intensity maps to glow as
 * glow = 1 + intensity * 0.8 (max 1.64, inside the 0.5..2 contract). */

export const BAKASUR_PERSONALITIES: Record<BakasurPersonalityId, BakasurPersonality> = {
  calm: {
    id: 'calm',
    name: 'Calm',
    description: 'Resting watchfulness. Barely there, faintly judging.',
    expression: 'neutral',
    animation: 'idle',
    theme: 'void-violet',
    intensity: 0.15,
    idleBehaviour: 'long settles, slow drift',
    tags: ['baseline'],
    blurb: 'The default room tone of Bakasur.'
  },
  curious: {
    id: 'curious',
    name: 'Curious',
    description: 'Investigating: mismatched eyes, gaze slid aside.',
    expression: 'curious',
    animation: 'thinking',
    theme: 'moonlit',
    intensity: 0.5,
    idleBehaviour: 'leans into new stimuli',
    tags: ['engaged'],
    blurb: 'Something caught its attention.'
  },
  suspicious: {
    id: 'suspicious',
    name: 'Suspicious',
    description: 'Judging/questioning: one eye narrowed, sidelong.',
    expression: 'suspicious',
    animation: 'idle',
    theme: 'void-violet',
    intensity: 0.55,
    idleBehaviour: 'sidelong holds',
    tags: ['wary'],
    blurb: 'Not convinced. Prove it.'
  },
  chaotic: {
    id: 'chaotic',
    name: 'Chaotic',
    description: 'Positive overload: excited face, ember heat, high glow.',
    expression: 'excited',
    animation: 'play',
    theme: 'ember-violet',
    intensity: 0.9,
    idleBehaviour: 'short beats, quick returns',
    tags: ['energetic'],
    blurb: 'Too much energy for one body.'
  },
  smug: {
    id: 'smug',
    name: 'Smug',
    description: 'Self-satisfied plotting: mischief on the cocoon stillness.',
    expression: 'mischievous',
    animation: 'egg',
    theme: 'moonlit',
    intensity: 0.6,
    idleBehaviour: 'gathered stillness',
    tags: ['wary'],
    blurb: 'Knows something you do not.'
  },
  sleepy: {
    id: 'sleepy',
    name: 'Sleepy',
    description: 'Low energy: settled rest, half-lidded, dimmed.',
    expression: 'sleepy',
    animation: 'sleep',
    theme: 'spectral',
    intensity: 0.2,
    idleBehaviour: 'long settles, stays down',
    tags: ['rest'],
    blurb: 'Running on fumes.'
  },
  excited: {
    id: 'excited',
    name: 'Excited',
    description: 'Orbital joy: rings, lifted glow, electric face.',
    expression: 'excited',
    animation: 'orbit',
    theme: 'ember-violet',
    intensity: 0.85,
    idleBehaviour: 'bursts, then settles',
    tags: ['energetic'],
    blurb: 'Something good just happened.'
  },
  unimpressed: {
    id: 'unimpressed',
    name: 'Unimpressed',
    description: 'Deadpan dismissal in cool spectral light.',
    expression: 'unimpressed',
    animation: 'idle',
    theme: 'spectral',
    intensity: 0.45,
    idleBehaviour: 'looks away, stays flat',
    tags: ['dismissive'],
    blurb: 'Seen better. Possibly today.'
  }
}

export const BAKASUR_PERSONALITY_IDS = Object.keys(BAKASUR_PERSONALITIES) as BakasurPersonalityId[]

export function getBakasurPersonality(id: string): BakasurPersonality | undefined {
  return (BAKASUR_PERSONALITIES as Record<string, BakasurPersonality>)[id]
}

export function listBakasurPersonalities(): BakasurPersonality[] {
  return BAKASUR_PERSONALITY_IDS.map((id) => BAKASUR_PERSONALITIES[id]!)
}

/** Personality → preset input, through the same validation pipeline. */
export function personalityInput(p: BakasurPersonality): BakasurPresetInput {
  return {
    animation: p.animation,
    expression: p.expression,
    theme: p.theme,
    treatment: { glow: 1 + p.intensity * 0.8 }
  }
}
