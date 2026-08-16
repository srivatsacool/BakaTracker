import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getTodayDateString, formatDate } from '../lib/utils';
import { PenTool, Search, Award } from 'lucide-react';
import type { JournalEntry } from '../types';

export const Journal: React.FC = () => {
  const { journal, saveJournalEntry, currentQuote, quotes } = useStore();

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
        <h2 className="text-2xl font-black">Daily Highlight Journal</h2>
        <p className="text-xs text-gray-500 font-mono">Capture memories in one sentence. Build discipline.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Log Form */}
        <form onSubmit={handleSubmit} className="neo-card p-5 bg-white flex flex-col gap-4 md:col-span-2">
          <h3 className="text-md font-black border-b border-black pb-2 flex items-center gap-2">
            <PenTool className="w-4.5 h-4.5 text-accent-pink" />
            <span>Today's Reflection</span>
          </h3>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold font-mono">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="neo-input font-mono text-sm py-1.5"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold font-mono">
              Highlight of the Day <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={highlight}
              onChange={e => setHighlight(e.target.value)}
              placeholder="What was the single best thing that happened today?"
              className="neo-input text-sm"
              maxLength={120}
              required
            />
            <span className="text-[10px] text-gray-400 text-right mt-0.5">
              {120 - highlight.length} characters remaining
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold font-mono">How do you feel?</label>
            <div className="flex gap-4 mt-1">
              {(['😞', '😐', '🙂'] as const).map(emoji => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setMood(emoji)}
                  className={`text-2xl p-2 rounded-lg border-2 border-black transition ${
                    mood === emoji ? 'bg-accent-pink shadow-gumroad-sm translate-x-[-1px] translate-y-[-1px]' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold font-mono">Extra Thoughts (Optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Write anything else you want to remember..."
              className="neo-input h-20 resize-none text-sm"
            />
          </div>

          {/* Connected Quote Preview */}
          {date === getTodayDateString() && currentQuote && (
            <div className="bg-bg-primary p-3 rounded-lg border border-black/10 text-xs font-mono">
              <span className="text-[10px] text-gray-500 uppercase font-black block mb-1">Attached Daily Quote</span>
              <span className="italic">"{currentQuote.quote}"</span> — {currentQuote.author}
            </div>
          )}

          <button type="submit" className="neo-button bg-accent-pink w-full mt-2">
            Save Entry (+10 XP)
          </button>
        </form>

        {/* Stats Column */}
        <div className="flex flex-col gap-4">
          <div className="neo-card p-5 bg-white text-center flex flex-col justify-center items-center">
            <Award className="w-10 h-10 text-warning mb-2" />
            <h4 className="font-black text-md">Consistency Benefit</h4>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Writing down a daily highlight helps combat forgetfulness and Productivity Guilt. It serves as your permanent proof of growth.
            </p>
          </div>

          <div className="neo-card p-5 bg-accent-pink/5 text-center">
            <span className="text-3xl font-black font-mono block">{journal.length}</span>
            <span className="text-xs font-bold font-mono text-gray-500 uppercase mt-1 block">Total Entries</span>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <section className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-black pb-2 mb-2">
          <h3 className="text-lg font-black">Memory Timeline</h3>
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="neo-input pl-9 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm font-mono border-2 border-dashed border-gray-200 rounded-lg bg-white">
            No memories logged yet
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredEntries.map(entry => {
              const quote = quotes.find(q => q.id === entry.quote_id);
              const quoteText = quote ? quote.quote : entry.quote_text;
              const quoteAuthor = quote ? quote.author : entry.quote_author;
              return (
                <div key={entry.id || entry.date} className="neo-card p-5 bg-white flex flex-col md:flex-row justify-between gap-4 relative">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" title={`Mood: ${entry.mood}`}>{entry.mood || '😐'}</span>
                    <span className="text-xs font-black font-mono text-gray-500 bg-bg-primary border border-black/10 px-2 py-0.5 rounded">
                      {formatDate(entry.date)}
                    </span>
                  </div>
                  <h4 className="font-black text-md text-black leading-snug">
                    {entry.highlight}
                  </h4>
                  {entry.notes && (
                    <p className="text-xs text-gray-600 bg-bg-primary/50 p-2.5 rounded border border-black/5 whitespace-pre-wrap leading-relaxed">
                      {entry.notes}
                    </p>
                  )}
                </div>

                {/* Stored Quote */}
                {quoteText && (
                  <div className="md:w-64 bg-bg-primary p-3 rounded-lg border-2 border-black/10 shrink-0 font-mono text-[10px] leading-relaxed flex flex-col justify-center">
                    <span className="text-[8px] text-gray-500 uppercase font-black mb-1">Quote of the Day</span>
                    <span className="italic">"{quoteText}"</span>
                    <span className="text-right mt-1 font-bold">— {quoteAuthor}</span>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
