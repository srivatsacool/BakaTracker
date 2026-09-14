import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  frameIndexForProgress,
  loadCinematicManifest,
  phaseForProgress,
} from '../../components/cinematic/frames';

describe('cinematic sequence helpers', () => {
  it('maps scroll progress to frame index (clamped)', () => {
    expect(frameIndexForProgress(0, 60)).toBe(0);
    expect(frameIndexForProgress(0.5, 60)).toBe(30);
    expect(frameIndexForProgress(0.999, 60)).toBe(59);
    expect(frameIndexForProgress(1, 60)).toBe(59);
    expect(frameIndexForProgress(-0.2, 60)).toBe(0);
    expect(frameIndexForProgress(1.5, 60)).toBe(59);
    expect(frameIndexForProgress(0.5, 0)).toBe(-1);
  });

  it('advances narrative phase in quartiles', () => {
    expect(phaseForProgress(0)).toBe(0);
    expect(phaseForProgress(0.24)).toBe(0);
    expect(phaseForProgress(0.25)).toBe(1);
    expect(phaseForProgress(0.49)).toBe(1);
    expect(phaseForProgress(0.5)).toBe(2);
    expect(phaseForProgress(0.74)).toBe(2);
    expect(phaseForProgress(0.75)).toBe(3);
    expect(phaseForProgress(1)).toBe(3);
  });

  describe('loadCinematicManifest', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    it('returns frames when the manifest is valid', async () => {
      (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ frames: ['/media/cinematic/frames/f1.webp'] }),
      });
      await expect(loadCinematicManifest()).resolves.toEqual([
        '/media/cinematic/frames/f1.webp',
      ]);
    });

    it('falls back to [] when missing, invalid, or failing', async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
      await expect(loadCinematicManifest()).resolves.toEqual([]);
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ frames: 'nope' }) });
      await expect(loadCinematicManifest()).resolves.toEqual([]);
      fetchMock.mockRejectedValue(new Error('offline'));
      await expect(loadCinematicManifest()).resolves.toEqual([]);
    });
  });
});
