import React from 'react';
import { GITHUB_REPO_URL } from '../../pages/homeParts';
import { useCineReveal } from './reveal';

interface Props {
  reducedMotion: boolean;
  onEnterProduct: () => void;
  onLogin: () => void;
  signInDisabled: boolean;
}

/** FinalCta — simplicity. One clear call to action, one ground line. Formatted for 100vh viewport fit. */
export const FinalCta: React.FC<Props> = ({ reducedMotion, onEnterProduct, onLogin, signInDisabled }) => {
  const ref = useCineReveal<HTMLElement>(reducedMotion);
  return (
    <section ref={ref} id="enter" className="cine-section cine-final" aria-labelledby="cine-final-title" tabIndex={-1}>
      <div data-cine-reveal className="cine-final-inner">
        <h2 className="cine-final-title" id="cine-final-title">The den is open.</h2>
        <p className="cine-final-sub">
          Bring the noise. Leave with the one thing that matters — then come
          back tomorrow and do it again. Free, open source, yours.
        </p>
        <div className="cine-final-ctas">
          <button type="button" className="cine-cta cine-cta-primary" onClick={onEnterProduct}>
            Enter BakaTracker
          </button>
        </div>
        <button
          type="button"
          className="cine-final-signin"
          onClick={onLogin}
          disabled={signInDisabled}
        >
          or sign in to your own instance
        </button>
      </div>
      <div className="cine-ground">
        <span>Local-first</span>
        <span aria-hidden="true">·</span>
        <span>Open source</span>
        <span aria-hidden="true">·</span>
        <span>Your instance</span>
        <span aria-hidden="true">·</span>
        <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </section>
  );
};
