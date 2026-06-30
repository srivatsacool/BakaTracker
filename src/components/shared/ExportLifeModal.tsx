import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { calculateHabitStreak } from '../../services/habits/calculateHabitStreak';
import { Copy, Check, Printer, X, Sparkles } from 'lucide-react';

interface ExportLifeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4 animate-fade-in max-sm:items-end p-0 sm:p-4">
      <div className="neo-card p-6 bg-white dark:bg-surface max-w-lg w-full flex flex-col gap-4 text-text-primary max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:max-h-[90vh] max-sm:overflow-y-auto border-2 border-black dark:border-white shadow-gumroad-lg">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-black dark:border-white pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-pink" />
            <h3 className="font-black text-lg tracking-tight">Export Your Life Report</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition border border-transparent hover:border-black cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2 bg-bg-primary dark:bg-black/20 p-1.5 rounded-lg border-2 border-black dark:border-white font-mono text-xs">
          {(['week', 'month', 'all'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`flex-1 py-1.5 rounded font-black uppercase transition cursor-pointer ${
                timeframe === tf ? 'bg-accent-pink text-black shadow-gumroad-sm' : 'hover:bg-white/50 text-gray-600 dark:text-gray-400'
              }`}
            >
              {tf === 'week' ? 'Weekly' : tf === 'month' ? 'Monthly' : 'All Time'}
            </button>
          ))}
        </div>

        {/* Report Preview Box */}
        <div className="neo-card p-4 bg-bg-primary dark:bg-black/35 font-mono text-xs leading-relaxed overflow-x-auto border-2 border-black dark:border-white whitespace-pre-wrap select-all">
          {reportText}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mt-2">
          <button
            onClick={handlePrint}
            className="neo-button bg-white text-black border-black hover:bg-gray-100 py-2.5 flex-1 inline-flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>

          <button
            onClick={handleCopy}
            className={`neo-button py-2.5 flex-1 inline-flex items-center justify-center gap-2 ${
              copied ? 'bg-success text-white' : 'bg-accent-pink text-black'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Markdown Report'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
