import React from 'react';
import { BaksurCharacter } from '../shell/BaksurCharacter';
import { SpeechBubble } from './SpeechBubble';
import { useCineReveal } from './reveal';

const BEATS: { title: string; body: string }[] = [
  {
    title: 'The problem',
    body: 'Your life is scattered across a dozen apps, forty tabs, three notebooks, and the back of your mind. Everything nags. Nothing connects.',
  },
  {
    title: 'The idea',
    body: 'Give it all one place to land — and put something inside that place which actually understands what lands there.',
  },
  {
    title: 'The system',
    body: 'Quests, habits, notes, journal. Local-first and open source. Your instance, your data, your rules — the machine never phones home with your life.',
  },
  {
    title: 'The creature',
    body: 'Bakasur lives in the system. Mischievous, observant, kind. He reads what you capture and finds the thread you dropped.',
  },
  {
    title: 'The product',
    body: 'This is not a metaphor. Below is the actual app, doing the actual work — captured this week, from a real running instance.',
  },
];

/**
 * NarrativeSection — PROBLEM → IDEA → SYSTEM → CREATURE → PRODUCT.
 * Editorial beats, big whitespace, Bakasur narrating the creature beat.
 */
export const NarrativeSection: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const ref = useCineReveal<HTMLElement>(reducedMotion);
  return (
    <section ref={ref} id="philosophy" className="cine-section" aria-labelledby="cine-philosophy-title" tabIndex={-1}>
      <div className="cine-section-head" data-cine-reveal>
        <p className="cine-section-index">01 · Why Bakasur</p>
        <h2 className="cine-section-title" id="cine-philosophy-title">
          Externalize the chaos. Keep the meaning.
        </h2>
        <p className="cine-section-lede">
          BakaTracker is built on one belief: a scattered mind isn&rsquo;t a broken
          mind — it&rsquo;s an unheld one. Capture everything, understand it, track
          it, act on it.
        </p>
      </div>
      <div className="cine-beats">
        {BEATS.slice(0, 3).map((b, i) => (
          <article key={b.title} className="cine-beat" data-cine-reveal>
            <span className="cine-beat-numeral" aria-hidden="true">0{i + 1}</span>
            <div>
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </div>
          </article>
        ))}
        <article className="cine-beat cine-beat-creature" data-cine-reveal>
          <span className="cine-beat-numeral" aria-hidden="true">04</span>
          <div>
            <h3>{BEATS[3].title}</h3>
            <p>{BEATS[3].body}</p>
            <div className="cine-narrator-row">
              <BaksurCharacter
                direction="flamehorn"
                state="HAPPY"
                size={72}
                followPointer={!reducedMotion}
                frozenAt={reducedMotion ? 0 : undefined}
                decorative
              />
              <SpeechBubble text="I read everything. I judge nothing. Mostly." tail="left" />
            </div>
          </div>
        </article>
        <article className="cine-beat" data-cine-reveal>
          <span className="cine-beat-numeral" aria-hidden="true">05</span>
          <div>
            <h3>{BEATS[4].title}</h3>
            <p>{BEATS[4].body}</p>
          </div>
        </article>
      </div>
    </section>
  );
};
