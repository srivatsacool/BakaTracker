import React from 'react';
import { BaksurCharacter } from '../shell/BaksurCharacter';
import { SpeechBubble } from './SpeechBubble';
import { useCineReveal } from './reveal';

const ROLES: { title: string; body: string }[] = [
  {
    title: 'He holds everything',
    body: '47 open loops, counted twice. Quests, habits, notes, journal — Bakasur carries what your head cannot.',
  },
  {
    title: 'He finds the thread',
    body: 'He reads what you capture and surfaces the one thing that matters now. The rest waits quietly.',
  },
  {
    title: 'He stays inside your walls',
    body: 'Local-first, like the rest of BakaTracker. Your creature never phones home with your life.',
  },
];

/**
 * BakasurSpotlight — the creature's dedicated storytelling moment.
 * Character-led: a large Bakasur narrating his role inside the system,
 * flanked by three short role beats. No documentation, no feature lists.
 */
export const BakasurSpotlight: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const ref = useCineReveal<HTMLElement>(reducedMotion);
  return (
    <section ref={ref} id="bakasur" className="cine-section" aria-labelledby="cine-bakasur-title" tabIndex={-1}>
      <div className="cine-section-head" data-cine-reveal>
        <p className="cine-section-index">04 · Meet Bakasur</p>
        <h2 className="cine-section-title" id="cine-bakasur-title">
          The creature inside the machine.
        </h2>
        <p className="cine-section-lede">
          BakaTracker is a system. Bakasur is why the system feels alive — a mischievous,
          observant narrator who turns what you capture into what you do.
        </p>
      </div>
      <div className="cine-spot" data-cine-reveal>
        <figure className="cine-spot-stage">
          <BaksurCharacter
            direction="flamehorn"
            state="HAPPY"
            size={360}
            className="cine-spot-bakasur"
            followPointer={!reducedMotion}
            frozenAt={reducedMotion ? 0 : undefined}
            moodColor="#8b5cf6"
            ariaLabel="Bakasur, the small charcoal creature who narrates BakaTracker"
          />
          <SpeechBubble text="Hand it over. I hold everything." tail="left" />
        </figure>
        <ul className="cine-spot-roles">
          {ROLES.map((r, i) => (
            <li key={r.title} className="cine-spot-role">
              <span className="cine-beat-numeral" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
