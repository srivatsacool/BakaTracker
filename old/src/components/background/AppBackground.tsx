import React, { useEffect, useState } from 'react';
import ShelfCanvas from './ShelfCanvas';

/**
 * AppBackground — the Cartridge Shelf as a fixed full-viewport animated
 * background. Mount this once at the app root, behind all content.
 *
 * The shelf replaces the retired worlds: dusk game-room wall, the console
 * slot glowing hot amber (the only thing lit), dust motes in the glow.
 *
 * Hardening: respects prefers-reduced-motion (static dusk frame), DPR capped
 * at 2, paused by IntersectionObserver when hidden.
 */
const AppBackground: React.FC = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div
      className="app-background"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 90% 70% at 50% 30%, #1d1d24 0%, #17171c 55%, #101014 100%)',
      }}
    >
      {prefersReducedMotion ? (
        /* Static dusk frame — the shelf holds still */
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 50% 40% at 50% 78%, rgba(255,159,67,0.10) 0%, transparent 65%)',
          }}
        />
      ) : (
        <ShelfCanvas />
      )}

      {/* Vignette — deepens the edges so the shelf sits in the dusk */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 100% 85% at 50% 45%, transparent 0%, rgba(8, 8, 11, 0.25) 55%, rgba(8, 8, 11, 0.55) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default AppBackground;
