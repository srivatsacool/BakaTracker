/*
 * Vendored from Bloub (https://github.com/jeremy-prt/bloub) src/bot/states.ts
 * Copyright (c) 2026 Jérémy Perret — MIT License
 * Vendored for the BakaTracker Baksur visual prototype (V3.4.1).
 * Modifications: TRIMMED from 14 states to the 5 required by
 * docs/baksur/ANIMATION.md — `idle` (IDLE), `thinking` (THINKING),
 * `wink` (reserved for HAPPY/CELEBRATE variants), `wide` (ALERT),
 * `sleep` (SLEEP). Dropped states and their private geometry helpers
 * (alert/exclaim `!` bars, egg, hexagon, play triangle, orbit, burst,
 * comet, swirl) and the SEQUENCE montage order. All kept numbers are
 * the original measured values, untouched.
 * V3.4.2: `thinking` and `sleep` poses REWORKED for Baksur (see the marked
 * blocks) — the character keeps his body in both states. The remaining
 * states are upstream verbatim.
 * See NOTICE and docs/baksur/ASSET-LICENSES.md for attribution terms.
 */
import { DOT_X, type ArcSpec, type DotRender } from './decor'
import { EYE_H, EYE_SPLIT, EYE_W, REST_GAZE, type HeadGaze } from './face'
import { TAU, clamp } from './math'
import { circle, type Silhouette } from './shape'

export interface EyeCfg {
  /** largeur locale (axe court de la gelule), en unites de rayon de boule */
  w: number
  /** hauteur locale (axe long) */
  h: number
  /** 1 = ouvert, 0 = ferme */
  open: number
  /**
   * Inclinaison propre de la gelule, en degres, positif = le haut part a
   * droite. Appliquee APRES le repere tangent de la sphere. Sans elle, les deux
   * yeux penchent forcement du meme cote (le roulis de tete) et la colere comme
   * la tristesse, qui demandent des inclinaisons en miroir, sont hors de portee.
   */
  tilt?: number
}

export interface Pose {
  /** silhouette du corps, en unites de rayon de boule */
  sil: Silhouette
  /** decalage global du corps ET des yeux */
  offX: number
  offY: number
  gaze: HeadGaze
  /** demi-ecart des yeux sur la sphere, en degres */
  split: number
  /** [oeil interieur, oeil exterieur] */
  eyes: [EyeCfg, EyeCfg]
  /** opacite des yeux : sert aux etats sans visage */
  eyeAlpha: number
  bodyAlpha: number
  dots: DotRender[]
  arcs: ArcSpec[]
  notif: { x: number; y: number; r: number; notch: number } | null
  /** true = le decor passe derriere le corps (particules de l'eclatement) */
  dotsBehind: boolean
}

const pair = (w: number, h: number): [EyeCfg, EyeCfg] => [
  { w, h, open: 1 },
  { w, h, open: 1 }
]

function base(over: Partial<Pose> = {}): Pose {
  return {
    sil: circle(1),
    offX: 0,
    offY: 0,
    gaze: { ...REST_GAZE },
    split: EYE_SPLIT,
    eyes: pair(EYE_W, EYE_H),
    eyeAlpha: 1,
    bodyAlpha: 1,
    dots: [],
    arcs: [],
    notif: null,
    dotsBehind: false,
    ...over
  }
}

/* ------------------------------------------------------------------ etats */

export type StateId =
  | 'idle'
  | 'thinking'
  | 'wink'
  | 'wide'
  | 'sleep'

export interface StateDef {
  id: StateId
  /** duree de maintien quand la sequence complete est jouee */
  duration: number
  /**
   * duree en dessous de laquelle l'animation est coupee avant d'aboutir.
   * Absente = l'etat ignore le temps ou boucle, n'importe quelle duree lui va.
   */
  minDuration?: number
  /** duree du morph d'entree */
  morph: number
  /** true = l'entree est masquee par un clignement, comme dans la video */
  blinkIn: boolean
  /**
   * true = le corps est la silhouette "au repos", donc remplacable par la forme
   * choisie. Les etats qui dessinent leur propre forme valent false : c'est
   * cette forme la qui EST l'animation.
   */
  baseBody: boolean
  /**
   * true = l'etat porte le visage "au repos", donc remplacable par l'expression
   * choisie. Seul `idle` dans ce sous-ensemble.
   */
  baseFace: boolean
  pose(local: number): Pose
}

/** Onde de pulsation qui parcourt les trois points de gauche a droite. */
function dotPulse(t: number, index: number): number {
  const p = ((((t - index * 0.5) / 1.5) % 1) + 1) % 1
  const k = p < 0.5 ? 0.5 - 0.5 * Math.cos(p * TAU) : 0
  return clamp(k * 2)
}

export const STATES: StateDef[] = [
  {
    id: 'idle',
    duration: 2.4,
    morph: 0.45,
    blinkIn: false,
    baseFace: true,
    baseBody: true,
    pose: () => base()
  },

  {
    // BAKATRACKER V3.4.2 REWORK (design-gate decision): the upstream `thinking`
    // morphs the body itself into the traveling dot (baseBody false, eyeAlpha 0).
    // Baksur must KEEP his body visible while thinking: horns/crest preserved
    // (baseBody true) + subtle compression pulse + half-lidded upward gaze + a
    // restrained trio of paper dots drifting above the crest. The dot-pulse wave
    // and easing are the ORIGINAL upstream `dotPulse` machinery, quieted: small
    // radius, low opacity, no body collapse.
    id: 'thinking',
    duration: 2.6,
    morph: 0.4,
    baseFace: false,
    baseBody: true,
    blinkIn: true,
    pose: (t) => {
      // Slow compress/release pulse, period 1.3s, amplitude ~3% height — reads
      // as a held breath, not a bounce.
      const k = 0.5 + 0.5 * Math.sin(t * (TAU / 1.3))
      return base({
        sil: circle(1, { sx: 1 + 0.02 * k, sy: 1 - 0.03 * k }),
        // head tips slightly up, eyes half-lidded, looking away-and-up: thinking
        gaze: { yaw: 12, pitch: 14, roll: -4 },
        eyes: [
          { w: 0.2, h: 0.34, open: 0.55 },
          { w: 0.2, h: 0.34, open: 0.55 }
        ],
        // the "…" above the crest: upstream wave, quieted and paper-coloured
        dots: [0, 1, 2].map((i) => ({
          x: DOT_X[i]! * 0.55,
          y: -1.34 - DOT_X[i]! * 0.06,
          r: 0.055 * (1 + 0.25 * dotPulse(t, i)),
          opacity: 0.18 + 0.26 * dotPulse(t, i),
          color: '#e9e6f2'
        }))
      })
    }
  },

  {
    id: 'wink',
    duration: 1.6,
    morph: 0.3,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: () =>
      base({
        gaze: { yaw: -5.37, pitch: 4.55, roll: 6.7 },
        split: 16.25,
        // L'oeil ferme n'est pas l'oeil ouvert ecrase : c'est un tiret
        // horizontal PLUS LARGE que l'oeil ouvert (0.447 contre 0.236).
        eyes: [
          { w: 0.236, h: 0.464, open: 1 },
          { w: 0.447, h: 0.089, open: 1 }
        ]
      })
  },

  {
    id: 'wide',
    duration: 1.8,
    morph: 0.55,
    blinkIn: true,
    baseFace: false,
    baseBody: true,
    pose: () =>
      base({
        gaze: { yaw: 6.92, pitch: -21.96, roll: 11.6 },
        split: 18.43,
        eyes: pair(0.356, 0.875)
      })
  },

  {
    // BAKATRACKER V3.4.2 REWORK (design-gate decision): the upstream `sleep`
    // collapses the body to a tiny bouncing dot (baseBody false, eyeAlpha 0).
    // Baksur must stay recognizable while asleep: full horned body gently
    // squashed, slow breathing (3 s period, ~1.5% amplitude), eyes closed as
    // horizontal slits, head tipped down. No bounce, no collapse.
    id: 'sleep',
    duration: 3.0,
    morph: 0.5,
    baseFace: false,
    baseBody: true,
    blinkIn: false,
    pose: (t) => {
      // Slow diaphragm breath: body flattens as it settles, rises as it eases.
      const b = Math.sin(t * (TAU / 3))
      return base({
        sil: circle(1, { sx: 1.05 - 0.012 * b, sy: 0.9 - 0.018 * b, cy: 0.05 + 0.012 * b }),
        gaze: { yaw: 2, pitch: -16, roll: -8 },
        split: 14,
        // closed lids read as horizontal dashes, slightly wider than open eyes
        eyes: pair(0.3, 0.05),
        eyeAlpha: 0.85
      })
    }
  }
]

export const STATE_BY_ID = new Map(STATES.map((s) => [s.id, s]))

/**
 * Date, en temps local, ou chaque etat est le plus lisible : c'est la pose que
 * montrent les vignettes. Rendu deterministe, donc comparable d'une execution
 * a l'autre. Le type force a couvrir tout nouvel etat.
 */
export const POSES: Record<StateId, number> = {
  idle: 1,
  thinking: 1.1,
  wink: 0.8,
  wide: 0.8,
  sleep: 0.45
}
