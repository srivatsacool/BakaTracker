/**
 * Cinematic sequence manifest — the Google Flow asset slot.
 *
 * Flow owns the artwork. This file is the ONLY contract between the Flow
 * export and the website: an ordered list of frame URLs (WebP/AVIF
 * preferred). The hero maps scroll progress → frame index → canvas render,
 * so the visitor scrubs the narrative by scrolling.
 *
 * Frame conventions (BakaSur Flow export, 240 frames):
 * - 16:9, 1280×720 WebP — the canvas cover-fits to viewport.
 * - sequential names: frame_0001.webp … frame_0240.webp
 * - place files under public/media/cinematic/frames/ and list them here.
 *
 * Until then `"frames": []` is VALID: the sequence layer stays transparent
 * and the live LightTunnel world remains the cinema. No placeholder
 * footage, no broken frames — the component self-hides when empty.
 */
export interface CinematicManifest {
  frames: string[];
}

export const CINEMATIC_MANIFEST_URL = '/media/cinematic/frames.json';

/** Load the manifest. Missing/unparseable/empty → [] (fallback mode). */
export async function loadCinematicManifest(
  url: string = CINEMATIC_MANIFEST_URL,
): Promise<string[]> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return [];
    const data = (await res.json()) as Partial<CinematicManifest> | null;
    if (!data || !Array.isArray(data.frames)) return [];
    return data.frames.filter((f): f is string => typeof f === 'string' && f.length > 0);
  } catch {
    return [];
  }
}

/** scroll progress (0..1, clamped) → frame index. -1 when there are no frames. */
export function frameIndexForProgress(progress: number, count: number): number {
  if (count <= 0) return -1;
  const p = Math.min(1, Math.max(0, progress));
  return Math.min(count - 1, Math.round(p * (count - 1)));
}

/** Cinematic narrative phase driving speech bubbles + staging (4 beats). */
export type CinematicPhase = 0 | 1 | 2 | 3;

export function phaseForProgress(progress: number): CinematicPhase {
  const p = Math.min(1, Math.max(0, progress));
  if (p < 0.25) return 0;
  if (p < 0.5) return 1;
  if (p < 0.75) return 2;
  return 3;
}

/* ------------------------------------------------------------------ */
/* HTML overlay timeline — same 0..1 progress drives canvas AND overlay */
/* ------------------------------------------------------------------ */

type TimelineKey = [progress: number, value: number];

/** Piecewise-linear interpolation across [progress, value] keyframes. */
function trackValue(keys: TimelineKey[], p: number): number {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) {
      const [p0, v0] = keys[i - 1];
      const [p1, v1] = keys[i];
      const t = (p - p0) / (p1 - p0);
      return v0 + (v1 - v0) * t;
    }
  }
  return keys[keys.length - 1][1];
}

/**
 * Overlay visual state for scroll progress 0..1 (clamped).
 *
 * 9-stage arc, transforms + opacity only (never layout):
 * - 01 INTRO (0–.125): everything at rest, full prominence.
 * - 02 DISCOVERY (.125–.25): copy begins yielding; tertiary CTA exits early.
 * - 03 SYSTEM (.25–.375): copy keeps yielding, background gains priority.
 * - 04 CHAOS (.375–.5): headline/sub subdued, CTAs dimmed, Bakasur holds.
 * - 05 PEAK (.5–.625): midpoint — copy/CTAs at their quietest, figure peaks.
 * - 06 CONTROL (.625–.75): chaos resolves, UI begins returning.
 * - 07 ORGANIZE (.75–.875): copy/CTAs glide back toward final state.
 * - 08 TRANSFORMATION (.875–1): UI settles, composed with the final frame.
 * - 09 FINAL HERO (1): every element exactly at its designed rest value.
 */
export interface OverlayState {
  /** Headline block (kicker/title/sub) opacity. Rest: 1. */
  copyOpacity: number;
  /** Headline block vertical drift in px. Rest: 0. */
  copyY: number;
  /** CTA group opacity. Rest: 1. */
  ctasOpacity: number;
  /** Tertiary ("Show me the magic") opacity — exits early, returns late. */
  tertiaryOpacity: number;
  /** Bakasur figure scale (persistent protagonist, never hidden). Rest: 1. */
  figureScale: number;
  /** Scroll cue opacity — fades out once scrolling starts. Rest at 0: 1. */
  cueOpacity: number;
}

export function overlayStateForProgress(progress: number): OverlayState {
  const p = Math.min(1, Math.max(0, progress));
  return {
    copyOpacity: trackValue(
      [[0, 1], [0.25, 1], [0.4, 0.55], [0.55, 0.35], [0.7, 0.55], [0.85, 1], [1, 1]],
      p,
    ),
    copyY: trackValue(
      [[0, 0], [0.25, 0], [0.4, -14], [0.55, -24], [0.7, -14], [0.85, 0], [1, 0]],
      p,
    ),
    ctasOpacity: trackValue(
      [[0, 1], [0.3, 1], [0.45, 0.5], [0.6, 0.3], [0.75, 0.6], [0.9, 1], [1, 1]],
      p,
    ),
    tertiaryOpacity: trackValue(
      [[0, 1], [0.12, 1], [0.2, 0], [0.85, 0], [0.92, 1], [1, 1]],
      p,
    ),
    figureScale: trackValue(
      [[0, 1], [0.4, 1], [0.55, 1.06], [0.7, 1], [1, 1]],
      p,
    ),
    cueOpacity: Math.max(0, 1 - p * 3),
  };
}
