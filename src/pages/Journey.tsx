import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { isHabitCompleted } from '../lib/utils';
import { calculateHabitStreak } from '../services/habits/calculateHabitStreak';
import { calculateDailyScore } from '../services/stats/calculateDailyScore';
import { generateInsights } from '../services/stats/generateInsights';
import { Calendar, Flame, Lightbulb, TrendingUp, CheckCircle, Moon, BarChart2, BookOpen, Award, Clock, FileText } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ExportLifeModal } from '../components/shared/ExportLifeModal';

// Custom Neo-brutalist Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="neo-card p-3 bg-white dark:bg-surface text-black dark:text-text-primary font-mono text-xs border-2 border-black dark:border-white shadow-gumroad-sm">
        <p className="font-bold border-b border-black/10 dark:border-white/10 pb-1 mb-1">{label}</p>
        {payload.map((pld: any) => (
          <p key={pld.name} className="flex justify-between gap-4">
            <span style={{ color: pld.color || pld.stroke }} className="font-semibold">{pld.name}:</span>
            <span className="font-black">{pld.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const Journey: React.FC = () => {
  const { habits, habitLogs, tasks, journal, stats, settings, theme, events } = useStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const activeAccent = theme === 'dark' 
    ? (settings.accent_color_dark || '#FF90E8') 
    : (settings.accent_color_light || '#FF90E8');

  const statConfig = [
    { name: 'Discipline', icon: '⚔️', value: stats.discipline, color: 'bg-indigo-500', barColor: '#6366F1' },
    { name: 'Health', icon: '💪', value: stats.health, color: 'bg-success', barColor: '#22C55E' },
    { name: 'Knowledge', icon: '🧠', value: stats.knowledge, color: 'bg-blue-500', barColor: '#3B82F6' },
    { name: 'Creativity', icon: '🎨', value: stats.creativity, color: 'bg-accent-pink', barColor: 'var(--accent-pink)' },
    { name: 'Career', icon: '💼', value: stats.career, color: 'bg-warning', barColor: '#F59E0B' }
  ];

  // 1. Heatmap Generation
  // Generate the last 15 weeks (105 days)
  const generateHeatmapData = () => {
    const data = [];
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 105);
    
    // Adjust start date to the nearest Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const currentDate = new Date(startDate);
    const endLimit = new Date(today);
    // Align end limit to Saturday
    endLimit.setDate(endLimit.getDate() + (6 - endLimit.getDay()));

    while (currentDate <= endLimit) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const score = calculateDailyScore(dateStr, habits, habitLogs, tasks, journal);
      data.push({
        date: dateStr,
        score,
        dayNum: currentDate.getDate(),
        dayOfWeek: currentDate.getDay() // 0 = Sun, 6 = Sat
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return data;
  };

  const heatmapDays = generateHeatmapData();
  
  // Group days into columns (weeks)
  const heatmapWeeks: any[][] = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    heatmapWeeks.push(heatmapDays.slice(i, i + 7));
  }

  // Calculate Month Labels and their column spans
  const getMonthLabels = () => {
    const labels: { text: string; colSpan: number }[] = [];
    let currentMonth = '';
    let currentSpan = 0;

    heatmapWeeks.forEach((week) => {
      const firstDayOfWeek = new Date(week[0].date);
      const monthName = firstDayOfWeek.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthName !== currentMonth) {
        if (currentSpan > 0) {
          labels[labels.length - 1].colSpan = currentSpan;
        }
        labels.push({ text: monthName, colSpan: 1 });
        currentMonth = monthName;
        currentSpan = 1;
      } else {
        currentSpan++;
      }
    });
    
    if (labels.length > 0) {
      labels[labels.length - 1].colSpan = currentSpan;
    }
    
    return labels;
  };

  const monthLabels = getMonthLabels();

  const getHeatmapColor = (score: number) => {
    if (score === 0) return 'bg-white dark:bg-surface border-black/5 dark:border-white/5';
    if (score < 30) return 'bg-accent-pink/20 dark:bg-accent-pink/10 text-black/40';
    if (score < 60) return 'bg-accent-pink/50 dark:bg-accent-pink/30 text-black/60';
    if (score < 85) return 'bg-accent-pink/80 dark:bg-accent-pink/60 text-white';
    return 'bg-accent-pink text-white';
  };

  // 2. Trend Charts Data (Last 7 Days)
  const generateChartsData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const label = d.toLocaleDateString('en-US', { weekday: 'short' });

      const activeHabits = habits.filter(h => h.active);
      let habitCompletion = 0;
      if (activeHabits.length > 0) {
        const logs = habitLogs.filter(l => l.date === dateStr);
        let completed = 0;
        activeHabits.forEach(h => {
          const log = logs.find(l => l.habit_id === h.id);
          if (isHabitCompleted(h, log)) {
            completed++;
          }
        });
        habitCompletion = Math.round((completed / activeHabits.length) * 100);
      }

      const sleepLog = habitLogs.find(l => l.date === dateStr && l.habit_id === 'h4');
      const sleepHours = sleepLog ? Number(sleepLog.value) || 0 : 0;

      const screenLog = habitLogs.find(l => l.date === dateStr && l.habit_id === 'h6');
      const screenTime = screenLog ? Number(screenLog.value) || 0 : 0;

      const moodLog = habitLogs.find(l => l.date === dateStr && l.habit_id === 'h5');
      let moodVal = 0;
      if (moodLog?.value === '🙂') moodVal = 3;
      else if (moodLog?.value === '😐') moodVal = 2;
      else if (moodLog?.value === '😞') moodVal = 1;

      data.push({
        name: label,
        date: dateStr,
        habits: habitCompletion,
        sleep: sleepHours,
        screen: screenTime,
        mood: moodVal
      });
    }
    return data;
  };

  const chartData = generateChartsData();

  const insightsList = generateInsights(habitLogs, tasks);

  // Get details for selected heatmap cell
  const getSelectedDayDetails = () => {
    if (!selectedDate) return null;
    
    const logs = habitLogs.filter(l => l.date === selectedDate);
    const journalEntry = journal.find(j => j.date === selectedDate);
    const completedTasks = tasks.filter(t => t.status === 'done' && t.completed_at && t.completed_at.startsWith(selectedDate));
    const dayScore = calculateDailyScore(selectedDate, habits, habitLogs, tasks, journal);

    return {
      date: selectedDate,
      logs,
      journalEntry,
      completedTasks,
      score: dayScore
    };
  };

  const dayDetails = getSelectedDayDetails();

  // --- WEEKLY RECAP GENERATION ---
  const getWeeklyRecap = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyEvents = events.filter(e => new Date(e.timestamp) >= sevenDaysAgo);
    
    // 1. Calculate XP by Stat
    const xpByStat = {
      discipline: 0,
      health: 0,
      knowledge: 0,
      creativity: 0,
      career: 0,
      general: 0
    };
    
    let totalWeeklyXP = 0;
    weeklyEvents.forEach(e => {
      const stat = e.stat || 'general';
      if (stat in xpByStat) {
        xpByStat[stat as keyof typeof xpByStat] += e.xp;
      } else {
        xpByStat.general += e.xp;
      }
      totalWeeklyXP += e.xp;
    });

    // 2. Generate Wins
    const wins: string[] = [];

    // Habit Completions
    const habitCounts: Record<string, { count: number; icon: string; totalVal: number; type: string }> = {};
    weeklyEvents.filter(e => e.source === 'habit').forEach(e => {
      const habit = habits.find(h => h.id === e.entity_id);
      const icon = habit ? habit.icon : '🎯';
      const type = habit ? habit.type : 'checkbox';
      let val = 1;
      if (e.metadata) {
        try {
          const m = JSON.parse(e.metadata);
          if (typeof m.value === 'number') val = m.value;
        } catch {}
      }

      if (!habitCounts[e.entity]) {
        habitCounts[e.entity] = { count: 0, icon, totalVal: 0, type };
      }
      habitCounts[e.entity].count++;
      habitCounts[e.entity].totalVal += val;
    });

    Object.entries(habitCounts).forEach(([name, data]) => {
      if (data.type === 'counter' || data.type === 'numeric') {
        wins.push(`${data.icon} Logged ${data.totalVal} of "${name}"`);
      } else {
        wins.push(`${data.icon} "${name}" completed ${data.count} times`);
      }
    });

    // Task Completions
    const completedTasksCount = weeklyEvents.filter(e => e.source === 'task' && e.type === 'task_completed').length;
    if (completedTasksCount > 0) {
      wins.push(`⚔️ Finished ${completedTasksCount} Today Quests`);
    }

    // Journal Entry Creations
    const loggedReflections = weeklyEvents.filter(e => e.source === 'journal').length;
    if (loggedReflections > 0) {
      wins.push(`📖 Captured ${loggedReflections} daily reflections`);
    }

    // Streaks
    habits.forEach(h => {
      const streak = calculateHabitStreak(h, habitLogs);
      if (streak >= 3) {
        wins.push(`🔥 Active ${streak}-day streak on "${h.name}"`);
      }
    });

    return {
      totalWeeklyXP,
      xpByStat,
      wins: wins.slice(0, 5) // Show top 5 wins
    };
  };

  const weeklyRecap = getWeeklyRecap();

  // Timeline list (recent 8 events)
  const sortedRecentEvents = [...events]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'habit': return 'bg-success/15 border-success text-success';
      case 'task': return 'bg-indigo-500/15 border-indigo-500 text-indigo-500';
      case 'journal': return 'bg-accent-pink/15 border-accent-pink text-accent-pink';
      default: return 'bg-gray-100 dark:bg-black/35 border-black/15 text-gray-500';
    }
  };

  const getStatEmoji = (statName: string) => {
    switch (statName) {
      case 'discipline': return '⚔️';
      case 'health': return '💪';
      case 'knowledge': return '🧠';
      case 'creativity': return '🎨';
      case 'career': return '💼';
      default: return '✨';
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-text-primary">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Your Journey</h2>
          <p className="text-xs text-gray-500 font-mono">Character sheet progress, timelines, and consistency trends.</p>
        </div>

        <button
          onClick={() => setShowExportModal(true)}
          className="neo-button bg-accent-pink text-black text-xs font-mono font-bold py-2 px-4 flex items-center gap-2 shadow-gumroad-sm cursor-pointer active:scale-95 transition"
        >
          <FileText className="w-4 h-4" />
          <span>Export Your Life Report</span>
        </button>
      </div>

      {/* Character Sheet Overview Section */}
      <section className="neo-card p-6 bg-white dark:bg-surface text-text-primary">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-black dark:border-white pb-4 mb-4 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-accent-pink/15 border-2 border-black dark:border-white rounded-lg flex items-center justify-center text-4xl shadow-gumroad-sm shrink-0">
              👤
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">Active Character</span>
                <span className="text-[9px] font-black font-mono bg-accent-pink text-black px-2 py-0.5 rounded border border-black uppercase shadow-gumroad-sm">
                  {stats.level <= 3 ? 'Novice Adventurer' : stats.level <= 7 ? 'Apprentice Builder' : stats.level <= 12 ? 'Iron Strategist' : stats.level <= 20 ? 'Master Architect' : 'Grandmaster Legend'}
                </span>
              </div>
              <h3 className="font-black text-2xl leading-none mt-1">Level {stats.level}</h3>
              <p className="text-xs font-mono text-gray-500 mt-1.5 font-bold">
                Experience Pool: {stats.xp} / {settings.xp_per_level} XP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Level progress bar */}
            <div className="w-full md:w-64 bg-bg-primary dark:bg-black/35 h-4 rounded-full border-2 border-black dark:border-white overflow-hidden relative shadow-gumroad-sm">
              <div 
                className="bg-accent-pink h-full transition-all duration-300"
                style={{ width: `${(stats.xp / settings.xp_per_level) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Core Attributes */}
        <div id="journey-stat-bars" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mt-2">
          {statConfig.map(stat => {
            const statLvl = Math.floor(stat.value / 100) + 1;
            const progress = stat.value % 100;
            return (
              <div key={stat.name} className="p-3 bg-bg-primary dark:bg-black/10 rounded-lg border-2 border-black dark:border-white shadow-gumroad-sm flex flex-col gap-1.5">
                <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-0.5">
                  <span className="font-black text-xs flex items-center gap-1 text-black dark:text-white">
                    <span>{stat.icon}</span>
                    <span className="truncate max-w-[90px]">{stat.name}</span>
                  </span>
                  <span className="text-[9px] font-mono font-black bg-black text-white px-1 py-0.2 rounded border border-black shadow-gumroad-sm">
                    Lvl {statLvl}
                  </span>
                </div>
                {/* Visual HUD bar */}
                <div className="w-full bg-white dark:bg-black/35 h-2 rounded-full border border-black overflow-hidden relative">
                  <div 
                    className={`${stat.color} h-full transition-all duration-300`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono font-bold text-gray-500 text-right">
                  {progress} / 100 XP
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly Recap & Wins Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Weekly Growth Stats (2 cols) */}
        <div className="neo-card p-5 bg-white dark:bg-surface md:col-span-2 flex flex-col gap-4 text-text-primary">
          <div className="border-b-2 border-black dark:border-white pb-2 flex justify-between items-center">
            <h3 className="text-md font-black uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-accent-pink" />
              <span>Weekly Growth Recap</span>
            </h3>
            <span className="text-xs font-mono font-black bg-black text-white px-2 py-0.5 rounded border border-black shadow-gumroad-sm">
              +{weeklyRecap.totalWeeklyXP} XP
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(weeklyRecap.xpByStat).map(([stat, val]) => {
              if (stat === 'general' && val === 0) return null;
              return (
                <div key={stat} className="p-3 bg-bg-primary dark:bg-black/10 rounded-lg border-2 border-black dark:border-white shadow-gumroad-sm text-center flex flex-col items-center justify-center">
                  <span className="text-xl leading-none">{getStatEmoji(stat)}</span>
                  <span className="text-[10px] font-black font-mono text-gray-500 uppercase mt-1 truncate max-w-full">{stat}</span>
                  <span className="text-md font-black font-mono mt-1 text-success">+{val} XP</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Wins Checklist (1 col) */}
        <div className="neo-card p-5 bg-white dark:bg-surface flex flex-col gap-3 text-text-primary">
          <h3 className="text-md font-black uppercase tracking-wider border-b-2 border-black dark:border-white pb-2 flex items-center gap-2">
            <Award className="w-4.5 h-4.5 text-warning" />
            <span>Weekly Wins</span>
          </h3>

          <div className="flex flex-col gap-2 flex-1 justify-center">
            {weeklyRecap.wins.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6">No accomplishments logged in the last 7 days. Start checking off quests!</p>
            ) : (
              weeklyRecap.wins.map((win, idx) => (
                <div key={idx} className="p-2 border-2 border-black dark:border-white/20 bg-bg-primary dark:bg-black/10 rounded-lg flex items-start gap-2 text-xs font-bold text-black dark:text-white shadow-gumroad-sm">
                  <span className="text-success shrink-0">✓</span>
                  <p className="leading-tight break-words">{win}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* GitHub Heatmap Grid */}
      <section id="journey-heatmap" className="neo-card p-5 bg-white dark:bg-surface text-text-primary">
        <h3 className="text-md font-black uppercase tracking-wider border-b-2 border-black dark:border-white pb-2 mb-4 flex items-center gap-2">
          <Calendar className="w-4.5 h-4.5 text-accent-pink" />
          <span>Consistency Heatmap</span>
        </h3>
        
        <div className="flex flex-col gap-2 items-center">
          <div className="overflow-x-auto w-full no-scrollbar pb-2">
            <div className="flex flex-col gap-1.5 min-w-[500px]">
              {/* Month Labels */}
              <div className="flex gap-[3px] pl-6 select-none">
                {monthLabels.map((lbl, idx) => {
                  const colWidth = lbl.colSpan * 17;
                  return (
                    <span 
                      key={idx} 
                      className="text-[9px] font-mono font-bold text-gray-400"
                      style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                    >
                      {lbl.text}
                    </span>
                  );
                })}
              </div>

              <div className="flex gap-[3px]">
                {/* Day headers */}
                <div className="flex flex-col justify-between text-[8px] font-mono font-bold pr-2 py-0.5 select-none h-[116px] text-gray-400">
                  <span>Su</span>
                  <span>Tu</span>
                  <span>Th</span>
                  <span>Sa</span>
                </div>

                {/* Weeks Grid */}
                {heatmapWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3px]">
                    {week.map((day) => {
                      const isSelected = selectedDate === day.date;
                      return (
                        <button
                          key={day.date}
                          onClick={() => setSelectedDate(isSelected ? null : day.date)}
                          title={`${day.date} - Score: ${day.score}%`}
                          className={`w-3.5 h-3.5 border rounded-[3px] cursor-pointer transition-all duration-150 ${getHeatmapColor(day.score)} ${
                            isSelected ? 'ring-2 ring-black dark:ring-white scale-110' : 'hover:scale-105'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end text-[10px] font-mono font-bold text-gray-400 mt-1">
            <span>Less</span>
            <div className="w-3 h-3 bg-white dark:bg-surface border border-black/5 dark:border-white/5 rounded-[2px]" />
            <div className="w-3 h-3 bg-accent-pink/20 rounded-[2px]" />
            <div className="w-3 h-3 bg-accent-pink/50 rounded-[2px]" />
            <div className="w-3 h-3 bg-accent-pink/80 rounded-[2px]" />
            <div className="w-3 h-3 bg-accent-pink rounded-[2px]" />
            <span>More</span>
          </div>
        </div>
      </section>

      {/* Selected Day Reflection card */}
      {dayDetails && (
        <section className="neo-card p-5 bg-white dark:bg-surface border-2 border-black dark:border-white animate-fade-in flex flex-col gap-4 text-text-primary">
          <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-2">
            <div>
              <h3 className="text-md font-black">
                Reflection & Achievements: {new Date(dayDetails.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              <span className="text-[10px] font-mono text-gray-500">History Log Viewer</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-gray-500">Day Score:</span>
              <span className={`text-xs font-black font-mono px-2 py-0.5 rounded border border-black ${
                dayDetails.score >= 80 ? 'bg-success text-white' : dayDetails.score >= 40 ? 'bg-warning text-black' : 'bg-danger text-white'
              }`}>
                {dayDetails.score}%
              </span>
              <button 
                onClick={() => setSelectedDate(null)}
                className="text-xs font-bold font-mono border border-black dark:border-white px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition shadow-gumroad-sm bg-white dark:bg-surface shrink-0 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-black font-mono text-gray-500 uppercase border-b border-black/5 dark:border-white/5 pb-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Trackers & Habits</span>
              </h4>
              {habits.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No trackers defined.</p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {habits.map(h => {
                    const log = dayDetails.logs.find(l => l.habit_id === h.id);
                    let valDisplay = '—';
                    let isDone = false;
                    
                    if (log) {
                      if (h.type === 'checkbox' && (log.value === 1 || log.value === '1' || (log.value as any) === true)) {
                        valDisplay = 'Completed';
                        isDone = true;
                      } else if (h.type === 'counter') {
                        valDisplay = `${log.value} count`;
                        isDone = Number(log.value) > 0;
                      } else if (h.type === 'numeric') {
                        valDisplay = `${log.value} ${h.id === 'h4' ? 'hours' : 'units'}`;
                        isDone = Number(log.value) > 0;
                      } else if (h.type === 'mood' || h.type === 'energy') {
                        valDisplay = String(log.value);
                        isDone = !!log.value;
                      }
                    }

                    return (
                      <div key={h.id} className="flex justify-between items-center text-xs p-1.5 bg-bg-primary dark:bg-black/20 rounded border border-black/5 dark:border-white/5 text-black dark:text-white">
                        <span className="font-bold">{h.icon} {h.name}</span>
                        <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${isDone ? 'bg-success/20 text-success' : 'bg-gray-100 dark:bg-black/45 text-gray-500 dark:text-gray-400'}`}>
                          {valDisplay}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-black font-mono text-gray-500 uppercase border-b border-black/5 dark:border-white/5 pb-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Goals Completed</span>
                </h4>
                {dayDetails.completedTasks.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No tasks completed on this day.</p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {dayDetails.completedTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-xs font-bold p-1.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded text-green-700 dark:text-green-400">
                        <span>✓</span>
                        <span className="truncate">{t.title}</span>
                        <span className="ml-auto text-[9px] font-mono bg-green-100 dark:bg-green-900 px-1 py-0.2 rounded">+{t.xp} XP</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-black font-mono text-gray-500 uppercase border-b border-black/5 dark:border-white/5 pb-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Journal Reflections</span>
                </h4>
                {dayDetails.journalEntry ? (
                  <div className="p-3 bg-accent-pink/5 border border-black/10 dark:border-white/10 rounded flex flex-col gap-2">
                    {dayDetails.journalEntry.mood && (
                      <div className="text-xs font-bold">
                        Mood rating: <span className="text-sm">{dayDetails.journalEntry.mood}</span>
                      </div>
                    )}
                    <div className="text-xs font-bold italic handdrawn-font text-black dark:text-white">
                      "{dayDetails.journalEntry.highlight}"
                    </div>
                    {dayDetails.journalEntry.notes && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 pl-2 border-l border-black/20 dark:border-white/20">
                        {dayDetails.journalEntry.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No reflections logged for this day.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Activity Timeline Section */}
      <section className="neo-card p-5 bg-white dark:bg-surface text-text-primary">
        <h3 className="text-md font-black uppercase tracking-wider border-b-2 border-black dark:border-white pb-2 mb-4 flex items-center gap-2">
          <Clock className="w-4.5 h-4.5 text-accent-pink" />
          <span>Activity Timeline</span>
        </h3>

        <div className="flex flex-col gap-4">
          {sortedRecentEvents.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-6">Your timeline is empty. Record some daily actions to write logs!</p>
          ) : (
            sortedRecentEvents.map((evt, idx) => (
              <div key={evt.id} className="flex gap-4 relative items-start">
                {/* Timeline connector line */}
                {idx !== sortedRecentEvents.length - 1 && (
                  <div className="absolute top-7 left-3.5 -bottom-5 w-[2px] bg-black/10 dark:bg-white/10" />
                )}
                
                {/* Icon Circle */}
                <div className="w-8 h-8 rounded-full border-2 border-black dark:border-white bg-bg-primary dark:bg-black/35 flex items-center justify-center shrink-0 shadow-gumroad-sm font-mono text-sm">
                  {getStatEmoji(evt.stat)}
                </div>

                {/* Event details block */}
                <div className="flex-1 p-3 bg-bg-primary dark:bg-black/10 border-2 border-black dark:border-white/20 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-gumroad-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded border border-black/10 dark:border-white/10 ${getSourceBadge(evt.source)}`}>
                        {evt.source.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-500">
                        {new Date(evt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-black mt-1 text-black dark:text-white">{evt.entity}</p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                    <span className="text-xs font-black font-mono text-success">+{evt.xp} XP</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recharts Trends */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 text-text-primary">
        {/* Habit Completion Chart */}
        <div className="neo-card p-4 bg-white dark:bg-surface flex flex-col gap-2 min-w-0">
          <h4 className="font-bold text-sm border-b border-black/5 dark:border-white/5 pb-1 flex items-center gap-1">
            <Flame className="w-4 h-4 text-accent-pink" />
            <span>Habit Completion Rate (%)</span>
          </h4>
          <div className="h-48 min-h-48 mt-2 rounded p-1 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:16px_16px] dark:bg-[linear-gradient(to_right,#3d3c38_1px,transparent_1px),linear-gradient(to_bottom,#3d3c38_1px,transparent_1px)]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-text-primary)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-text-primary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="habits" name="Habits %" stroke={activeAccent} strokeWidth={4} dot={{ stroke: '#000000', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sleep Hours Chart */}
        <div className="neo-card p-4 bg-white dark:bg-surface flex flex-col gap-2 min-w-0">
          <h4 className="font-bold text-sm border-b border-black/5 dark:border-white/5 pb-1 flex items-center gap-1">
            <Moon className="w-4 h-4 text-success" />
            <span>Sleep Hours</span>
          </h4>
          <div className="h-48 min-h-48 mt-2 rounded p-1 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:16px_16px] dark:bg-[linear-gradient(to_right,#3d3c38_1px,transparent_1px),linear-gradient(to_bottom,#3d3c38_1px,transparent_1px)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-text-primary)' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-text-primary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sleep" name="Sleep Hours" fill="#22C55E" stroke="#000000" strokeWidth={2} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mood Trend Chart */}
        <div className="neo-card p-4 bg-white dark:bg-surface flex flex-col gap-2 min-w-0">
          <h4 className="font-bold text-sm border-b border-black/5 dark:border-white/5 pb-1 flex items-center gap-1">
            <span>😊</span>
            <span>Mood Rating (1-3)</span>
          </h4>
          <div className="h-48 min-h-48 mt-2 rounded p-1 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:16px_16px] dark:bg-[linear-gradient(to_right,#3d3c38_1px,transparent_1px),linear-gradient(to_bottom,#3d3c38_1px,transparent_1px)]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-text-primary)' }} />
                <YAxis domain={[1, 3]} ticks={[1, 2, 3]} tickFormatter={(v) => v === 3 ? '🙂' : v === 2 ? '😐' : v === 1 ? '😞' : ''} tick={{ fontSize: 11, fill: 'var(--color-text-primary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="mood" name="Mood" stroke={activeAccent} strokeWidth={3} dot={{ r: 3, fill: activeAccent, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Screen Time Hours Chart */}
        <div className="neo-card p-4 bg-white dark:bg-surface flex flex-col gap-2">
          <h4 className="font-bold text-sm border-b border-black/5 dark:border-white/5 pb-1 flex items-center gap-1">
            <BarChart2 className="w-4 h-4 text-danger" />
            <span>Screen Time (hours)</span>
          </h4>
          <div className="h-48 mt-2 rounded p-1 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:16px_16px] dark:bg-[linear-gradient(to_right,#3d3c38_1px,transparent_1px),linear-gradient(to_bottom,#3d3c38_1px,transparent_1px)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-text-primary)' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--color-text-primary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="screen" name="Screen Hours" fill="#EF4444" stroke="#000000" strokeWidth={2} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Insights Widget */}
      <section className="neo-card p-5 bg-white dark:bg-surface text-text-primary">
        <h3 className="text-md font-black uppercase tracking-wider border-b-2 border-black dark:border-white pb-2 mb-4 flex items-center gap-2">
          <Lightbulb className="w-4.5 h-4.5 text-warning" />
          <span>Consistency Insights</span>
        </h3>
        
        <div className="flex flex-col gap-3">
          {insightsList.map((insight, idx) => (
            <div key={idx} className="p-3 bg-bg-primary dark:bg-black/10 rounded-lg border border-black/10 dark:border-white/10 flex items-start gap-2 text-xs leading-relaxed font-bold text-black dark:text-white shadow-gumroad-sm">
              <span className="text-amber-500">💡</span>
              <p>{insight}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Export Life Report Modal */}
      <ExportLifeModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />

    </div>
  );
};
