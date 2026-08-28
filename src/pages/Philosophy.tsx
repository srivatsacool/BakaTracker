import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GITHUB_REPO_URL, HomeBrand } from './homeParts';

/**
 * Philosophy — why BakaTracker exists.
 *
 * Public Darkglass page in the same cinematic shell as Home (shared
 * .home-scene grammar), intentionally quiet: a few short sections over the
 * tunnel world. Built to be expanded in a later phase — motivation, design
 * decisions, engineering decisions, open-source reasoning — without any
 * structural change to routing or layout.
 */
export const Philosophy: React.FC = () => (
  <div className="home-scene" style={{ color: 'var(--obs-paper)' }}>
    <div className="obs-readability-overlay" aria-hidden="true" />

    <div className="home-content">
      <header className="home-header">
        <HomeBrand />
        <Link to="/" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
        </Link>
      </header>

      <main className="philosophy-main">
        <p className="obs-kicker home-kicker">
          <span className="home-kicker-led" aria-hidden="true" />
          Philosophy
        </p>
        <h1 className="home-title philosophy-title">Built because nothing else treated a life as one system.</h1>

        <section className="philosophy-section">
          <h2>One system, not ten apps</h2>
          <p className="landing-hero-copy">
            Tasks live in one tool, habits in another, notes in a third, and the journal nowhere at all.
            Each app holds a fragment and none of them can see the whole day. BakaTracker keeps every part
            of the day in one ledger — quests, habits, notes, journal, progression — so context never gets lost.
          </p>
        </section>

        <section className="philosophy-section">
          <h2>Local-first, always</h2>
          <p className="landing-hero-copy">
            Your data lives with you first and syncs to your own instance when you choose. Nothing is rented,
            nothing is held hostage, and the export door is always open. A record of your life should sit
            in your hands, not behind someone else's business model.
          </p>
        </section>

        <section className="philosophy-section">
          <h2>A machine-readable life</h2>
          <p className="landing-hero-copy">
            Every check-in is structured data, which is what lets one assistant reason over the whole ledger
            honestly. BakaSur's numbers are always computed from your real activity — only the phrasing is
            generated. Progression works the same way: XP and scores are derived from what you actually did,
            never inflated to keep you scrolling.
          </p>
        </section>

        <section className="philosophy-section">
          <h2>Why open source</h2>
          <p className="landing-hero-copy">
            A personal life operating system asks for more trust than an app — it asks to hold your record.
            Trust requires that the whole thing be inspectable: the interface, the sync engine, the storage
            contracts, all of it. So the source is public, and anyone can run their own instance end to end.
          </p>
          <p className="landing-hero-copy">
            <a className="btn-ghost" href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              Read the source on GitHub
            </a>
          </p>
        </section>
      </main>

      <footer className="home-footer">
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>BakaTracker</Link>
        <span aria-hidden="true">·</span>
        <span>An open-source personal life OS</span>
      </footer>
    </div>
  </div>
);
