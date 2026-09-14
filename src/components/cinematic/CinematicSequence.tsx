import React from 'react';
import { frameIndexForProgress, loadCinematicManifest } from './frames';

export interface SequenceHandle {
  /** Render the frame for scroll progress 0..1 (no-op without frames). */
  draw: (progress: number) => void;
}

interface Props {
  reducedMotion: boolean;
  /** Called once: true = frames ready, false = empty manifest (fallback). */
  onReady: (hasFrames: boolean) => void;
}

/**
 * CinematicSequence — scroll-scrubbed frame renderer.
 *
 * Canvas 2D, cover-fit, DPR-capped. The parent owns scroll progress and
 * calls draw() through the ref (rAF-coalesced) so scrolling never
 * re-renders React. Preloads frame 0 first, then the rest in idle chunks.
 * Empty manifest → transparent canvas, tunnel stays the scene.
 */
export const CinematicSequence = React.forwardRef<SequenceHandle, Props>(
  function CinematicSequence({ reducedMotion, onReady }, ref) {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const imagesRef = React.useRef<HTMLImageElement[]>([]);
    const lastProgressRef = React.useRef(0);
    const rafRef = React.useRef(0);
    const readyRef = React.useRef(onReady);
    readyRef.current = onReady;

    const renderFrame = React.useCallback((img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw === 0 || ch === 0) return;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (!iw || !ih) return;
      const scale = Math.max(canvas.width / iw, canvas.height / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    }, []);

    const draw = React.useCallback(
      (progress: number) => {
        lastProgressRef.current = progress;
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          const imgs = imagesRef.current;
          const idx = frameIndexForProgress(lastProgressRef.current, imgs.length);
          if (idx < 0) return;
          const img = imgs[idx];
          if (img && img.complete && img.naturalWidth > 0) renderFrame(img);
        });
      },
      [renderFrame],
    );

    React.useImperativeHandle(ref, () => ({ draw }), [draw]);

    // Load manifest + progressive preload (once).
    React.useEffect(() => {
      let cancelled = false;

      // Keep canvas bitmap matched to layout on resize.
      const onResize = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        const imgs = imagesRef.current;
        const idx = frameIndexForProgress(lastProgressRef.current, imgs.length);
        if (idx >= 0 && imgs[idx]?.complete) {
          const c = canvasRef.current;
          if (c) {
            const dpr = Math.min(1.5, window.devicePixelRatio || 1);
            c.width = Math.round(c.clientWidth * dpr);
            c.height = Math.round(c.clientHeight * dpr);
          }
        }
      };
      window.addEventListener('resize', onResize);

      const loadImage = (src: string) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          // Frames are same-origin static assets; no CORS taint concerns.
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });

      (async () => {
        const urls = await loadCinematicManifest();
        if (cancelled) return;
        if (urls.length === 0) {
          readyRef.current(false);
          return;
        }
        // Frame 0 first — the poster moment. Everything else idle-chunks.
        const first = await loadImage(urls[0]);
        if (cancelled) return;
        if (first) {
          imagesRef.current[0] = first;
          renderFrame(first);
        }
        readyRef.current(true);
        if (reducedMotion) return; // static opening frame is the whole film
        const rest = urls.slice(1);
        const CHUNK = 4;
        for (let i = 0; i < rest.length && !cancelled; i += CHUNK) {
          const batch = await Promise.all(rest.slice(i, i + CHUNK).map(loadImage));
          if (cancelled) return;
          batch.forEach((img, k) => {
            if (img) imagesRef.current[i + 1 + k] = img;
          });
          // Yield to the main thread between chunks.
          await new Promise((r) => setTimeout(r, 0));
        }
      })();

      return () => {
        cancelled = true;
        window.removeEventListener('resize', onResize);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        imagesRef.current = [];
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className="cine-sequence"
        aria-hidden="true"
      />
    );
  },
);
