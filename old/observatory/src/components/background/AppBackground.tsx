import React, { Suspense, lazy } from 'react';

// Lazy-load the observatory dome so the canvas work never blocks first paint.
const ObservatoryCanvas = lazy(() => import('./ObservatoryCanvas'));

/**
 * AppBackground — the night dome, fixed behind every surface.
 * Mounted once; the canvas pauses itself when off-screen.
 */
const AppBackground: React.FC = () => (
  <div className="obs-background" aria-hidden="true">
    <Suspense fallback={null}>
      <ObservatoryCanvas />
    </Suspense>
  </div>
);

export default AppBackground;
