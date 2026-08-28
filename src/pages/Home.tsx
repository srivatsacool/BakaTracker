import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../features/auth';
import { authConfig } from '../features/auth/config';
import { GITHUB_REPO_URL, HomeBrand } from './homeParts';

/**
 * Home — the cover of the project.
 *
 * ONE cinematic viewport (100vw × 100vh/min-height:100svh): minimal header
 * (brand + sign-in), fullscreen decorative background video, one editorial
 * statement, one supporting sentence, and a single glass control group —
 * GitHub / Product / Philosophy. No marketing sections.
 *
 * Visual language is the existing Darkglass/Light Tunnel system: the shared
 * AppBackground (WebGL tunnel + readability overlay) remains the scene; the
 * video is a clean ASSET SLOT layered above it (`public/media/home-loop.mp4`,
 * not committed yet). Until the asset lands the layer stays dormant and the
 * tunnel IS the cinema — no invented placeholder footage.
 */

/** Brand glyph for the GitHub CTA (inline SVG, lucide 1.x has no brand icons). */
const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

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

  // The video slot fades in only when it actually plays; a missing/failed
  // asset never reveals a broken frame — the tunnel remains the scene.
  const [videoLive, setVideoLive] = useState(false);

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

  return (
    <div className="home-scene" style={{ color: 'var(--obs-paper)' }}>
      {/* Cinematic background video — decorative, silent, non-interactive */}
      {!prefersReducedMotion && (
        <div className={`home-video-layer${videoLive ? ' is-live' : ''}`} aria-hidden="true">
          <video
            className="home-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            tabIndex={-1}
            onPlaying={() => setVideoLive(true)}
          >
            <source src="/media/home-loop.mp4" type="video/mp4" />
          </video>
        </div>
      )}

      {/* The SAME readability overlay the whole app uses — TEXT ALWAYS WINS */}
      <div className="obs-readability-overlay" aria-hidden="true" />

      <div className="home-content">
        {/* Minimal navigation — brand + sign-in, nothing else */}
        <header className="home-header home-enter" style={{ '--home-delay': '60ms' } as React.CSSProperties}>
          <HomeBrand />
          <button
            type="button"
            className="landing-signin"
            onClick={launchLogin}
            disabled={!isAuthConfigured}
            title={isAuthConfigured ? 'Sign in or create your own BakaTracker instance' : 'Sign-in is not configured on this deployment'}
          >
            <span className="landing-signin-bracket" aria-hidden="true">[</span>
            <span className="landing-signin-label">{isAuthConfigured ? 'Sign in' : 'Sign-in unavailable'}</span>
            <span className="landing-signin-cursor" aria-hidden="true" />
            <span className="landing-signin-bracket" aria-hidden="true">]</span>
          </button>
        </header>

        {/* The hero — one statement, one breath, one control group */}
        <main className="home-main">
          <p className="obs-kicker home-kicker home-enter" style={{ '--home-delay': '160ms' } as React.CSSProperties}>
            <span className="home-kicker-led" aria-hidden="true" />
            An open-source personal life OS
          </p>
          <h1 className="home-title home-enter" style={{ '--home-delay': '280ms' } as React.CSSProperties}>
            A quiet operating system
            <br />
            for an entire life.
          </h1>
          <p className="landing-hero-copy home-enter" style={{ '--home-delay': '420ms' } as React.CSSProperties}>
            Your quests, habits, notes, and journal — one calm system that runs locally,
            thinks with you, and stays yours.
          </p>

          <div
            className="home-cta-group home-enter"
            role="group"
            aria-label="Choose a path — source code, the product, or the philosophy"
            style={{ '--home-delay': '560ms' } as React.CSSProperties}
          >
            <a className="home-cta" href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              <GithubIcon className="w-4 h-4" aria-hidden="true" />
              GitHub
              <ArrowUpRight className="w-3.5 h-3.5 home-cta-exit" aria-hidden="true" />
            </a>
            <span className="home-cta-divider" aria-hidden="true" />
            <button type="button" className="home-cta" onClick={enterProduct}>
              Product
            </button>
            <span className="home-cta-divider" aria-hidden="true" />
            <Link to="/philosophy" className="home-cta">
              Philosophy
            </Link>
          </div>
        </main>

        {/* Quiet ground line */}
        <footer className="home-footer home-enter" style={{ '--home-delay': '700ms' } as React.CSSProperties}>
          <span>Local-first</span>
          <span aria-hidden="true">·</span>
          <span>Open source</span>
          <span aria-hidden="true">·</span>
          <span>Your instance</span>
        </footer>
      </div>
    </div>
  );
};
