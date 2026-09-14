import React from 'react';
import { useCineReveal } from './reveal';

interface Shot {
  src: string;
  tag: string;
  title: string;
  body: string;
  alt: string;
}

/**
 * Walkthrough — REAL product evidence. Every frame below was captured from
 * a live BakaTracker instance running the demo world (scripts-free, one
 * headless pass). No mockups, no stock UI.
 */
const SHOTS: Shot[] = [
  {
    src: '/media/walkthrough/today.webp',
    tag: 'Today',
    title: 'The day, distilled to quests.',
    body: 'Priority quest on top, the rest queued. XP, streaks, and what is left — one glance, full picture.',
    alt: 'BakaTracker Today view: daily quests list with a priority quest, XP progress bar, and level indicator',
  },
  {
    src: '/media/walkthrough/bakasur.webp',
    tag: 'BakaSur',
    title: 'Ask about your day. It knows the context.',
    body: 'The companion terminal reads your actual workspace — quests, habits, journal — and answers from it.',
    alt: 'BakaSur companion terminal greeting the user with an input box ready for questions',
  },
  {
    src: '/media/walkthrough/tasks.webp',
    tag: 'Tasks',
    title: 'Captured fast, organized faster.',
    body: 'Throw tasks in as they arrive. They sort themselves into queue, active, and cleared.',
    alt: 'BakaTracker Tasks view with queued, active, and cleared task columns',
  },
  {
    src: '/media/walkthrough/habits.webp',
    tag: 'Habits',
    title: 'Streaks with teeth.',
    body: 'Daily instruments you actually enjoy checking — progress you can feel accumulate.',
    alt: 'BakaTracker Habits view showing habit instruments and streak progress',
  },
  {
    src: '/media/walkthrough/journal.webp',
    tag: 'Journal',
    title: 'The record writes itself back.',
    body: 'End the day in words. The journal remembers what the dashboards forget.',
    alt: 'BakaTracker Journal view with dated entries',
  },
];

export const Walkthrough: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const ref = useCineReveal<HTMLElement>(reducedMotion);
  return (
    <section ref={ref} id="walkthrough" className="cine-section" aria-labelledby="cine-walkthrough-title" tabIndex={-1}>
      <div className="cine-section-head" data-cine-reveal>
        <p className="cine-section-index">03 · The actual app</p>
        <h2 className="cine-section-title" id="cine-walkthrough-title">
          No mockups. This is it, running.
        </h2>
        <p className="cine-section-lede">
          Captured from a live instance — the same screens you get when you
          enter. What the philosophy promises, these pixels deliver.
        </p>
      </div>
      <div className="cine-shots">
        {SHOTS.map((s) => (
          <figure key={s.tag} className="cine-shot" data-cine-reveal>
            <div className="cine-shot-frame">
              <img src={s.src} alt={s.alt} loading="lazy" decoding="async" width={1200} height={750} />
            </div>
            <figcaption>
              <span className="cine-shot-tag" aria-hidden="true">{s.tag}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};
