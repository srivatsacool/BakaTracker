/*
 * Vendored from Bloub (https://github.com/jeremy-prt/bloub) src/bot/expressions.ts
 * Copyright (c) 2026 Jérémy Perret — MIT License
 * Vendored verbatim for the BakaTracker Baksur visual prototype (V3.4.1).
 * Modifications: none (this provenance header only).
 * See NOTICE and docs/baksur/ASSET-LICENSES.md for attribution terms.
 */
import { EYE_SPLIT, EYE_W, REST_GAZE, type HeadGaze } from './face'
import { lerp } from './math'
import type { EyeCfg } from './states'

/**
 * Expression de repos du bot.
 *
 * Le visage ne tient qu'Ã  deux gÃ©lules, donc tout se joue sur quatre leviers :
 * l'orientation de la tÃªte, l'Ã©cart des yeux, leurs proportions, et
 * l'inclinaison propre de chaque Å“il. C'est ce dernier qui permet la colÃ¨re et
 * la tristesse : elles demandent des inclinaisons EN MIROIR (les hauts qui
 * convergent ou divergent), impossible avec le seul roulis de tÃªte qui incline
 * les deux yeux du mÃªme cÃ´tÃ©.
 *
 * Seul l'Ã©tat de repos porte cette expression. Les Ã©tats expressifs de la vidÃ©o
 * (clin d'Å“il, yeux Ã©carquillÃ©s, notification) gardent la leur : c'est elle
 * qu'on est venu reproduire.
 *
 * Les amplitudes s'appuient sur bible-strong-avatar-lab, qui expose le mÃªme
 * modÃ¨le (tÃªte X/Y/Z, largeur et hauteur par Å“il, Ã©cart, angle par Å“il) : chez
 * eux la largeur va de 0,8 Ã  2,7 fois le neutre, la hauteur de 0,3 Ã  1,5, et
 * les angles jusqu'Ã  Â±80Â°. On reste dans cette enveloppe.
 */
/** Enumeres pour que la couche i18n verifie leurs traductions a la compilation. */
export type ExpressionId =
  | 'neutre'
  | 'attentif'
  | 'surpris'
  | 'excite'
  | 'heureux'
  | 'hilare'
  | 'colere'
  | 'triste'
  | 'effraye'
  | 'mefiant'
  | 'confus'
  | 'curieux'
  | 'fier'
  | 'timide'
  | 'blase'
  | 'somnolent'

export interface BotExpression {
  id: ExpressionId
  gaze: HeadGaze
  split: number
  eyes: [EyeCfg, EyeCfg]
}

/** `tilt` en degrÃ©s, positif = le haut de la gÃ©lule part vers la droite. */
const eye = (w: number, h: number, tilt = 0, open = 1): EyeCfg => ({ w, h, tilt, open })

/** Les deux yeux identiques, inclinaisons en miroir si `tilt` est fourni. */
const pair = (w: number, h: number, tilt = 0, open = 1): [EyeCfg, EyeCfg] => [
  eye(w, h, tilt, open),
  eye(w, h, -tilt, open)
]

export const EXPRESSIONS: BotExpression[] = [
  {
    // V3.5 idle: légèrement plus grand et asymétrique pour lisibilité accrue.
    // L'œil intérieur est 2% plus large (aspect moqueur discret). Le split
    // est élargi de 0.5° pour ouvrir le visage. La hauteur passe de 0.412
    // à 0.46 : plus de surface = meilleure lecture à petite taille.
    id: 'neutre',
    gaze: { ...REST_GAZE },
    split: EYE_SPLIT + 0.5,
    eyes: [eye(EYE_W + 0.014, 0.46), eye(EYE_W - 0.004, 0.46)]
  },
  {
    id: 'attentif',
    gaze: { yaw: 4, pitch: 5, roll: -4 },
    split: 16,
    eyes: pair(0.21, 0.44)
  },
  {
    id: 'surpris',
    gaze: { yaw: 3, pitch: -3, roll: 0 },
    split: 19,
    eyes: pair(0.45, 0.47)
  },
  {
    id: 'excite',
    gaze: { yaw: 6, pitch: -14, roll: 0 },
    split: 19.5,
    eyes: pair(0.4, 0.56, -10)
  },
  {
    // yeux plissÃ©s en arc : les hauts convergent lÃ©gÃ¨rement
    id: 'heureux',
    gaze: { yaw: 5, pitch: 9, roll: 0 },
    split: 17,
    eyes: pair(0.27, 0.17, 14)
  },
  {
    id: 'hilare',
    gaze: { yaw: 4, pitch: 14, roll: 0 },
    split: 18,
    eyes: pair(0.34, 0.13, 20)
  },
  {
    // hauts des yeux qui convergent fort vers le centre + yeux Ã©trÃ©cis
    id: 'colere',
    gaze: { yaw: 3, pitch: 7, roll: 0 },
    split: 17,
    eyes: pair(0.34, 0.15, 30)
  },
  {
    // l'inverse : les hauts divergent, et le regard tombe
    id: 'triste',
    gaze: { yaw: 3, pitch: -13, roll: 0 },
    split: 16,
    eyes: pair(0.22, 0.4, -28)
  },
  {
    id: 'effraye',
    gaze: { yaw: 2, pitch: -20, roll: 0 },
    split: 20.5,
    eyes: pair(0.4, 0.6)
  },
  {
    // V3.5: yeux ovales homogènes (hauteur 0.40 et 0.36) pour éviter l'effet rond-vs-pilule,
    // tout en gardant une légère asymétrie naturelle de regard.
    id: 'mefiant',
    gaze: { yaw: 12, pitch: 6, roll: -6 },
    split: 16,
    eyes: [eye(0.21, 0.40), eye(0.19, 0.36)]
  },
  {
    // asymÃ©trique sur les deux axes : tailles ET inclinaisons dÃ©pareillÃ©es.
    // L'Å“il plissÃ© est volontairement plat (rapport 1,6) : Ã  un rapport proche
    // de 1 il serait rond, et son inclinaison ne se verrait pas.
    id: 'confus',
    gaze: { yaw: -14, pitch: 3, roll: 8 },
    split: 16.5,
    eyes: [eye(0.2, 0.44, -18), eye(0.28, 0.17, 14)]
  },
  {
    // la tÃªte penche : c'est le roulis qui porte la curiositÃ©
    id: 'curieux',
    gaze: { yaw: 16, pitch: -9, roll: -15 },
    split: 16.5,
    eyes: [eye(0.24, 0.46, -8), eye(0.2, 0.38, -8)]
  },
  {
    id: 'fier',
    gaze: { yaw: 5, pitch: 17, roll: 0 },
    split: 17,
    eyes: pair(0.3, 0.15, 18)
  },
  {
    id: 'timide',
    gaze: { yaw: -19, pitch: -14, roll: -7 },
    split: 14,
    eyes: pair(0.17, 0.3)
  },
  {
    // fentes horizontales et regard qui part sur le cÃ´tÃ©
    id: 'blase',
    gaze: { yaw: -22, pitch: 2, roll: 0 },
    split: 16,
    eyes: pair(0.3, 0.12)
  },
  {
    // paupiÃ¨res Ã  moitiÃ© tombÃ©es : on passe par `open`, donc l'Ã©crasement
    // vertical Ã  l'Ã©cran, le mÃªme mÃ©canisme que le clignement
    id: 'somnolent',
    gaze: { yaw: 6, pitch: -9, roll: -3 },
    split: 16,
    eyes: pair(0.2, 0.42, 0, 0.42)
  }
]

export const EXPRESSION_BY_ID = new Map<string, BotExpression>(EXPRESSIONS.map((e) => [e.id, e]))
export const DEFAULT_EXPRESSION = 'neutre'

const lerpEyeCfg = (a: EyeCfg, b: EyeCfg, t: number): EyeCfg => ({
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  tilt: lerp(a.tilt ?? 0, b.tilt ?? 0, t),
  open: lerp(a.open, b.open, t)
})

/** Interpolation de deux expressions : le changement se fait en glissant. */
export function blendExpression(a: BotExpression, b: BotExpression, t: number): BotExpression {
  return {
    id: b.id,
    gaze: {
      yaw: lerp(a.gaze.yaw, b.gaze.yaw, t),
      pitch: lerp(a.gaze.pitch, b.gaze.pitch, t),
      roll: lerp(a.gaze.roll, b.gaze.roll, t)
    },
    split: lerp(a.split, b.split, t),
    eyes: [lerpEyeCfg(a.eyes[0], b.eyes[0], t), lerpEyeCfg(a.eyes[1], b.eyes[1], t)]
  }
}

