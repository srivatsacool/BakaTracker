import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { getTodayDateString, formatDate } from '../lib/utils';
import { Search, Flame } from 'lucide-react';
import type { JournalEntry } from '../types';
import { GlassPane, EmptyState } from '../components/ui';

/**
 * Journal — the quiet room. One honest sentence a day: highlight,
 * mood, notes. Writing a highlight earns +10 XP. Mood only — no
 * energy field exists, so nothing here claims one.
 */
export const Journal: React.FC = () => {
  const { journal, saveJournalEntry, currentQuote } = useStore(useShallow(s => ({
    journal: s.journal,
    saveJournalEntry: s.saveJournalEntry,
    currentQuote: s.currentQuote,
  })));

  const [date, setDate] = useState(getTodayDateString());
  // Draft model — derived, effect-free. Local state holds ONLY what the user
  // is actively typing, tagged with the date it belongs to; initial
  // population, date switching and reload persistence all derive straight
  // from the store during render, so no cascading sync-effect is needed.
  interface Draft { highlight: string; notes: string; mood: JournalEntry['mood']; }
  const emptyDraft: Draft = { highlight: '', notes: '', mood: '😐' };
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [searchQuery, setSearchQuery] = useState('');

  const existingEntry = journal.find(j => j.date === date);
  const activeDraft = draftDate === date ? draft : null;
  const highlight = activeDraft ? activeDraft.highlight : (existingEntry?.highlight ?? '');
  const notes = activeDraft ? activeDraft.notes : (existingEntry?.notes ?? '');
  const mood: JournalEntry['mood'] = activeDraft ? activeDraft.mood : (existingEntry?.mood ?? '😐');

  // Event-time capture of user edits; seeds from the store entry when the
  // first edit for this date begins.
  const updateDraft = (patch: Partial<Draft>) => {
    setDraftDate(date);
    setDraft(prev =>
      draftDate === date
        ? { ...prev, ...patch }
        : {
            highlight: existingEntry?.highlight ?? '',
            notes: existingEntry?.notes ?? '',
            mood: existingEntry?.mood ?? '😐',
            ...patch,
          }
    );
  };

  const todayStr = getTodayDateString();

  // Today's highlight status — same store data the Today cockpit reads.
  const todayLogged = journal.some(j => j.date === todayStr && j.highlight.trim().length > 0);

  // Consecutive days with an entry, counting back from today (or yesterday
  // when today isn't written yet — the streak isn't broken until the day ends).
  const journalStreak = (() => {
    const dates = [...new Set(journal.map(j => j.date).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    if (dates.length === 0) return 0;
    const rel = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const start = dates[0] === todayStr ? 0 : dates[0] === rel(1) ? 1 : -1;
    if (start < 0) return 0;
    let streak = 0;
    for (let i = start; ; i++) {
      if (dates.includes(rel(i))) streak += 1;
      else break;
    }
    return streak;
  })();

  // Mood colors for the timeline dots (mood per entry is already stored).
  const moodColor: Record<string, string> = {
    '😞': 'var(--obs-coral)',
    '😐': 'var(--obs-paper-muted)',
    '🙂': 'var(--obs-teal)',
    '😄': 'var(--obs-aurora-bright)'
  };

  // Reverse-chron mood dots (newest first), skipping entries with no mood.
  const moodDots = journal
    .filter(j => j.mood && moodColor[j.mood])
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)
    .map(j => ({ date: j.date, mood: j.mood, color: moodColor[j.mood] }));


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
        <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>The quiet room — one honest sentence a day is enough.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Log Form — the diary booth */}
        <GlassPane
          as="form"
          onSubmit={handleSubmit}
          state="playing"
          tone="rose"
          className="md:col-span-2"
          paneTitle="Today's reflection"
          titleRight={
            <>
              <span className={`font-mono text-[10px] chip ${todayLogged ? 'chip--teal' : ''}`}>
                {todayLogged ? "Today's highlight: ✓ logged" : "Today's highlight: not logged yet"}
              </span>
              <span className="font-mono text-[10px] chip chip--aurora">+10 XP</span>
            </>
          }
          screenClassName="!p-5 flex flex-col gap-4"
        >
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
                onChange={e => updateDraft({ highlight: e.target.value })}
                placeholder="One sentence is enough — what was the single best thing today?"
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
                {(['😞', '😐', '🙂', '😄'] as const).map(emoji => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => updateDraft({ mood: emoji })}
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
                onChange={e => updateDraft({ notes: e.target.value })}
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
        </GlassPane>

        {/* Recent streak card */}
        <div className="flex flex-col gap-4">
          <GlassPane as="div" state="off" tone="aurora" paneTitle="Consistency" screenClassName="!p-4 text-center">
              <Flame className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
              <p className="marquee-title m-0 text-2xl" style={{ color: 'var(--arcade-gold)' }}>{journalStreak}</p>
              <p className="m-0 mt-1 font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>
                {journalStreak === 1 ? 'day in a row' : 'days in a row'}
              </p>
              <p className="m-0 mt-2 font-mono text-[9px]" style={{ color: 'var(--arcade-paper-disabled)' }}>
                {journal.length} {journal.length === 1 ? 'entry' : 'entries'} logged
              </p>
          </GlassPane>

          {/* Mood-dot timeline — reverse-chron, newest first */}
          <GlassPane as="div" state="off" tone="rose" paneTitle="Mood trail" screenClassName="!p-4">
              {moodDots.length === 0 ? (
                <p className="m-0 py-2 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>
                  No moods yet — entries paint the trail.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5" role="list" aria-label="Mood history, newest first">
                    {moodDots.map((dot, i) => (
                      <span
                        key={dot.date}
                        role="listitem"
                        className="mood-dot"
                        style={{ background: dot.color, boxShadow: i === 0 ? `0 0 6px ${dot.color}` : 'none' }}
                        title={`${formatDate(dot.date)} — ${dot.mood}`}
                        aria-label={`${formatDate(dot.date)} — ${dot.mood}`}
                      />
                    ))}
                  </div>
                  <p className="m-0 mt-2 font-mono text-[9px]" style={{ color: 'var(--arcade-paper-disabled)' }}>
                    newest → oldest · last {moodDots.length}
                  </p>
                </>
              )}
          </GlassPane>

          <GlassPane as="div" state="off" tone="cobalt" paneTitle="Search diary" screenClassName="!p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--arcade-paper-disabled)' }} aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search memories…"
                  className="arcade-input !pl-8"
                  maxLength={120}
                  aria-label="Search journal entries"
                />
              </div>
          </GlassPane>
        </div>
      </div>

      {/* Entries list */}
      <div className="flex flex-col gap-4">
        {filteredEntries.length === 0 ? (
          <EmptyState
            icon={<span className="text-4xl" aria-hidden="true">📓</span>}
            title={searchQuery ? 'No memories match' : 'No memories on this booth'}
            description={searchQuery ? `Nothing found for “${searchQuery}” — try a different word.` : 'Write one honest sentence about today. It earns +10 XP and builds a memory of the day.'}
          />
        ) : (
          filteredEntries.map(entry => (
            <GlassPane
              as="article"
              key={entry.id}
              state="off"
              tone="rose"
              paneTitle={formatDate(entry.date)}
              titleRight={<span className="font-mono text-base" aria-hidden="true">{entry.mood}</span>}
              screenClassName="!p-4"
            >
                <p className="journal-entry-copy m-0 text-sm font-bold" style={{ color: 'var(--arcade-paper)' }}>{entry.highlight}</p>
                {entry.notes && (
                  <p className="journal-entry-copy m-0 mt-2 text-[0.8rem] leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>{entry.notes}</p>
                )}
            </GlassPane>
          ))
        )}
      </div>
    </div>
  );
};
