import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getTodayDateString, formatDate } from '../lib/utils';
import { Search, Award } from 'lucide-react';
import type { JournalEntry } from '../types';

/**
 * Journal — the diary booth. One honest sentence a day: highlight,
 * mood, notes. Writing a highlight earns +10 XP.
 */
export const Journal: React.FC = () => {
  const { journal, saveJournalEntry, currentQuote } = useStore();

  const [date, setDate] = useState(getTodayDateString());
  const [highlight, setHighlight] = useState('');
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood']>('😐');
  const [searchQuery, setSearchQuery] = useState('');

  // Load existing entry values if editing a past day or if there is already an entry for today
  useEffect(() => {
    const existing = journal.find(j => j.date === date);
    if (existing) {
      setHighlight(existing.highlight);
      setNotes(existing.notes);
      setMood(existing.mood || '😐');
    } else {
      setHighlight('');
      setNotes('');
      setMood('😐');
    }
  }, [date, journal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlight.trim()) return;

    saveJournalEntry(date, highlight, notes, mood);
  };

  const filteredEntries = journal
    .filter(j =>
      j.highlight.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.notes.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.date.localeCompare(a.date)); // Newest first

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">

      {/* Page Header */}
      <div>
        <h2 className="marquee-title text-2xl m-0" style={{ color: 'var(--arcade-paper)' }}>Daily Highlight Journal</h2>
        <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Capture memories in one sentence. Build discipline.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Log Form — the diary booth */}
        <form onSubmit={handleSubmit} className="cabinet cabinet--playing md:col-span-2" style={{ '--marquee-color': 'var(--arcade-magenta)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Today's reflection</span>
            <span className="ml-auto font-mono text-[10px] chip chip--aurora">+10 XP</span>
          </div>
          <div className="cabinet-screen !p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="arcade-input font-mono text-sm !py-1.5 !w-auto"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>
                Highlight of the Day <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={highlight}
                onChange={e => setHighlight(e.target.value)}
                placeholder="What was the single best thing that happened today?"
                className="arcade-input text-sm"
                maxLength={120}
                required
              />
              <span className="text-[10px] text-right mt-0.5 font-mono" style={{ color: 'var(--arcade-paper-disabled)' }}>
                {120 - highlight.length} characters remaining
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>How do you feel?</label>
              <div className="flex gap-3 mt-1">
                {(['😞', '😐', '🙂'] as const).map(emoji => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setMood(emoji)}
                    className={`w-11 h-11 rounded-lg text-xl cursor-pointer transition hover:scale-110 ${mood === emoji ? 'chip chip--magenta' : 'chip'}`}
                    aria-label={`Set mood to ${emoji}`}
                    aria-pressed={mood === emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anything else worth remembering…"
                className="arcade-input min-h-[90px] resize-y"
                maxLength={1000}
              />
            </div>

            {/* Quote strip inside the booth */}
            {currentQuote && (
              <p className="m-0 font-mono text-[10px] leading-relaxed italic" style={{ color: 'var(--arcade-paper-muted)' }}>
                “{currentQuote.quote}” — {currentQuote.author}
              </p>
            )}

            <button type="submit" disabled={!highlight.trim()} className="insert-coin self-start !text-xs">
              <span className="coin-slot" aria-hidden="true" /> {highlight.trim() ? 'Save entry' : 'Write a highlight to save'}
            </button>
          </div>
        </form>

        {/* Recent streak card */}
        <div className="flex flex-col gap-4">
          <div className="cabinet cabinet--highscore" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
            <div className="cabinet-marquee">
              <span className="cabinet-led" aria-hidden="true" />
              <span className="cabinet-marquee-title">Consistency</span>
            </div>
            <div className="cabinet-screen !p-4 text-center">
              <Award className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
              <p className="marquee-title m-0 text-2xl" style={{ color: 'var(--arcade-gold)' }}>{journal.length}</p>
              <p className="m-0 mt-1 font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>entries logged</p>
            </div>
          </div>

          <div className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-cobalt)' } as React.CSSProperties}>
            <div className="cabinet-marquee">
              <span className="cabinet-led" aria-hidden="true" />
              <span className="cabinet-marquee-title">Search diary</span>
            </div>
            <div className="cabinet-screen !p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--arcade-paper-disabled)' }} aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search memories…"
                  className="arcade-input !pl-9 !py-2 !text-xs"
                  aria-label="Search journal entries"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Entries list */}
      <div className="flex flex-col gap-3">
        {filteredEntries.length === 0 ? (
          <div className="attract-state">
            <span className="text-4xl" aria-hidden="true">📓</span>
            <div className="attract-dots" aria-hidden="true"><span /><span /><span /></div>
            <h3>No memories on this booth</h3>
            <p>Write one honest sentence about today. It earns +10 XP and builds a memory of the day.</p>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <article key={entry.id} className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-magenta)' } as React.CSSProperties}>
              <div className="cabinet-marquee">
                <span className="cabinet-led" aria-hidden="true" />
                <span className="cabinet-marquee-title">{formatDate(entry.date)}</span>
                <span className="ml-auto font-mono text-base" aria-hidden="true">{entry.mood}</span>
              </div>
              <div className="cabinet-screen !p-4">
                <p className="m-0 text-sm font-bold" style={{ color: 'var(--arcade-paper)' }}>{entry.highlight}</p>
                {entry.notes && (
                  <p className="m-0 mt-2 text-[0.8rem] leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>{entry.notes}</p>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
