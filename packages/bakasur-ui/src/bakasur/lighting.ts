/*
 * BAKASUR-UI — Original Bakasur work (Phase 3).
 *
 * Bakasur lighting treatment, expressed as DATA (not engine math): where the
 * key light sits, how it falls off, how strong the rim bloom is. render.ts
 * turns this into SVG gradient/filter nodes; nothing here touches the
 * engine's interpolation, timing or morphing.
 *
 * All values are CHOICES, not measurements: the goal is a restrained
 * cinematic read — one soft top-left key, one faint outer bloom — at every
 * size. If a value ever needs adaptive behaviour (e.g. weaker bloom on tiny
 * renders), it changes HERE, behind this interface.
 */

export interface BakasurLighting {
  /** Key-light focal point in gradient units (0..1 across the body box). */
  keyX: number
  keyY: number
  /** Gradient stops: offset + colour + opacity. Must end transparent. */
  stops: ReadonlyArray<readonly [offset: number, color: string, opacity: number]>
  /** Rim bloom: flood colour, flood opacity, blur radius (viewBox units). */
  rimColor: string
  rimOpacity: number
  rimBlur: number
  /** Whole-character aura behind the body (viewBox units, 0 disables). */
  auraBlur: number
  auraOpacity: number
  /** Core ambient shadow opposite the key light for spherical 3D depth. */
  shadowX: number
  shadowY: number
  shadowRadius: number
  shadowOpacity: number
  /** Specular highlight sheen for surface luster and dimension. */
  sheenX: number
  sheenY: number
  sheenRadius: number
  sheenOpacity: number
  /** Surface micro-texture grain opacity (0..1). */
  textureOpacity: number
}

export const BAKASUR_LIGHTING: BakasurLighting = {
  keyX: 0.32,
  keyY: 0.24,
  stops: [
    [0, '#a855f7', 0.62],
    [0.45, '#a855f7', 0.24],
    [1, '#a855f7', 0]
  ],
  rimColor: '#bf5af2',
  rimOpacity: 0.85,
  rimBlur: 14,
  auraBlur: 36,
  auraOpacity: 0.4,
  shadowX: 0.74,
  shadowY: 0.82,
  shadowRadius: 0.9,
  shadowOpacity: 0.52,
  sheenX: 0.28,
  sheenY: 0.18,
  sheenRadius: 0.36,
  sheenOpacity: 0.32,
  textureOpacity: 0
}

