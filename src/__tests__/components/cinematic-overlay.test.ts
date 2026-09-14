import { describe, it, expect } from 'vitest';
import { overlayStateForProgress, frameIndexForProgress } from '../../components/cinematic/frames';

/**
 * The 9-stage cinematic overlay timeline (see frames.ts overlayStateForProgress).
 * Stage marks: 0, .125, .25, .375, .5, .625, .75, .875, 1 — same progress that
 * drives the canvas frames (frame_0001 → frame_0240).
 */
describe('overlay 9-stage timeline', () => {
  it('STAGE 01 INTRO (0–12.5%): everything at designed rest', () => {
    for (const p of [0, 0.06, 0.11]) {
      const s = overlayStateForProgress(p);
      expect(s.copyOpacity).toBe(1);
      expect(s.copyY).toBe(0);
      expect(s.ctasOpacity).toBe(1);
      expect(s.tertiaryOpacity).toBe(1);
      expect(s.figureScale).toBe(1);
      expect(s.cueOpacity).toBeCloseTo(1 - p * 3, 5);
    }
  });

  it('STAGE 02 DISCOVERY (12.5–25%): tertiary exits early, copy still resting', () => {
    const a = overlayStateForProgress(0.125);
    expect(a.copyOpacity).toBe(1);
    // Tertiary fade begins at 12% — just underway at the stage boundary.
    expect(a.tertiaryOpacity).toBeGreaterThan(0.9);
    expect(a.tertiaryOpacity).toBeLessThan(1);
    const b = overlayStateForProgress(0.2);
    expect(b.tertiaryOpacity).toBe(0);
    expect(b.copyOpacity).toBe(1);
  });

  it('STAGE 03 SYSTEM (25–37.5%): copy yields, background gains priority', () => {
    const s = overlayStateForProgress(0.32);
    expect(s.copyOpacity).toBeLessThan(1);
    expect(s.copyOpacity).toBeGreaterThan(0.55);
    expect(s.copyY).toBeLessThan(0);
    expect(s.tertiaryOpacity).toBe(0);
  });

  it('STAGE 04 CHAOS (37.5–50%): overlay subdued, Bakasur ramping subtly', () => {
    const s = overlayStateForProgress(0.44);
    expect(s.copyOpacity).toBeLessThan(0.6);
    expect(s.ctasOpacity).toBeLessThan(0.6);
    // Peak ramp starts at 40%: 0.44 sits mid-ramp, still gentle.
    expect(s.figureScale).toBeGreaterThan(1);
    expect(s.figureScale).toBeLessThan(1.06);
  });

  it('STAGE 05 PEAK (50–62.5%): quietest overlay, figure at its subtle peak', () => {
    const s = overlayStateForProgress(0.55);
    expect(s.copyOpacity).toBeCloseTo(0.35, 5);
    expect(s.copyY).toBeCloseTo(-24, 5);
    expect(s.ctasOpacity).toBeLessThan(0.5);
    expect(s.figureScale).toBeCloseTo(1.06, 5);
  });

  it('STAGE 06 CONTROL (62.5–75%): chaos resolving, UI returning', () => {
    const s = overlayStateForProgress(0.7);
    expect(s.copyOpacity).toBeGreaterThan(0.35);
    expect(s.ctasOpacity).toBeGreaterThan(0.3);
    expect(s.figureScale).toBeLessThan(1.06);
  });

  it('STAGE 07 ORGANIZE (75–87.5%): copy/CTAs glide toward rest', () => {
    const s = overlayStateForProgress(0.85);
    expect(s.copyOpacity).toBeCloseTo(1, 5);
    expect(s.copyY).toBeCloseTo(0, 5);
    expect(s.ctasOpacity).toBeGreaterThan(0.6);
  });

  it('STAGE 08 TRANSFORMATION (87.5–100%): tertiary returns, everything settles', () => {
    const mid = overlayStateForProgress(0.9);
    expect(mid.tertiaryOpacity).toBeGreaterThan(0);
    expect(mid.tertiaryOpacity).toBeLessThan(1);
    const s = overlayStateForProgress(0.98);
    expect(s.tertiaryOpacity).toBeCloseTo(1, 5);
    expect(s.copyOpacity).toBe(1);
    expect(s.copyY).toBe(0);
    expect(s.ctasOpacity).toBe(1);
    expect(s.figureScale).toBeCloseTo(1, 5);
  });

  it('STAGE 09 FINAL HERO (100%): every element at its designed rest value', () => {
    const s = overlayStateForProgress(1);
    expect(s.copyOpacity).toBe(1);
    expect(s.copyY).toBe(0);
    expect(s.ctasOpacity).toBe(1);
    expect(s.tertiaryOpacity).toBe(1);
    expect(s.figureScale).toBe(1);
    expect(s.cueOpacity).toBe(0);
  });

  it('cue opacity matches the preserved fix: fades to 0 by one-third scroll', () => {
    expect(overlayStateForProgress(0).cueOpacity).toBe(1);
    expect(overlayStateForProgress(0.1).cueOpacity).toBeCloseTo(0.7, 5);
    expect(overlayStateForProgress(1 / 3).cueOpacity).toBe(0);
    expect(overlayStateForProgress(1).cueOpacity).toBe(0);
  });

  it('stays within safe bounds and never hides the protagonist', () => {
    for (let i = 0; i <= 100; i++) {
      const s = overlayStateForProgress(i / 100);
      expect(s.copyOpacity).toBeGreaterThan(0.3);
      expect(s.ctasOpacity).toBeGreaterThan(0.25);
      expect(s.figureScale).toBeGreaterThanOrEqual(1);
      expect(s.figureScale).toBeLessThanOrEqual(1.06);
      expect(Math.abs(s.copyY)).toBeLessThanOrEqual(24);
      expect(s.cueOpacity).toBeGreaterThanOrEqual(0);
      expect(s.cueOpacity).toBeLessThanOrEqual(1);
    }
  });

  it('clamps out-of-range progress', () => {
    for (const p of [-1, 2]) {
      const s = overlayStateForProgress(p);
      expect(s.copyOpacity).toBe(1);
      expect(s.figureScale).toBe(1);
    }
    expect(overlayStateForProgress(-1).cueOpacity).toBe(1);
    expect(overlayStateForProgress(2).cueOpacity).toBe(0);
  });

  it('canvas frame mapping is untouched: 0→frame 1, 1→frame 240', () => {
    expect(frameIndexForProgress(0, 240)).toBe(0);
    expect(frameIndexForProgress(0.5, 240)).toBe(120);
    expect(frameIndexForProgress(1, 240)).toBe(239);
    expect(frameIndexForProgress(0.125, 240)).toBe(Math.round(0.125 * 239));
    expect(frameIndexForProgress(0.875, 240)).toBe(Math.round(0.875 * 239));
  });
});
