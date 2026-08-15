import React, { useEffect, useState } from 'react';
import LightTunnel from './LightTunnel';

/**
 * AppBackground — renders the LightTunnel as a fixed full-viewport
 * animated background. Mount this once at the app root, behind all content.
 *
 * Hardening: Respects prefers-reduced-motion by disabling the tunnel animation.
 */
const AppBackground: React.FC = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (prefersReducedMotion) {
    return (
      <div
        className="app-background"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, #1a0b2e 0%, #0a0612 55%, #050308 100%)',
        }}
      />
    );
  }

  return (
    <div
      className="app-background"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse 80% 60% at 50% 40%, #1a0b2e 0%, #0a0612 55%, #050308 100%)',
      }}
    >
      {/* Primary tunnel — full viewport */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
        <LightTunnel
          cableColor="#A855F7"
          pulseColor="#C084FC"
          tunnelColor="#5227FF"
          tunnelOpacity={0}
          speed={0.08}
          flowDirection="outward"
          pulseSpeed={1.8}
          pulseLength={0.32}
          pulseBlend={1}
          pulseWidth={1}
          cableCount={24}
          thickness={0.3}
          rimWidth={0.18}
          waviness={0.35}
          sway={0.4}
          size={1.1}
          centerX={0.0}
          centerY={0.0}
          glow={1.2}
          fadeNear={0.4}
          fadeFar={2.2}
          brightness={1.0}
          colorVariance={true}
          grain={true}
          grainIntensity={0.04}
          opacity={0.85}
          mouseInteraction={true}
          mouseStrength={0.08}
        />
      </div>

      {/* Vignette overlay — deepens the edges */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 0%, rgba(5, 3, 8, 0.3) 50%, rgba(5, 3, 8, 0.7) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default AppBackground;
