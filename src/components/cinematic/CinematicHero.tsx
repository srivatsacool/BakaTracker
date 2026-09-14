import React from 'react';
import { BakasurDialogue } from '../bakasur/BakasurDialogue';
import { BaksurCharacter } from '../shell/BaksurCharacter';
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
 * - Pure deep obsidian void canvas (no busy background images, arches, or pillars).
 * - Gentle ambient violet radial glow centered behind Bakasur.
 * - Left: Clean typography, spacious headline, concise description, premium CTAs, minimal trust line.
 * - Right: Massive Bakasur presence loomed on the edge, peeking into the scene on interaction.
 * - Dialogue: Only appears when interacting with Bakasur (clean and uncluttered at rest).
 */
export const CinematicHero: React.FC<Props> = ({
  reducedMotion,
  onEnterProduct,
  onLogin,
  signInDisabled,
  signInLabel,
}) => {
  const [characterSize, setCharacterSize] = React.useState(680);

  // Responsive character sizing: calibrated for absolute spatial composition
  React.useEffect(() => {
    const updateSize = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      if (vw < 640) {
        setCharacterSize(Math.round(Math.min(vw * 0.50, 210)));
      } else if (vw < 1024) {
        setCharacterSize(Math.round(Math.min(vh * 0.62, 460)));
      } else {
        setCharacterSize(Math.round(Math.min(vh * 0.78, 680)));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <section
      className="cine-hero-wrap"
      aria-label="BakaTracker sanctuary introduction"
    >
      <div className="cine-stage">
        {/* Ambient atmospheric backlight behind Bakasur */}
        <div className="cine-ambient-glow" aria-hidden="true" />
        <div className="cine-hero-veil" aria-hidden="true" />

        {/* Giant Bakasur Presence (Positioned absolutely on desktop & mobile) */}
        <div
          className={`cine-giant-bakasur-stage ${reducedMotion ? 'reduced-motion' : ''}`}
          aria-label="Bakasur, your sovereign life OS companion"
        >
          {/* Spatial Dialogue Plate */}
          <div className="cine-dialogue-anchor">
            <BakasurDialogue
              message="Quiet the noise. I hold everything."
              visible={true}
              scene="sanctuary"
            />
          </div>

          <div className="cine-giant-character-wrap">
            <div className="cine-giant-pedestal-light" aria-hidden="true" />
            <BaksurCharacter
              direction="flamehorn"
              state="IDLE"
              size={characterSize}
              className="cine-giant-bakasur"
              followPointer={!reducedMotion}
              frozenAt={reducedMotion ? 0 : undefined}
              moodColor="#8b5cf6"
              ariaLabel="Bakasur, your sovereign life OS companion"
            />
          </div>
        </div>

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
                  onClick={() => scrollToId('philosophy', reducedMotion)}
                >
                  <Shield className="w-4 h-4 mr-2 text-[var(--sanctuary-violet-electric)]" aria-hidden="true" />
                  <span>MEET BAKASUR</span>
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
          A giant Bakasur creature watches peacefully from the edge of an obsidian sanctuary,
          peeking into the scene as you interact, and externalizing life chaos into focused action.
        </p>
      </div>
    </section>
  );
};
