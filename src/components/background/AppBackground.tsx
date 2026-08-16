import React, { useEffect, useState } from 'react';
import LightTunnel from './LightTunnel';

/**
 * AppBackground — the LightTunnel world's fixed background stack, mounted
 * once at the app root behind all content (see the layer stack in
 * src/index.css — BACKGROUND section).
 *
 * Layer stack:
 *   z0  LightTunnel               — WebGL fibre-optic tunnel, fixed full
 *                                   viewport, pointer-events: none. The
 *                                   component pauses itself off-screen
 *                                   (IntersectionObserver) and on tab
 *                                   hide (visibilitychange), and disposes
 *                                   its WebGL context on unmount.
 *   z1  BackgroundReadabilityOverlay — dark translucent LAYERED treatment:
 *                                   base wash + radial darkening + edge
 *                                   vignette + subtle center readability
 *                                   gradient (class .obs-readability-overlay).
 *                                   Never a flat black layer — the tunnel
 *                                   stays visible while text stays
 *                                   readable. TEXT ALWAYS WINS.
 *
 * Reduced motion: prefers-reduced-motion → the tunnel is NOT mounted; a
 * static indigo gradient (.obs-tunnel-static) stands in. The overlay is
 * never animated. All tunnel props stay exposed for later live tuning.
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

  return (
    <div className="obs-background" aria-hidden="true">
      {prefersReducedMotion ? (
        <div className="obs-tunnel-static" />
      ) : (
        <div className="obs-tunnel-layer">
          <LightTunnel
            cableColor="#8B5CF6"
            pulseColor="#A78BFA"
            tunnelColor="#312E81"
            tunnelOpacity={0}
            speed={0.08}
            flowDirection="outward"
            pulseSpeed={1.8}
            pulseLength={0.25}
            pulseBlend={1}
            pulseWidth={1}
            cableCount={22}
            thickness={0.3}
            rimWidth={0.14}
            waviness={0.25}
            sway={0.4}
            size={1.0}
            centerX={0.0}
            centerY={0.0}
            glow={0.8}
            fadeNear={0.35}
            fadeFar={2.2}
            brightness={0.75}
            colorVariance={true}
            grain={true}
            grainIntensity={0.04}
            opacity={0.8}
            mouseInteraction={true}
            mouseStrength={0.06}
          />
        </div>
      )}
      <div className="obs-readability-overlay" />
    </div>
  );
};

export default AppBackground;
