import React from 'react';
import { HomeBrand } from '../../pages/homeParts';
import { Shield } from 'lucide-react';

interface Props {
  reducedMotion: boolean;
  onEnterProduct: () => void;
  onLogin: () => void;
  signInDisabled: boolean;
  signInLabel: string;
}

function scrollToId(id: string, reducedMotion: boolean) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}

/**
 * CinematicHero — Minimalist, Uncluttered Sovereign Hero.
 *
 * Design Architecture:
 * - Pure deep obsidian void canvas.
 * - Clean typography, spacious headline, concise description, premium CTAs, minimal trust line.
 */
export const CinematicHero: React.FC<Props> = ({
  reducedMotion,
  onEnterProduct,
  onLogin,
  signInDisabled,
  signInLabel,
}) => {
  return (
    <section
      className="cine-hero-wrap"
      aria-label="BakaTracker sanctuary introduction"
    >
      <div className="cine-stage">
        {/* Ambient atmospheric backlight */}
        <div className="cine-ambient-glow" aria-hidden="true" />
        <div className="cine-hero-veil" aria-hidden="true" />

        {/* Hero Content & UI Controls */}
        <div className="cine-hero-inner">
          {/* Minimal Clean Navigation Bar */}
          <header className="cine-hero-top">
            <HomeBrand />

            <div className="cine-nav-actions">
              <button
                type="button"
                className="landing-signin"
                onClick={onLogin}
                disabled={signInDisabled}
                title={signInDisabled ? 'Sign-in is not configured on this deployment' : 'Sign in to your instance'}
              >
                <span className="landing-signin-bracket" aria-hidden="true">[</span>
                <span className="landing-signin-label">{signInLabel}</span>
                <span className="landing-signin-cursor" aria-hidden="true" />
                <span className="landing-signin-bracket" aria-hidden="true">]</span>
              </button>
              <button
                type="button"
                className="cine-nav-demo-btn"
                onClick={onEnterProduct}
              >
                <span>TRY DEMO →</span>
              </button>
            </div>
          </header>

          {/* Main Hero Proposition Split (Left Dominated, Uncluttered) */}
          <div className="cine-hero-main">
            <div className="cine-copy-track">
              {/* Refined Minimal Eyebrow */}
              <div className="cine-eyebrow">
                <span className="cine-eyebrow-dot" aria-hidden="true" />
                <span>SOVEREIGN PERSONAL LIFE OS</span>
              </div>

              {/* High-Contrast Balanced Headline */}
              <h1 className="cine-title">
                <span className="cine-title-white cine-title-line">Give the noise</span>
                <span className="cine-title-gradient cine-title-line">somewhere to land.</span>
              </h1>

              {/* Clear, Calm Supporting Paragraph */}
              <p className="cine-sub">
                BakaTracker gathers quests, habits, notes, and your journal into one calm,
                local-first sanctuary. Bakasur attends quietly to turn chaotic capture into focused action.
              </p>

              {/* Clean CTAs */}
              <div className="cine-ctas" role="group" aria-label="Enter the product or explore features">
                <button
                  type="button"
                  className="cine-cta cine-cta-primary"
                  onClick={onEnterProduct}
                >
                  <span>ENTER BAKATRACKER →</span>
                </button>
                <button
                  type="button"
                  className="cine-cta cine-cta-secondary"
                  onClick={() => scrollToId('narrative', reducedMotion)}
                >
                  <Shield className="w-4 h-4 mr-2 text-[var(--sanctuary-violet-electric)]" aria-hidden="true" />
                  <span>THE SANCTUARY</span>
                </button>
              </div>

              {/* Minimalist Trust Line (No Heavy Boxes or Multiple Badges) */}
              <p className="cine-trust-line" role="note">
                <span>◌ Local-first (SQLite)</span>
                <span className="cine-trust-dot" aria-hidden="true">·</span>
                <span>⌁ Zero telemetry</span>
                <span className="cine-trust-dot" aria-hidden="true">·</span>
                <span>✦ AI attends, you decide</span>
              </p>
            </div>
          </div>

          {/* Minimalist Bottom Scroll Cue */}
          <footer className="cine-foot">
            <div className="cine-scroll-cue" aria-hidden="true">
              <span className="cine-wheel" />
              <span>Scroll to explore</span>
            </div>
          </footer>
        </div>

        <p className="sr-only">
          BakaTracker — your sovereign personal life operating system for focused action.
        </p>
      </div>
    </section>
  );
};
