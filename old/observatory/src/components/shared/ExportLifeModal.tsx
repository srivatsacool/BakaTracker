import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { calculateHabitStreak } from '../../services/habits/calculateHabitStreak';
import { Copy, Check, Printer, X, Sparkles } from 'lucide-react';

interface ExportLifeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ExportLifeModal — the save-file printer. Generates a plain-text
 * life report for the selected timeframe and copies or prints it.
 */
export const ExportLifeModal: React.FC<ExportLifeModalProps> = ({ isOpen, onClose }) => {
  const { habits, habitLogs, stats, events, currentQuote } = useStore();
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Compute stats for selected timeframe
  const getFilteredEvents = () => {
    const now = new Date();
    if (timeframe === 'week') {
      const d = new Date();
      d.setDate(now.getDate() - 7);
      return events.filter(e => new Date(e.timestamp) >= d);
    } else if (timeframe === 'month') {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      return events.filter(e => new Date(e.timestamp) >= d);
    }
    return events;
  };

  const filteredEvents = getFilteredEvents();

  // Total XP gained in timeframe
  const xpGained = filteredEvents.reduce((acc, e) => acc + e.xp, 0);

  // Stat Breakdown
  const statXP: Record<string, number> = {
    discipline: 0,
    health: 0,
    knowledge: 0,
    creativity: 0,
    career: 0
  };

  filteredEvents.forEach(e => {
    const stat = e.stat || 'general';
    if (stat in statXP) {
      statXP[stat] += e.xp;
    }
  });

  // Most Consistent Habit Streak
  let topHabit = habits[0]?.name || 'N/A';
  let topStreak = 0;
  habits.forEach(h => {
    const streak = calculateHabitStreak(h, habitLogs);
    if (streak > topStreak) {
      topStreak = streak;
      topHabit = h.name;
    }
  });

  // Completed tasks count
  const completedTasksCount = filteredEvents.filter(e => e.source === 'task' && e.type === 'task_completed').length;
  // Journal entries count
  const journalEntriesCount = filteredEvents.filter(e => e.source === 'journal').length;
  // Habit logs count
  const habitLogsCount = filteredEvents.filter(e => e.source === 'habit').length;

  const periodLabel = timeframe === 'week' ? 'Past 7 Days' : timeframe === 'month' ? 'Past 30 Days' : 'All Time';

  const reportText = `==================================================
BAKATRACKER LIFE REPORT
Period: ${periodLabel}
Level: LVL ${stats.level} (+${xpGained} XP in this period)
==================================================

STAT GROWTH:
💪 Health: +${statXP.health} XP
⚔️ Discipline: +${statXP.discipline} XP
🧠 Knowledge: +${statXP.knowledge} XP
🎨 Creativity: +${statXP.creativity} XP
💼 Career: +${statXP.career} XP

HIGHLIGHTS:
✓ Trackers Logged: ${habitLogsCount} sessions
✓ Quests Cleared: ${completedTasksCount} tasks
✓ Daily Reflections: ${journalEntriesCount} entries

MOST CONSISTENT HABIT:
🔥 ${topHabit} (${topStreak} days streak)

FAVORITE QUOTE:
"${currentQuote ? currentQuote.quote : 'Consistency beats intensity.'}"
— ${currentQuote ? currentQuote.author : 'BakaTracker Philosophy'}
==================================================`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in max-sm:items-end sm:p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="cabinet cabinet--playing max-w-lg w-full flex flex-col gap-4 p-6 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:max-h-[90vh] max-sm:overflow-y-auto" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>

        {/* Header */}
        <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid rgba(242,242,242,0.1)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
            <h3 className="marquee-title text-lg m-0" style={{ color: 'var(--arcade-paper)' }}>Export Your Life Report</h3>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close export modal">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Timeframe selector */}
        <div className="flex gap-2" role="group" aria-label="Report timeframe">
          {(['week', 'month', 'all'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeframe(t)}
              className={`chip cursor-pointer flex-1 justify-center !py-2 ${timeframe === t ? 'chip--gold' : ''}`}
              aria-pressed={timeframe === t}
            >
              {t === 'week' ? 'Past 7 days' : t === 'month' ? 'Past 30 days' : 'All time'}
            </button>
          ))}
        </div>

        {/* Report preview */}
        <pre
          className="rounded-lg p-4 text-[10px] leading-relaxed font-mono whitespace-pre-wrap max-h-[40vh] overflow-y-auto m-0"
          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(242,242,242,0.1)', color: 'var(--arcade-paper-dim)' }}
        >
          {reportText}
        </pre>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={handleCopy} className="insert-coin flex-1 justify-center !text-xs">
            {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            {copied ? 'Copied!' : 'Copy report'}
          </button>
          <button onClick={handlePrint} className="btn-ghost !text-xs">
            <Printer className="w-4 h-4" aria-hidden="true" /> Print
          </button>
        </div>
      </div>
    </div>
  );
};
