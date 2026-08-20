import React, { useEffect, useRef } from 'react';

/**
 * ShelfCanvas — the Cartridge Shelf, living behind the glass.
 *
 * A dusk game-room wall on 2D canvas:
 *   - the wall fades from warm charcoal to deep corners
 *   - the console slot glows hot amber low-center (the only thing lit)
 *   - dust motes drift in the glow like a lit projector beam
 *   - a faint shelf-line crosses the lower third
 *
 * Performance: DPR capped at 2, one rAF loop, paused via IntersectionObserver
 * when the scene is hidden, prefers-reduced-motion → static frame.
 * Cheap: ~40 motes, no per-frame allocations beyond pooling.
 */
const ShelfCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Dust motes drifting in the slot glow
    type Mote = { x: number; y: number; r: number; phase: number; speed: number; depth: number };
    const motes: Mote[] = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0003 + Math.random() * 0.0006,
      depth: 0.3 + Math.random() * 0.7, // nearer motes are brighter/larger
    }));

    const drawFrame = () => {
      // Dusk wall
      const wall = ctx.createRadialGradient(
        width * 0.5, height * 0.32, 0,
        width * 0.5, height * 0.45, Math.max(width, height) * 0.8,
      );
      wall.addColorStop(0, '#1d1d24');
      wall.addColorStop(0.5, '#17171c');
      wall.addColorStop(1, '#101014');
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, width, height);

      // The console slot — the only thing lit: a hot amber glow low-center
      const slotX = width * 0.5;
      const slotY = height * 0.78;
      const slotGlow = ctx.createRadialGradient(slotX, slotY, 0, slotX, slotY, Math.max(width, height) * 0.4);
      slotGlow.addColorStop(0, 'rgba(255, 159, 67, 0.16)');
      slotGlow.addColorStop(0.35, 'rgba(255, 159, 67, 0.05)');
      slotGlow.addColorStop(1, 'rgba(255, 159, 67, 0)');
      ctx.fillStyle = slotGlow;
      ctx.fillRect(0, 0, width, height);

      // A faint shelf-line crossing the lower third
      const shelfY = height * 0.9;
      ctx.fillStyle = 'rgba(255, 159, 67, 0.06)';
      ctx.fillRect(0, shelfY, width, 1.5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, shelfY + 1.5, width, 3);

      // Dust motes drifting through the glow
      for (const m of motes) {
        if (!reduceMotion) {
          m.phase += m.speed;
          m.x += Math.sin(m.phase * 0.8) * 0.00012;
          m.y += Math.cos(m.phase * 0.6) * 0.0001;
          if (m.y < -0.02) m.y = 1.02;
        }
        const pulse = 0.25 + 0.55 * Math.abs(Math.sin(m.phase * 1.7));
        const alpha = (0.16 + 0.3 * m.depth) * pulse;
        ctx.beginPath();
        ctx.arc(m.x * width, m.y * height, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 214, 160, ${alpha})`;
        ctx.fill();
      }
    };

    const loop = () => {
      if (!running) return;
      drawFrame();
      raf = requestAnimationFrame(loop);
    };

    // Pause when hidden
    const io = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) raf = requestAnimationFrame(loop);
      else cancelAnimationFrame(raf);
    });
    io.observe(canvas);

    // First frame + resize
    drawFrame();
    window.addEventListener('resize', resize);
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="shelf-canvas"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
};

export default ShelfCanvas;
