import React, { useEffect, useRef } from 'react';

/**
 * ObservatoryCanvas — the night dome, living behind every surface.
 *
 * The world: your life is a night of observation. This is the observatory
 * at first dark — a deep-void dome with a faint aurora band on the
 * horizon, ranks of dim glass instrument panels receding into depth, and
 * exactly ONE pane lit: the instrument in front of you, its glass glowing
 * aurora-violet (the slot rule: one lit source; the aurora is the sky's
 * ambient identity, never hot).
 *
 * Drawn on 2D canvas:
 *   - the dome fades from lifted void to deep corners, with a horizon
 *     aurora band (violet) breathing faintly
 *   - scattered stars + a slow-turning constellation field
 *   - glass instrument panels in two receding ranks, each with a dim
 *     hairline marquee line in its tool tone
 *   - the foreground pane (low-center) is lit: aurora glass glow pooling
 *     on the floor, a running Day Line, a status lamp
 *   - drifting motes of light
 *
 * Performance: DPR capped at 2, one rAF loop, paused via IntersectionObserver,
 * prefers-reduced-motion → static frame.
 */

const TOOL_TONES = ['#5a8cff', '#ff6b6b', '#e86a9a', '#5fd8c4', '#e8b45a'];

const ObservatoryCanvas: React.FC = () => {
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

    // Stars — fixed points + twinkle phase
    type Star = { x: number; y: number; r: number; phase: number; speed: number };
    const stars: Star[] = Array.from({ length: 140 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.75,
      r: 0.3 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0004 + Math.random() * 0.001,
    }));

    // Light motes in the foreground glow
    type Mote = { x: number; y: number; r: number; phase: number; speed: number; depth: number };
    const motes: Mote[] = Array.from({ length: 34 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      speed: 0.00025 + Math.random() * 0.0005,
      depth: 0.3 + Math.random() * 0.7,
    }));

    // Glass instrument panels: [x01, y01, w01, h01, depthScale, toneIdx]
    const panels: { x: number; y: number; w: number; h: number; s: number; tone: number }[] = [];
    for (let rank = 0; rank < 2; rank++) {
      for (let i = -3; i <= 3; i++) {
        if (i === 0 && rank === 0) continue; // foreground slot is the lit pane
        panels.push({
          x: 0.5 + i * 0.14 + (rank === 1 ? 0.035 : 0),
          y: 0.42 + rank * 0.115,
          w: 0.085,
          h: 0.2 + rank * 0.08,
          s: 1 - rank * 0.42 - Math.abs(i) * 0.055,
          tone: (i + 3 + rank * 7) % TOOL_TONES.length,
        });
      }
    }

    const drawFrame = (t: number) => {
      // The dome
      const wall = ctx.createRadialGradient(
        width * 0.5, height * 0.3, 0,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.85,
      );
      wall.addColorStop(0, '#0d0b18');
      wall.addColorStop(0.55, '#07060c');
      wall.addColorStop(1, '#040309');
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, width, height);

      // Floor — darken below the horizon
      const floor = ctx.createLinearGradient(0, height * 0.46, 0, height);
      floor.addColorStop(0, 'rgba(4, 3, 9, 0)');
      floor.addColorStop(1, 'rgba(2, 2, 6, 0.9)');
      ctx.fillStyle = floor;
      ctx.fillRect(0, 0, width, height);

      // Aurora band on the horizon — the sky's ambient identity
      const aurora = ctx.createRadialGradient(
        width * 0.5, height * 0.16, 0,
        width * 0.5, height * 0.16, width * 0.6,
      );
      const breathe = 0.85 + Math.sin(t * 0.0005) * 0.15;
      aurora.addColorStop(0, `rgba(111, 91, 216, ${0.16 * breathe})`);
      aurora.addColorStop(0.5, `rgba(111, 91, 216, ${0.06 * breathe})`);
      aurora.addColorStop(1, 'rgba(111, 91, 216, 0)');
      ctx.fillStyle = aurora;
      ctx.fillRect(0, 0, width, height * 0.6);

      // Stars — twinkling
      for (const s of stars) {
        const x = s.x * width;
        const y = s.y * height;
        const tw = 0.4 + Math.sin(t * s.speed * 60 + s.phase) * 0.4;
        ctx.fillStyle = `rgba(233, 230, 242, ${0.14 + tw * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Receding glass panels (dim hairline marquees)
      for (const p of panels) {
        const px = p.x * width;
        const py = p.y * height;
        const pw = p.w * width * p.s;
        const ph = p.h * height * p.s;
        // glass body
        ctx.fillStyle = `rgba(14, 12, 23, ${0.45 + p.s * 0.35})`;
        ctx.beginPath();
        ctx.roundRect(px - pw / 2, py - ph / 2, pw, ph, Math.min(8, pw * 0.07));
        ctx.fill();
        // hairline edge
        ctx.strokeStyle = `rgba(233, 230, 242, ${0.05 + p.s * 0.07})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        // dim instrument band in its tool tone
        const tone = TOOL_TONES[p.tone];
        ctx.fillStyle = tone;
        ctx.globalAlpha = 0.05 + p.s * 0.06 + Math.sin(t * 0.0007 + p.x * 20) * 0.015;
        ctx.fillRect(px - pw * 0.36, py - ph / 2 + pw * 0.08, pw * 0.72, pw * 0.07);
        ctx.globalAlpha = 1;
        // faint readout screen
        ctx.fillStyle = `rgba(4, 3, 9, ${0.55 + p.s * 0.25})`;
        ctx.fillRect(px - pw * 0.34, py - ph / 2 + pw * 0.22, pw * 0.68, pw * 0.44);
      }

      // ---- The lit pane — foreground, low-center, the one hot source ----
      const fw = Math.min(width * 0.2, 260);
      const fh = fw * 1.9;
      const fx = width * 0.5;
      const fy = height * 0.99;

      // aurora glow pool on the floor
      const pool = ctx.createRadialGradient(fx, fy - fh * 0.4, 0, fx, fy - fh * 0.4, fw * 1.05);
      pool.addColorStop(0, 'rgba(111, 91, 216, 0.2)');
      pool.addColorStop(1, 'rgba(111, 91, 216, 0)');
      ctx.fillStyle = pool;
      ctx.fillRect(fx - fw * 1.2, fy - fh - fw, fw * 2.4, fh + fw * 1.6);

      // glass pane body
      ctx.fillStyle = 'rgba(16, 13, 28, 0.72)';
      ctx.beginPath();
      ctx.roundRect(fx - fw / 2, fy - fh, fw, fh, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(111, 91, 216, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // glass top-edge highlight
      ctx.fillStyle = 'rgba(233, 230, 242, 0.14)';
      ctx.fillRect(fx - fw / 2 + 2, fy - fh + 2, fw - 4, 1.5);

      // instrument header — the lit band
      ctx.shadowColor = 'rgba(111, 91, 216, 0.8)';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#6f5bd8';
      ctx.beginPath();
      ctx.roundRect(fx - fw * 0.42, fy - fh + fw * 0.1, fw * 0.84, fw * 0.13, 5);
      ctx.fill();
      ctx.shadowBlur = 0;
      // header tick marks
      ctx.fillStyle = 'rgba(244, 242, 255, 0.85)';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(fx - fw * 0.36 + i * (fw * 0.11), fy - fh + fw * 0.145, fw * 0.06, fw * 0.04);
      }

      // readout screen — a running Day Line
      const flicker = 0.9 + Math.sin(t * 0.002 + Math.sin(t * 0.005) * 2) * 0.08;
      ctx.fillStyle = `rgba(6, 5, 12, ${0.92 * flicker})`;
      ctx.beginPath();
      ctx.roundRect(fx - fw * 0.36, fy - fh + fw * 0.3, fw * 0.72, fw * 0.46, 6);
      ctx.fill();
      // the Day Line track
      ctx.strokeStyle = 'rgba(233, 230, 242, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fx - fw * 0.3, fy - fh + fw * 0.56);
      ctx.lineTo(fx + fw * 0.3, fy - fh + fw * 0.56);
      ctx.stroke();
      // running light (where now is)
      const runX = fx - fw * 0.3 + fw * 0.6 * (0.5 + Math.sin(t * 0.0009) * 0.5);
      ctx.shadowColor = 'rgba(111, 91, 216, 0.9)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#6f5bd8';
      ctx.beginPath();
      ctx.arc(runX, fy - fh + fw * 0.56, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // faint readout bars
      ctx.fillStyle = `rgba(233, 230, 242, ${0.16 * flicker})`;
      for (let i = 0; i < 5; i++) {
        const bh = (0.1 + (i % 3) * 0.06) * fw;
        ctx.fillRect(fx - fw * 0.3 + i * (fw * 0.13), fy - fh + fw * 0.62 - bh, fw * 0.08, bh);
      }

      // control strip
      ctx.fillStyle = 'rgba(233, 230, 242, 0.05)';
      ctx.beginPath();
      ctx.roundRect(fx - fw * 0.36, fy - fh + fw * 0.88, fw * 0.72, fw * 0.1, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(111, 91, 216, 0.55)';
      ctx.fillRect(fx - fw * 0.36, fy - fh + fw * 0.88, fw * 0.2, fw * 0.1);

      // status lamp + readout label
      ctx.font = `400 ${Math.max(10, fw * 0.048)}px "Fragment Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const blink = Math.floor(t / 900) % 2 === 0;
      ctx.shadowColor = 'rgba(111, 91, 216, 0.8)';
      ctx.shadowBlur = blink ? 12 : 0;
      ctx.fillStyle = blink ? 'rgba(111, 91, 216, 0.9)' : 'rgba(111, 91, 216, 0.25)';
      ctx.fillText('OBSERVING', fx, fy - fh + fw * 1.12);
      ctx.shadowBlur = 0;

      // ---- Drifting light motes ----
      for (const m of motes) {
        const x = m.x * width + Math.sin(t * m.speed * 60 + m.phase) * 30 * m.depth;
        const y = m.y * height + Math.cos(t * m.speed * 45 + m.phase) * 18 * m.depth;
        const distToGlow = Math.hypot(x - fx, y - (fy - fh * 0.4));
        const glow = Math.max(0, 1 - distToGlow / (width * 0.5));
        ctx.fillStyle = `rgba(190, 180, 255, ${0.08 + glow * 0.3 * m.depth})`;
        ctx.beginPath();
        ctx.arc(x, y, m.r * (0.6 + glow), 0, Math.PI * 2);
        ctx.fill();
      }

      // readability scrim — keep content legible over the dome
      const scrim = ctx.createLinearGradient(0, 0, 0, height);
      scrim.addColorStop(0, 'rgba(4, 3, 9, 0.4)');
      scrim.addColorStop(0.5, 'rgba(4, 3, 9, 0.15)');
      scrim.addColorStop(1, 'rgba(4, 3, 9, 0.55)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, width, height);
    };

    const frame = (time: number) => {
      if (!running) return;
      drawFrame(time);
      if (!reduceMotion) raf = requestAnimationFrame(frame);
      else raf = 0;
    };

    // Pause when the scene is off-screen
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.some((e) => e.isIntersecting);
          if (visible && !running) {
            running = true;
            raf = requestAnimationFrame(frame);
          } else if (!visible && running) {
            running = false;
            cancelAnimationFrame(raf);
          }
        },
        { threshold: 0 },
      );
      observer.observe(canvas);
    }

    window.addEventListener('resize', resize);

    if (reduceMotion) {
      drawFrame(0); // static frame
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />;
};

export default ObservatoryCanvas;
