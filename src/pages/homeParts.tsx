import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared bits for the public pages (Home / Philosophy): the repository
 * constant and the minimal brand lockup. Deliberately tiny — these pages
 * are the project's cover, not a component library.
 */

export const GITHUB_REPO_URL = 'https://github.com/srivatsacool/BakaTracker';

/** Minimal navigation brand — logo, name, and the PERSONAL LIFE OS kicker. */
export const HomeBrand: React.FC = () => (
  <Link to="/" className="home-brand" aria-label="BakaTracker home">
    <img src="/logo.png" alt="" className="home-brand-mark" />
    <span className="flex flex-col leading-none">
      <b className="marquee-title" style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--obs-paper)' }}>BakaTracker</b>
      <small className="font-mono text-[9px] tracking-[0.22em] mt-1" style={{ color: 'var(--obs-aurora-bright)' }}>PERSONAL LIFE OS</small>
    </span>
  </Link>
);
