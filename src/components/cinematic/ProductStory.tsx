import React from 'react';
import { useCineReveal } from './reveal';

const STEPS: { title: string; body: string; artifact: string }[] = [
  {
    title: 'You capture',
    body: 'Throw the day at it — a task, a half-thought, a photo of a whiteboard. Capture takes seconds and asks nothing of you.',
    artifact: '> dentist Thursday? + budget draft + “call mom”',
  },
  {
    title: 'Baka understands',
    body: 'Bakasur reads it back to you, minus the noise: what it is, what it wants, what it can wait for.',
    artifact: '⤷ 3 quests · 1 habit · filed under Health',
  },
  {
    title: 'It gets organized',
    body: 'Everything lands where it belongs — quest, habit, note, journal. No filing afternoons, no second brain maintenance.',
    artifact: '✓ placed · nothing left in the pile',
  },
  {
    title: 'Knowledge connects',
    body: 'Related projects surface on their own. Something you captured months ago walks up and taps you on the shoulder.',
    artifact: '⤷ linked: “Q3 planning” ↔ “dentist” (calendar)',
  },
  {
    title: 'Action emerges',
    body: 'One next action rises to the top. Not a dashboard of fifty — one thing, chosen with full context.',
    artifact: '▶ next: book the dentist — 2 min, high relief',
  },
  {
    title: 'You act',
    body: 'You do it. XP lands, the streak holds, the journal remembers. The loop closes and the noise stays gone.',
    artifact: '+25 XP · streak 12 · day: CLEAR',
  },
];

/**
 * ProductStory — one coherent journey, not feature cards.
 * CAPTURE → UNDERSTAND → ORGANIZE → CONNECT → EMERGE → ACT.
 */
export const ProductStory: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const ref = useCineReveal<HTMLElement>(reducedMotion);
  return (
    <section ref={ref} id="story" className="cine-section cine-section-centered" aria-labelledby="cine-story-title" tabIndex={-1}>
      <div className="cine-section-head" data-cine-reveal>
        <p className="cine-section-index">02 · How it works</p>
        <h2 className="cine-section-title" id="cine-story-title">
          One Tuesday, from chaos to closed loop.
        </h2>
        <p className="cine-section-lede">
          Follow a single scattered morning through the system — the same six
          moves, every day, for anything you carry.
        </p>
      </div>
      <ol className="cine-story">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className={`cine-story-step${i === STEPS.length - 1 ? ' is-final' : ''}`}
            data-cine-reveal
          >
            <span className="cine-story-node" aria-hidden="true"><span /></span>
            <div>
              <h3>STEP {i + 1} — {s.title}</h3>
              <p>{s.body}</p>
              <p className="cine-story-artifact" aria-label={`System output: ${s.artifact}`}>{s.artifact}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
