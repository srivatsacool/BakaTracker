/*
 * BAKASUR-UI — Original Bakasur work (Phase 5).
 *
 * Full state matrix: every upstream StateId as a Bakasur intent.
 * Rule of the table: the vehicle ALWAYS keeps the Bakasur body
 * (baseBody=true: idle/wink/wide/notify/swirl). Anything upstream did by
 * REPLACING the body is remapped into posture (shape variants), face
 * (Bakasur expressions where the vehicle honours them), gaze bias, glow
 * and dim — or, where no coherent vehicle exists, marked SPECIAL with a
 * documented Bakasur-native equivalent.
 *
 * Data only. Resolution/apply logic lives in index.ts.
 */
import type { BakasurAnimationDef } from './types'

const CALM: BakasurAnimationDef['treatment'] = { dim: 0, glow: 1 }

export const BAKASUR_ANIMATIONS: BakasurAnimationDef[] = [
  {
    intent: 'idle',
    disposition: 'KEEP',
    vehicle: 'idle',
    expression: 'neutral',
    shape: 'bakasur',
    look: null,
    treatment: CALM,
    semantics: 'Breathing, deterministic blink, micro-drift and gaze — untouched.',
    dropped: 'Nothing.'
  },
  {
    intent: 'thinking',
    disposition: 'REMAP',
    vehicle: 'idle',
    expression: 'curious',
    shape: 'bakasur-thinking',
    look: null,
    treatment: { dim: 0.12, glow: 1 },
    semantics: 'Held-breath compression (shape variant), half-lidded curious face, dimmed key.',
    dropped: 'Body-collapse into the travelling dot (identity break); side-dot pulse (tied to the collapsed body). No replacement particles: render invents nothing.'
  },
  {
    intent: 'wink',
    disposition: 'KEEP',
    vehicle: 'wink',
    expression: null,
    shape: 'bakasur',
    look: null,
    treatment: CALM,
    semantics: 'Asymmetric celebratory face and blink-in timing — untouched, on the Bakasur body.',
    dropped: 'Nothing.'
  },
  {
    intent: 'wide',
    disposition: 'KEEP',
    vehicle: 'wide',
    expression: null,
    shape: 'bakasur',
    look: null,
    treatment: CALM,
    semantics: 'Wide-eyed surprise pose — untouched, on the Bakasur body.',
    dropped: 'Nothing.'
  },
  {
    intent: 'alert',
    disposition: 'REMAP',
    vehicle: 'wide',
    expression: null,
    shape: 'bakasur',
    look: { yaw: -6, pitch: -6, mix: 0.55 },
    treatment: { dim: 0, glow: 1.6 },
    semantics: 'Alert = wide vehicle + fixed stare bias + heightened rim (posture/scale pulse read).',
    dropped: 'Travelling "!" bar + teardrop (unrelated silhouette, tilt 17.7deg buzz). Emphasis moves to glow + stare.'
  },
  {
    intent: 'notify',
    disposition: 'ADAPT',
    vehicle: 'notify',
    expression: null,
    shape: 'bakasur',
    look: null,
    treatment: { dim: 0, glow: 1.2 },
    semantics: 'Sanctioned pop (NOTIF_POP 1.14), opposite-side gaze, notch — same vehicle, Bakasur pastille/effects via the renderer.',
    dropped: 'Upstream blue pastille identity (recoloured to Bakasur violet by construction).'
  },
  {
    intent: 'exclaim',
    disposition: 'REMAP',
    vehicle: 'wide',
    expression: null,
    shape: 'bakasur',
    look: { yaw: 0, pitch: 14, mix: 0.7 },
    treatment: { dim: 0, glow: 1.8 },
    semantics: 'Emphasis beat: wide vehicle + snapped-up gaze + strongest sanctioned glow.',
    dropped: 'Upright "!" bar + dot (unrelated silhouette). Distinguished from alert by gaze direction and glow weight.'
  },
  {
    intent: 'sleep',
    disposition: 'REMAP',
    vehicle: 'idle',
    expression: 'sleepy',
    shape: 'bakasur-rest',
    look: null,
    treatment: { dim: 0.35, glow: 0.8 },
    semantics: 'Settled rest shape, slit sleepy face, dimmed key and rim, engine breath/blink continue underneath.',
    dropped: 'Collapse to the bouncing dot (identity break) and eyeAlpha 0. Slower breathing is engine-fixed; dimming carries the settle.'
  },
  {
    intent: 'egg',
    disposition: 'SPECIAL',
    vehicle: 'idle',
    expression: 'proud',
    shape: 'bakasur',
    look: null,
    treatment: { dim: 0.05, glow: 1.3 },
    semantics: 'Cocoon reading: gathered proud stillness + raised glow. The upstream squeeze is NOT reproduced.',
    dropped: 'Egg silhouette morph (measured profile tied to the upstream body; no coherent Bakasur equivalent).'
  },
  {
    intent: 'hexagon',
    disposition: 'SPECIAL',
    vehicle: 'idle',
    expression: 'curious',
    shape: 'bakasur',
    look: null,
    treatment: { dim: 0, glow: 1.1 },
    semantics: 'Held display beat with curious attention. Geometric morph dropped as catalogue-completeness-only.',
    dropped: 'Hexagon silhouette morph (no visually convincing Bakasur transformation; motion concept kept as stillness).'
  },
  {
    intent: 'play',
    disposition: 'REMAP',
    vehicle: 'idle',
    expression: 'happy',
    shape: 'bakasur',
    look: null,
    treatment: { dim: 0, glow: 1.25 },
    semantics: 'Playful beat via happy face + lifted glow; stillness where the triangle sat.',
    dropped: 'Spinning triangle + swoosh sweep (both tied to the measured triangle vehicle).'
  },
  {
    intent: 'orbit',
    disposition: 'REMAP',
    vehicle: 'swirl',
    expression: 'excited',
    shape: 'bakasur',
    look: null,
    treatment: { dim: 0, glow: 1.2 },
    semantics: 'Orbital motion via swirl rings (3, staggered) on the intact Bakasur body + excited face; rings recoloured to Bakasur violet.',
    dropped: 'Triangle-to-ball body morph, 6-ring rainbow bouquet, 3x eye whirl (all bound to the replaced body).'
  },
  {
    intent: 'burst',
    disposition: 'REMAP',
    vehicle: 'notify',
    expression: null,
    shape: 'bakasur',
    look: null,
    treatment: { dim: 0, glow: 1.7 },
    semantics: 'Celebration energy via the sanctioned pop + pastille + high glow on the intact body.',
    dropped: 'Collapse-to-nothing + depth particles (energy tied to the vanished body). No invented render particles.'
  },
  {
    intent: 'comet',
    disposition: 'REMAP',
    vehicle: 'swirl',
    expression: 'surprised',
    shape: 'bakasur',
    look: null,
    treatment: { dim: 0, glow: 1.2 },
    semantics: 'Trail concept via swirl rings + surprised face; distinguished from orbit by face and (Phase 6) preset context.',
    dropped: 'Dot collapse + comet ribbons (rainbow, bound to the collapsed body).'
  },
  {
    intent: 'swirl',
    disposition: 'UI-ONLY',
    vehicle: 'swirl',
    expression: 'neutral',
    shape: 'bakasur',
    look: null,
    treatment: CALM,
    semantics: 'Interface transition (settings-entry choreography): rings + rest face + shape morph on the Bakasur body.',
    dropped: 'Nothing. Resolvable in timelines but intended for transitions, not beats.'
  }
]
