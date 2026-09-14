import React from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CinematicSequence, type SequenceHandle } from './CinematicSequence';
import { SpeechBubble } from './SpeechBubble';
import { overlayStateForProgress, phaseForProgress, type CinematicPhase } from './frames';
import { BaksurCharacter } from '../shell/BaksurCharacter';
import { HomeBrand } from '../../pages/homeParts';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const PHASE_COPY: Record<CinematicPhase, string> = {
  0: '…you brought ALL of this?',
  1: '47 open loops. I counted. Twice.',
  2: 'Hand it over. I hold everything.',
  3: 'There. Now go do the one thing.',
};

const PHASE_LABEL = ['curiosity', 'chaos', 'absorption', 'reveal'] as const;

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
 * CinematicHero — exactly 100vw × 100vh of staged scene, scrubbed by a
 * longer scroll behind it (sticky stage + ScrollTrigger progress).
 *
 * Layers: sequence canvas (Flow frames when present, else transparent) →
 * shade → DOM (wordmark, headline, Bakasur + bubbles, CTAs, cue, dots).
 * ONE ScrollTrigger progress drives everything: canvas frames, the 4-beat
 * phase (state), and the 9-stage overlay timeline (quickSetters — no React
 * re-renders while scrolling). Reduced motion: static poster, no triggers,
 * final-reveal copy.
 */
export const CinematicHero: React.FC<Props> = ({
  reducedMotion,
  onEnterProduct,
  onLogin,
  signInDisabled,
  signInLabel,
}) => {
  const wrapRef = React.useRef<HTMLElement | null>(null);
  const sequenceRef = React.useRef<SequenceHandle | null>(null);
  const copyRef = React.useRef<HTMLDivElement | null>(null);
  const ctasRef = React.useRef<HTMLDivElement | null>(null);
  const tertiaryRef = React.useRef<HTMLButtonElement | null>(null);
  const figureInnerRef = React.useRef<HTMLDivElement | null>(null);
  const cueRef = React.useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = React.useState<CinematicPhase>(reducedMotion ? 3 : 0);
  const [loading, setLoading] = React.useState(!reducedMotion);

  React.useLayoutEffect(() => {
    if (reducedMotion) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    // GSAP quickSetters: one scroll progress drives canvas AND overlay with
    // zero per-frame React renders (phase stays the only state-driven beat).
    const mkOpacity = (el: Element | null) => gsap.quickSetter(el, 'opacity') as (v: number) => void;
    const mkY = (el: Element | null) => gsap.quickSetter(el, 'y', 'px') as (v: number) => void;
    const copyOpacitySet = mkOpacity(copyRef.current);
    const copyYSet = mkY(copyRef.current);
    const ctasOpacitySet = mkOpacity(ctasRef.current);
    const ctasYSet = mkY(ctasRef.current);
    const tertiarySet = gsap.quickSetter(tertiaryRef.current, 'css') as (v: Record<string, unknown>) => void;
    // GSAP 3.15: single-property quickSetter(target, 'scale') writes the
    // invalid CSS property "scaleX,scaleY" (silent no-op in browsers) — the
    // multi-property 'css' form is the one that actually applies transforms.
    const figureSet = gsap.quickSetter(figureInnerRef.current, 'css') as (v: Record<string, unknown>) => void;
    const cueSet = mkOpacity(cueRef.current);
    const applyOverlay = (progress: number) => {
      const s = overlayStateForProgress(progress);
      copyOpacitySet(s.copyOpacity);
      copyYSet(s.copyY);
      ctasOpacitySet(s.ctasOpacity);
      ctasYSet(s.copyY * 0.6);
      // Fully-faded tertiary must not catch clicks or focus mid-cinematic.
      tertiarySet({ opacity: s.tertiaryOpacity, visibility: s.tertiaryOpacity <= 0.02 ? 'hidden' : 'inherit' });
      figureSet({ scale: s.figureScale });
      cueSet(s.cueOpacity);
    };
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrap,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          sequenceRef.current?.draw(p);
          applyOverlay(p);
          const next = phaseForProgress(p);
          setPhase((prev) => (prev === next ? prev : next));
        },
      });
      // Sync the overlay with wherever the scrollbar already is (deep-link,
      // refresh mid-scroll): fires onUpdate once at mount.
      ScrollTrigger.refresh();
    }, wrap);
    // Never trap anyone on a loader: resolve after 2.5s regardless.
    const t = window.setTimeout(() => setLoading(false), 2500);
    return () => {
      window.clearTimeout(t);
      ctx.revert();
    };
  }, [reducedMotion]);

  return (
    <section
      ref={wrapRef}
      className="cine-hero-wrap"
      aria-label="BakaTracker cinematic introduction"
    >
      <div className="cine-stage">
        <CinematicSequence
          ref={sequenceRef}
          reducedMotion={reducedMotion}
          onReady={() => setLoading(false)}
        />
        <div className="cine-shade" aria-hidden="true" />

        <div className="cine-hero-inner">
          <div className="cine-hero-top">
            <HomeBrand />
            <button
              type="button"
              className="landing-signin"
              onClick={onLogin}
              disabled={signInDisabled}
              title={signInDisabled ? 'Sign-in is not configured on this deployment' : 'Sign in or create your own BakaTracker instance'}
            >
              <span className="landing-signin-bracket" aria-hidden="true">[</span>
              <span className="landing-signin-label">{signInLabel}</span>
              <span className="landing-signin-cursor" aria-hidden="true" />
              <span className="landing-signin-bracket" aria-hidden="true">]</span>
            </button>
          </div>

          <div className="cine-hero-main">
            <div ref={copyRef} className="cine-copy-track">
              <p className="cine-kicker">
                <span className="cine-kicker-led" aria-hidden="true" />A personal life OS, narrated by a creature
              </p>
              <h1 className="cine-title">
                Give the noise <em>somewhere to go.</em>
              </h1>
              <p className="cine-sub">
                BakaTracker holds your quests, habits, notes, and journal in one calm,
                local-first system — and Bakasur, the mischievous thing living inside
                it, turns what you capture into what you do.
              </p>
              <div ref={ctasRef} className="cine-ctas" role="group" aria-label="Enter the product, meet Bakasur, or see the magic">
                <button type="button" className="cine-cta cine-cta-primary" onClick={onEnterProduct}>
                  Enter BakaTracker
                </button>
                <button type="button" className="cine-cta cine-cta-secondary" onClick={() => scrollToId('philosophy', reducedMotion)}>
                  Meet Bakasur
                </button>
                <button ref={tertiaryRef} type="button" className="cine-cta cine-cta-tertiary" onClick={() => scrollToId('walkthrough', reducedMotion)}>
                  Show me the magic
                </button>
              </div>
            </div>

            <div className="cine-figure">
              <div ref={figureInnerRef} className="cine-figure-inner">
                <BaksurCharacter
                  direction="flamehorn"
                  state={phase === 3 ? 'HAPPY' : 'IDLE'}
                  size={480}
                  className="cine-bakasur"
                  followPointer={!reducedMotion}
                  frozenAt={reducedMotion ? 0 : undefined}
                  moodColor="#8b5cf6"
                  ariaLabel={`Bakasur, a small charcoal creature — currently ${PHASE_LABEL[phase]}`}
                />
                <div className="cine-bubble-slot">
                  <SpeechBubble key={phase} text={PHASE_COPY[phase]} tail="left" />
                </div>
              </div>
            </div>
          </div>

          <div className="cine-foot">
            <div ref={cueRef} className="cine-scroll-cue" aria-hidden="true">
              <span className="cine-wheel" />
              <span>Scroll — you steer the scene</span>
            </div>
            <ol className="cine-phases" aria-hidden="true">
              {([0, 1, 2, 3] as CinematicPhase[]).map((p) => (
                <li key={p} className={p <= phase ? 'is-on' : ''} />
              ))}
            </ol>
          </div>
        </div>

        {loading && (
          <div className="cine-loader" role="status">
            tuning the tunnel…
          </div>
        )}

        {/* Screen-reader narrative: the canvas is never the only channel. */}
        <p className="sr-only">
          A dark tunnel of violet light. Bakasur, a small charcoal creature, watches your
          scattered tasks fly past, gathers them, and hands back a single clear next step.
        </p>
      </div>
    </section>
  );
};
