import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { authConfig } from '../features/auth/config';
import { CinematicHero } from '../components/cinematic/CinematicHero';
import { NarrativeSection } from '../components/cinematic/NarrativeSection';
import { ProductStory } from '../components/cinematic/ProductStory';
import { Walkthrough } from '../components/cinematic/Walkthrough';
import { FinalCta } from '../components/cinematic/FinalCta';
import '../components/cinematic/cinematic.css';

/**
 * Home — the cinematic marketing site (route "/").
 *
 * LANDING → SCROLL → CHAOS → BAKASUR → CLARITY → PHILOSOPHY →
 * PRODUCT STORY → WALKTHROUGH → CTA.
 *
 * Contracts preserved verbatim from the cover page this replaces:
 * - authenticated (non-guest) users redirect to /today
 * - sign-in clears demo mode and runs the OAuth login
 * - entering the product sets bt_demo_mode + full-page assign to /today
 * - prefers-reduced-motion disables scrub/animation throughout
 *
 * The hero background is the cinematic sequence slot
 * (public/media/cinematic/frames.json — Google Flow export). Until frames
 * land, the layer stays transparent and the global LightTunnel world is
 * the cinema; the legacy home-loop.mp4 cover slot retired with it.
 */

/** Subscribe to reduced-motion outside render (the AppBackground pattern). */
const usePrefersReducedMotion = (): boolean =>
  React.useSyncExternalStore(
    React.useCallback((onStoreChange) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', onStoreChange);
      return () => mq.removeEventListener('change', onStoreChange);
    }, []),
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );

export const Home: React.FC = () => {
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();

  const isAuthConfigured = Boolean(authConfig.domain && authConfig.clientId);

  // Post-login cockpit: Today is the primary surface (behavior preserved
  // verbatim from the previous landing page).
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.provider !== 'guest') {
      navigate('/today', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  const launchLogin = () => {
    localStorage.removeItem('bt_demo_mode');
    login();
  };

  // Product = the actual BakaTracker experience. The established guest-demo
  // pipeline: AuthProvider reads this flag once at boot, so the navigation
  // is intentionally a full-page assign (same contract as the old landing).
  const enterProduct = () => {
    localStorage.setItem('bt_demo_mode', 'true');
    window.location.assign('/today');
  };

  const signInLabel = isAuthConfigured ? 'Sign in' : 'Sign-in unavailable';

  return (
    <div className="cine-page">
      <CinematicHero
        reducedMotion={prefersReducedMotion}
        onEnterProduct={enterProduct}
        onLogin={launchLogin}
        signInDisabled={!isAuthConfigured}
        signInLabel={signInLabel}
      />
      <div className="cine-continue">
        <main>
          <NarrativeSection reducedMotion={prefersReducedMotion} />
          <ProductStory reducedMotion={prefersReducedMotion} />
          <Walkthrough reducedMotion={prefersReducedMotion} />
        </main>
        <FinalCta
          reducedMotion={prefersReducedMotion}
          onEnterProduct={enterProduct}
          onLogin={launchLogin}
          signInDisabled={!isAuthConfigured}
        />
      </div>
    </div>
  );
};
