/*
 * Vendored from Bloub (https://github.com/jeremy-prt/bloub) src/bot/decor.ts
 * Copyright (c) 2026 Jérémy Perret — MIT License
 * Vendored for the BakaTracker Baksur visual prototype (V3.4.1).
 * Modifications: TRIMMED to the Baksur state subset (idle, thinking, wink,
 * wide, sleep). Dropped: orbit/comet/play ring & swoosh seeds (RINGS, SWOOSH,
 * COMET_*), burst particles, notification pastille constants (NOTIF_*), and
 * the `hue wheel` is retained only because `arcRender` needs it.
 * See NOTICE and docs/baksur/ASSET-LICENSES.md for attribution terms.
 */
import { TAU, r2 } from './math'

/* ------------------------------------------------------------- types de rendu */

export interface DotRender {
  x: number
  y: number
  r: number
  opacity: number
  /** couleur explicite ; par defaut le rendu prend celle du corps */
  color?: string
  /**
   * Brume de profondeur : 0 = fondu dans le fond, 1 = couleur du corps pleine.
   * Le melange se fait au rendu, qui seul connait la couleur choisie.
   */
  depth?: number
  /**
   * Forme non circulaire, en unites de rayon de boule et centree sur l'origine
   * (le point du "!" penche est une goutte, pas un disque). Quand elle est
   * fournie, `r` n'est plus utilise pour le trace.
   */
  d?: string
  /** rotation appliquee a `d`, en degres */
  rot?: number
}

/**
 * Ce qu'un etat declare : la geometrie de l'arc reste en unites de rayon de
 * boule, c'est le moteur (seul a connaitre l'echelle du viewBox) qui la
 * rasterise. Sans ca les etats devraient connaitre le viewBox.
 */
export interface ArcSpec {
  id: string
  seed: ArcSeed
  t: number
  opacity: number
}

export interface ArcRender {
  id: string
  /** portion devant le corps */
  front: string
  /** portion derriere le corps (dessinee avant, donc masquee par la silhouette) */
  back: string
  width: number
  opacity: number
  /** degrade de teinte le long du trace */
  grad: { x1: number; y1: number; x2: number; y2: number; stops: string[] }
}

/* --------------------------------------------------------- arc elliptique 3D */

export interface ArcSeed {
  /** demi-grand axe, en unites de rayon de boule */
  a: number
  /** aplatissement b/a : mesure <= 0.45, les plans d'orbite sont vus par la tranche */
  k: number
  /** inclinaison du grand axe a l'ecran, radians */
  tilt: number
  /** tours par seconde */
  speed: number
  phase: number
  /** fraction du tour reellement tracee */
  sweep: number
  hue: number
  hueSpan: number
  width: number
  cx: number
  cy: number
}

/**
 * Les anneaux ne sont pas des couleurs plates : la video montre une roue de
 * teintes complete a luminosite constante, avec un degrade le long de chaque
 * trace. Mesure : S 45-62 %, L 50-67 %.
 */
function wheel(hue: number, s = 0.55, l = 0.62): string {
  const h = ((hue % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  const hex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

/**
 * Projette un cercle 3D incline en orthographique.
 *
 * Le cercle vit dans le plan engendre par u (dans l'ecran) et v (qui plonge
 * dans la profondeur). La composante z sert a couper l'arc en deux : la moitie
 * arriere est dessinee avant le corps, donc occultee par lui. C'est ce vrai tri
 * en profondeur qui fait lire les anneaux comme des orbites et pas comme un
 * dessin plat.
 */
export function arcRender(seed: ArcSeed, t: number, scale: number, id: string, opacity = 1): ArcRender {
  const spin = seed.phase + t * seed.speed * TAU
  const cu = Math.cos(seed.tilt)
  const su = Math.sin(seed.tilt)
  const kz = Math.sqrt(Math.max(0, 1 - seed.k * seed.k))

  const N = 64
  const span = seed.sweep * TAU
  let front = ''
  let back = ''
  let prev: boolean | null = null

  for (let i = 0; i <= N; i++) {
    const th = spin + (i / N) * span
    const ct = Math.cos(th)
    const st = Math.sin(th)
    // u = (cos tilt, sin tilt, 0) ; v = (-sin tilt * k, cos tilt * k, kz)
    const x = seed.a * (ct * cu + st * -su * seed.k) + seed.cx
    const y = seed.a * (ct * su + st * cu * seed.k) + seed.cy
    const z = seed.a * st * kz

    const behind = z < 0
    const sx = r2(x * scale)
    const sy = r2(y * scale)
    const cmd = behind !== prev ? 'M' : 'L'
    if (behind) back += `${cmd}${sx} ${sy}`
    else front += `${cmd}${sx} ${sy}`
    prev = behind
  }

  const gx = Math.cos(seed.tilt) * seed.a * scale
  const gy = Math.sin(seed.tilt) * seed.a * scale
  return {
    id,
    front,
    back,
    width: seed.width * scale,
    opacity,
    grad: {
      x1: r2(seed.cx * scale - gx),
      y1: r2(seed.cy * scale - gy),
      x2: r2(seed.cx * scale + gx),
      y2: r2(seed.cy * scale + gy),
      stops: [wheel(seed.hue), wheel(seed.hue + seed.hueSpan * 0.5), wheel(seed.hue + seed.hueSpan)]
    }
  }
}

/* ------------------------------------------------------------------ 3 points */

/** x mesures : -0.557 / -0.013 / +0.532, y = 0. */
export const DOT_X = [-0.557, -0.013, 0.532] as const
export const DOT_R = 0.165
export const DOT_PEAK = 1.25
