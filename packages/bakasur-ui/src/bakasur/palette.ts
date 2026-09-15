/*
 * BAKASUR-UI — Original Bakasur work (Phase 3).
 *
 * Bakasur palette: near-black violet body, deep-purple internal light, pale
 * glowing eyes, void background. Authored values, not sampled from any
 * reference video and not taken from the upstream customiser (whose default
 * body is `encre #0a0a0c` on a light page). The violet family matches the
 * BakaTracker product identity Bakasur will eventually live in.
 *
 * Restraint rules (bound in docs/BAKASUR-DESIGN.md):
 * - one key light only (top-left), low alpha stops — the silhouette must read
 *   as the same dark form at 24px and at 320px;
 * - no strokes anywhere in the render (see render.ts): rim presence comes
 *   from a soft bloom filter, never an outline;
 * - eyes are pale, not white-hot: contrast against the body does the glowing.
 */

/** Body base: deep dark violet-black. */
export const BAKASUR_BODY_BASE = '#0d0618'

/** Internal illumination: vibrant electric purple key light wash. */
export const BAKASUR_INNER_LIGHT = '#a855f7'

/** Rim/bloom flood colour: intense neon purple glow. */
export const BAKASUR_RIM = '#bf5af2'

/** Eyes: pure white-hot glowing center. */
export const BAKASUR_EYE_GLOW = '#ffffff'

/** Notification pastille & blush: neon pink accent. */
export const BAKASUR_PASTILLE = '#ff4499'

/** Void: deep cosmic dark space. */
export const BAKASUR_VOID = '#05020c'

/** Notification pastille: kept from the engine for animation compatibility. */
export { NOTIF_BLUE } from '../engine/decor'
