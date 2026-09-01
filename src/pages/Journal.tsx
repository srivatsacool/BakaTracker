import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { getTodayDateString, formatDate } from '../lib/utils';
import { Search } from 'lucide-react';
import type { JournalEntry } from '../types';
import { GlassPane, PixelIcon, SystemLabel, TerminalText, AsciiBox } from '../components/ui';
import { JournalHUD } from '../components/shared/JournalHUD';
import { JournalMoodSelector } from '../components/shared/JournalMoodSelector';

/**
 * Journal — the daily log. One honest sentence a day: highlight,
 * mood, notes. Writing a highlight earns +10 XP. The quietest major page.
 * Refinement Phase 7: BakaTracker daily log personality.
 */
export const Journal: React.FC = () => {
  const { journal, saveJournalEntry, currentQuote } = useStore(useShallow(s => ({
    journal: s.journal,
    saveJournalEntry: s.saveJournalEntry,
    currentQuote: s.currentQuote,
  })));

  const [date, setDate] = useState(getTodayDateString());
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

  const updateDraft = (patch: Partial<Draft>) => {
    setDraftDate(date);
    setDraft(prev =>
      draftDate === date
        ? { ...prev, ...patch }
        : { highlight: existingEntry?.highlight ?? '', notes: existingEntry?.notes ?? '', mood: existingEntry?.mood ?? '😐', ...patch }
    );
  };

  const todayStr = getTodayDateString();
  const todayLogged = journal.some(j => j.date === todayStr && j.highlight.trim().length > 0);

  const journalStreak = (() => {
    const dates = [...new Set(journal.map(j => j.date).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    if (dates.length === 0) return 0;
    const rel = (offset: number) => {
      const d = new Date(); d.setDate(d.getDate() - offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const start = dates[0] === todayStr ? 0 : dates[0] === rel(1) ? 1 : -1;
    if (start < 0) return 0;
    let streak = 0;
    for (let i = start; ; i++) { if (dates.includes(rel(i))) streak += 1; else break; }
    return streak;
  })();

  const moodColor: Record<string, string> = {
    '😞': 'var(--bt-danger)', '😐': 'var(--bt-text-muted)', '🙂': 'var(--bt-success)', '😄': 'var(--bt-primary-bright)',
  };

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
    .filter(j => j.highlight.toLowerCase().includes(searchQuery.toLowerCase()) || j.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Mood labels for screen readers
  const moodLabel: Record<string, string> = { '😞': 'Low', '😐': 'Neutral', '🙂': 'Good', '😄': 'Great', '': 'None' };

  return (
    <div className="w-full max-w-[1100px] mx-auto flex flex-col gap-6 md:pb-48 pb-20">
      {/* Journal HUD */}
      <JournalHUD daysLogged={journal.length} currentStreak={journalStreak} todayLogged={todayLogged} />

      {/* Page Header */}
      <div>
        <h2 className="marquee-title text-2xl m-0" style={{ color: 'var(--bt-text)' }}>
          <TerminalText tone="primary" prompt>DAILY LOG</TerminalText>
        </h2>
        <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--bt-text-muted)' }}>
          One honest sentence a day is enough.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Log Form — the diary booth */}
        <GlassPane as="form" onSubmit={handleSubmit} state="playing" tone="rose"
          className="md:col-span-2"
          paneTitle="TODAY'S REFLECTION"
          titleRight={
            <>
              {todayLogged ? (
                <PixelIcon name="check" size={12} color="var(--bt-success)" className="inline" />
              ) : (
                <PixelIcon name="checkbox" size={12} color="var(--bt-text-disabled)" className="inline" />
              )}
              <SystemLabel tone={todayLogged ? 'success' : 'muted'} className="ml-1">
                {todayLogged ? 'Logged' : 'Not yet'}
              </SystemLabel>
              <SystemLabel tone="primary" className="ml-2">+10 XP</SystemLabel>
            </>
          }
          screenClassName="!p-5 flex flex-col gap-4">

          {/* Date */}
          <div className="flex flex-col gap-1">
            <SystemLabel tone="muted">DATE</SystemLabel>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="arcade-input font-mono text-sm !py-1.5 !w-auto" required />
          </div>

          {/* Mood Selector */}
          <JournalMoodSelector value={mood} onChange={(m) => updateDraft({ mood: m })} />

          {/* Highlight */}
          <div className="flex flex-col gap-1">
            <SystemLabel tone="muted">HIGHLIGHT</SystemLabel>
            <input type="text" value={highlight} onChange={e => updateDraft({ highlight: e.target.value })}
              placeholder="One sentence is enough — what was the single best thing today?"
              className="arcade-input text-sm" maxLength={120} required />
            <span className="text-[10px] text-right mt-0.5 font-mono" style={{ color: 'var(--bt-text-disabled)' }}>
              {120 - highlight.length} characters remaining
            </span>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <SystemLabel tone="muted">REFLECTION</SystemLabel>
            <textarea value={notes} onChange={e => updateDraft({ notes: e.target.value })}
              placeholder="Anything else worth remembering…"
              className="arcade-input min-h-[90px] resize-y" maxLength={1000} />
          </div>

          {/* Quote */}
          {currentQuote && (
            <p className="m-0 font-mono text-[10px] leading-relaxed italic" style={{ color: 'var(--bt-text-muted)' }}>
              "{currentQuote.quote}" — {currentQuote.author}
            </p>
          )}

          <button type="submit" disabled={!highlight.trim()} className="insert-coin self-start !text-xs">
            <PixelIcon name={highlight.trim() ? 'check' : 'pen'} size={14} className="mr-1" />
            {highlight.trim() ? 'Save entry' : 'Write a highlight to save'}
          </button>
        </GlassPane>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Consistency streak */}
          <GlassPane as="div" state="off" tone="aurora" paneTitle="CONSISTENCY" screenClassName="!p-4 text-center">
            <PixelIcon name="fire" size={28} color="var(--bt-streak)" className="mx-auto mb-2" />
            <p className="marquee-title m-0 text-2xl" style={{ color: 'var(--bt-streak)' }}>{journalStreak}</p>
            <SystemLabel tone="muted">{journalStreak === 1 ? 'day in a row' : 'days in a row'}</SystemLabel>
            <SystemLabel tone="muted" className="mt-2">{journal.length} {journal.length === 1 ? 'entry' : 'entries'} logged</SystemLabel>
          </GlassPane>

          {/* Mood trail */}
          <GlassPane as="div" state="off" tone="rose" paneTitle="MOOD TRAIL" screenClassName="!p-4">
            {moodDots.length === 0 ? (
              <SystemLabel tone="muted">No moods yet — entries paint the trail.</SystemLabel>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5" role="list" aria-label="Mood history, newest first">
                  {moodDots.map((dot, i) => (
                    <span key={dot.date} role="listitem" className="mood-dot"
                      style={{ background: dot.color, boxShadow: i === 0 ? `0 0 6px ${dot.color}` : 'none' }}
                      title={`${formatDate(dot.date)} — ${moodLabel[dot.mood] || dot.mood}`}
                      aria-label={`${formatDate(dot.date)} — ${moodLabel[dot.mood] || dot.mood}`} />
                  ))}
                </div>
                <SystemLabel tone="muted" className="mt-2">newest → oldest · last {moodDots.length}</SystemLabel>
              </>
            )}
          </GlassPane>

          {/* Search */}
          <GlassPane as="div" state="off" tone="cobalt" paneTitle="SEARCH DIARY" screenClassName="!p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--bt-text-disabled)' }} aria-hidden="true" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search memories…" className="arcade-input !pl-8" maxLength={120} aria-label="Search journal entries" />
            </div>
          </GlassPane>
        </div>
      </div>

      {/* Entries list */}
      <div className="flex flex-col gap-4">
        {filteredEntries.length === 0 ? (
          <section className="max-w-md mx-auto mt-4">
            <AsciiBox title={searchQuery ? 'NO MATCHES' : 'DAILY LOG EMPTY'} tone="default">
              <div className="flex flex-col items-center gap-3 py-2">
                <PixelIcon name="book" size={28} color="var(--bt-text-muted)" />
                <p className="m-0 text-sm text-center" style={{ color: 'var(--bt-text-dim)' }}>
                  {searchQuery
                    ? `Nothing found for "${searchQuery}" — try a different word.`
                    : 'Write one honest sentence about today. It earns +10 XP.'}
                </p>
              </div>
            </AsciiBox>
          </section>
        ) : (
          filteredEntries.map(entry => (
            <GlassPane as="article" key={entry.id} state="off" tone="rose"
              paneTitle={formatDate(entry.date)}
              titleRight={entry.mood ? <span className="font-mono text-base" aria-hidden="true">{entry.mood}</span> : undefined}
              screenClassName="!p-4">
              <p className="journal-entry-copy m-0 text-sm font-bold" style={{ color: 'var(--bt-text)' }}>{entry.highlight}</p>
              {entry.notes && (
                <p className="journal-entry-copy m-0 mt-2 text-[0.8rem] leading-relaxed" style={{ color: 'var(--bt-text-muted)' }}>{entry.notes}</p>
              )}
            </GlassPane>
          ))
        )}
      </div>
    </div>
  );
};
