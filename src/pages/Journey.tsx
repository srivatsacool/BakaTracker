import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { isHabitCompleted } from '../lib/utils';
import { calculateHabitStreak, calculateBestStreak } from '../services/habits/calculateHabitStreak';
import { calculateDailyScore } from '../services/stats/calculateDailyScore';
import { generateInsights } from '../services/stats/generateInsights';
import { Flame, Lightbulb, CheckCircle, BookOpen, Award, FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ExportLifeModal } from '../components/shared/ExportLifeModal';
import { GlassPane } from '../components/ui';
import type { StatType } from '../types';

// F11 — per-series tool tones for the glass tooltip. Recharts hands bars a
// `url(#gradient)` fill, which is useless as a CSS color, so series that map
// to gradient fills resolve to their tone here (violet = primary, cobalt =
// the Journey instrument tone; both AA-safe on the dark tooltip glass).
const SERIES_TONES: Record<string, string> = {
  xp: 'var(--obs-aurora-bright)',
  habits: 'var(--obs-aurora)',
  tasks: 'var(--obs-cobalt)',
};

interface ChartTooltipItem {
  name?: string;
  value?: number | string;
  dataKey?: string | number;
  color?: string;
  stroke?: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipItem[];
  label?: string | number;
}

// Premium glass tooltip for Recharts (F11) — a small glass pane in the
// instrument grammar: hairline edge (tool-tone accent per series), blur,
// Fragment Mono readout, tabular values. No default recharts chrome.
const F11Tooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  const toneOf = (pld: ChartTooltipItem) => {
    const c = pld.color || pld.stroke;
    if (typeof c === 'string' && c.startsWith('url(')) {
      return SERIES_TONES[pld.dataKey as string] ?? 'var(--obs-aurora)';
    }
    return c || 'var(--obs-aurora)';
  };
  return (
    <div
      className="f11-chart-tooltip"
      style={{ '--tt': toneOf(payload[0]) } as React.CSSProperties}
    >
      {label != null && <p className="f11-chart-tooltip-label">{label}</p>}
      {payload.map((pld: ChartTooltipItem) => (
        <div key={pld.dataKey ?? pld.name} className="f11-chart-tooltip-row">
          <span className="f11-chart-tooltip-dot" style={{ background: toneOf(pld) }} aria-hidden="true" />
          <span className="f11-chart-tooltip-name">{pld.name}</span>
          <span className="f11-chart-tooltip-value">{pld.value}</span>
        </div>
      ))}
    </div>
  );
};

// F11 — stable-identity chart props. Recharts 3.x diffing churns (and can loop
// into 'Maximum update depth exceeded') when tooltip content / cursor / dot /
// activeDot get NEW object identities every render — hoist them once.
const XP_TOOLTIP = <F11Tooltip />;
const ACTIVITY_TOOLTIP = <F11Tooltip />;
const XP_CURSOR = { stroke: 'rgba(167,139,250,0.35)', strokeWidth: 1, strokeDasharray: '3 4' };
const ACTIVITY_CURSOR = { fill: 'rgba(139,92,246,0.08)' };

/**
 * Journey — the high-score wall. Heatmap, XP over time, streaks,
 * character stats, weekly recap, and insights. Read mode.
 */
export const Journey: React.FC = () => {
  const { habits, habitLogs, tasks, journal, stats, events, character, weeklyStats } = useStore(useShallow(s => ({
    habits: s.habits,
    habitLogs: s.habitLogs,
    tasks: s.tasks,
    journal: s.journal,
    stats: s.stats,
    events: s.events,
    character: s.character,
    weeklyStats: s.weeklyStats,
  })));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Character title — compiled by the store (`getCharacterTitle`) but never
  // rendered anywhere until now. character[0] is the current record.
  const characterTitle = character[0]?.title ?? 'Novice Adventurer';

  const statMeta: Record<StatType, { icon: string; barColor: string }> = {
    discipline: { icon: '⚔️', barColor: 'var(--arcade-magenta)' },
    health: { icon: '💪', barColor: 'var(--arcade-green)' },
    knowledge: { icon: '🧠', barColor: 'var(--arcade-cobalt)' },
    creativity: { icon: '🎨', barColor: 'var(--arcade-red)' },
    career: { icon: '💼', barColor: 'var(--arcade-gold)' }
  };

  const statConfig = (Object.keys(statMeta) as StatType[]).map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    key: s,
    icon: statMeta[s].icon,
    value: stats[s],
    barColor: statMeta[s].barColor
  }));

  // 1. Heatmap Generation — last 15 weeks (105 days), github-style
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
  const heatmapWeeks: typeof heatmapDays[] = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    heatmapWeeks.push(heatmapDays.slice(i, i + 7));
  }

  // F11 — the heatmap now reads in the violet scale of the world (aurora
  // 0.28 → 0.55 → 0.92 over the faint paper track): calm, never neon.
  const getHeatmapColor = (score: number) => {
    if (score >= 80) return 'rgba(139, 92, 246, 0.92)';
    if (score >= 40) return 'rgba(139, 92, 246, 0.55)';
    if (score > 0) return 'rgba(139, 92, 246, 0.28)';
    return 'rgba(233, 230, 242, 0.06)';
  };

  // 2. Habit streaks — current + best-ever, ranked for the leaderboard
  const activeHabits = habits.filter(h => h.active);
  const rankedStreaks = activeHabits
    .map(h => ({
      habit: h,
      streak: calculateHabitStreak(h, habitLogs),
      best: calculateBestStreak(h, habitLogs)
    }))
    .sort((a, b) => b.best - a.best || b.streak - a.streak);

  // 4. Weekly recap — this week's totals
  const getWeeklyRecap = () => {
    const now = new Date();
    const weekStart = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

    const weekEvents = events.filter(e => (e.timestamp || '').slice(0, 10) >= weekStartStr);
    const weekXP = weekEvents.reduce((acc, e) => acc + (e.xp || 0), 0);
    const weekHabits = weekEvents.filter(e => e.type === 'habit_completed').length;
    const weekTasks = weekEvents.filter(e => e.type === 'task_completed').length;

    return { weekXP, weekHabits, weekTasks };
  };

  const weeklyRecap = getWeeklyRecap();

  // Attribute deltas — from the weeklyStats records already compiled in the
  // store (ascending by week_start). Latest = this week; delta vs last week.
  const attributeDeltas = (() => {
    const recs = weeklyStats;
    const latest = recs[recs.length - 1];
    if (!latest) return null;
    const prev = recs[recs.length - 2];
    return (Object.keys(statMeta) as StatType[]).map(s => ({
      stat: s,
      thisWeek: latest[s] || 0,
      lastWeek: prev ? prev[s] || 0 : null
    }));
  })();

  // 5. Insights
  const insights = generateInsights(habitLogs, tasks, habits);

  // 6. Chart data — XP over the last 14 days
  const chartData = (() => {
    const data = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayEvents = events.filter(e => (e.timestamp || '').slice(0, 10) === dateStr);
      const xp = dayEvents.reduce((acc, e) => acc + (e.xp || 0), 0);
      data.push({
        date: dateStr.slice(5),
        xp,
        habits: dayEvents.filter(e => e.type === 'habit_completed').length,
        tasks: dayEvents.filter(e => e.type === 'task_completed').length,
      });
    }
    return data;
  })();

  // 7. Day details for selected date
  const getSelectedDayDetails = () => {
    if (!selectedDate) return null;
    const dayHabits = activeHabits.map(h => ({
      habit: h,
      done: isHabitCompleted(h, habitLogs.find(l => l.habit_id === h.id && l.date === selectedDate))
    }));
    const dayTasks = tasks.filter(t => t.status === 'done' && (t.completed_at || '').slice(0, 10) === selectedDate);
    const dayJournal = journal.find(j => j.date === selectedDate);
    const dayScore = calculateDailyScore(selectedDate, habits, habitLogs, tasks, journal);
    return { dayHabits, dayTasks, dayJournal, dayScore };
  };

  const dayDetails = getSelectedDayDetails();

  const getSourceBadge = (source: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      habit: { label: 'Habit', cls: 'chip--green' },
      task: { label: 'Task', cls: 'chip--cobalt' },
      journal: { label: 'Journal', cls: 'chip--magenta' },
      system: { label: 'System', cls: 'chip--gold' },
    };
    const m = map[source] || { label: source, cls: '' };
    return <span className={`chip ${m.cls}`}>{m.label}</span>;
  };

  const getStatEmoji = (stat: string) => {
    const map: Record<string, string> = {
      discipline: '⚔️',
      health: '💪',
      knowledge: '🧠',
      creativity: '🎨',
      career: '💼',
      general: '⭐',
    };
    return map[stat] || '⭐';
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="marquee-title text-2xl m-0" style={{ color: 'var(--arcade-paper)' }}>Journey Analytics</h2>
          <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Your life as a high-score wall.</p>
          <p className="font-mono text-[10px] mt-2 m-0 score-readout" style={{ color: 'var(--arcade-gold)' }}>
            LVL {stats.level} · {characterTitle}
          </p>
        </div>
        <button onClick={() => setShowExportModal(true)} className="btn-ghost !text-xs">
          <FileText className="w-4 h-4" aria-hidden="true" /> Export life
        </button>
      </div>

      {/* Stat overview — the character panel */}
      <GlassPane id="journey-stat-bars" state="off" tone="cobalt" paneTitle="Character stats"
        titleRight={<span className="font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-gold)' }}>LVL {stats.level} · {stats.xp} XP</span>}
        screenClassName="!p-4 grid grid-cols-1 sm:grid-cols-5 gap-4">
          {statConfig.map(stat => (
            <div key={stat.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold" style={{ color: 'var(--arcade-paper-dim)' }}>{stat.icon} {stat.name}</span>
                <span className="font-mono text-[10px] score-readout" style={{ color: stat.barColor }}>{stat.value}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(233,230,242,0.06)', border: '1px solid rgba(233,230,242,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (stat.value / 200) * 100)}%`, background: stat.barColor, boxShadow: `0 0 8px ${stat.barColor}` }} />
              </div>
            </div>
          ))}

        {/* Attribute deltas — this week's XP per stat, derived from weeklyStats */}
        {attributeDeltas && (
          <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--obs-glass-7)' }}>
            <p className="m-0 mb-2 font-mono text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--arcade-paper-muted)' }}>
              Attribute XP — this week
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {attributeDeltas.map(({ stat, thisWeek, lastWeek }) => {
                const meta = statMeta[stat];
                const delta = lastWeek !== null ? thisWeek - lastWeek : null;
                return (
                  <div key={stat} className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] shrink-0" aria-hidden="true">{meta.icon}</span>
                    <span className="font-mono text-[10px] score-readout" style={{ color: thisWeek > 0 ? meta.barColor : 'var(--arcade-paper-disabled)' }}>
                      +{thisWeek}
                    </span>
                    {delta !== null && (thisWeek > 0 || (lastWeek ?? 0) > 0) && (
                      <span
                        className="font-mono text-[9px] shrink-0"
                        style={{ color: delta > 0 ? 'var(--arcade-green)' : delta < 0 ? 'var(--arcade-coral)' : 'var(--arcade-paper-disabled)' }}
                        title={delta >= 0 ? `+${delta} vs last week` : `${delta} vs last week`}
                      >
                        {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : '—'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </GlassPane>

      {/* Weekly recap */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <GlassPane state="highscore" tone="aurora" screenClassName="!py-4 text-center">
            <Award className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
            <p className="marquee-title m-0 text-xl" style={{ color: 'var(--arcade-gold)' }}>+{weeklyRecap.weekXP}</p>
            <p className="m-0 font-mono text-[9px] uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>XP this week</p>
      </GlassPane>
        <GlassPane state="off" tone="green" screenClassName="!py-4 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--arcade-green)' }} aria-hidden="true" />
            <p className="marquee-title m-0 text-xl" style={{ color: 'var(--arcade-green)' }}>{weeklyRecap.weekHabits}</p>
            <p className="m-0 font-mono text-[9px] uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>habits checked</p>
      </GlassPane>
        <GlassPane state="off" tone="cobalt" screenClassName="!py-4 text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--arcade-cobalt)' }} aria-hidden="true" />
            <p className="marquee-title m-0 text-xl" style={{ color: 'var(--arcade-cobalt)' }}>{weeklyRecap.weekTasks}</p>
            <p className="m-0 font-mono text-[9px] uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>quests done</p>
      </GlassPane>
        <GlassPane state="off" tone="magenta" screenClassName="!py-4 text-center">
            <BookOpen className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--arcade-magenta)' }} aria-hidden="true" />
            <p className="marquee-title m-0 text-xl" style={{ color: 'var(--arcade-magenta)' }}>{journal.length}</p>
            <p className="m-0 font-mono text-[9px] uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>journal entries</p>
      </GlassPane>
      </div>

      {/* Heatmap */}
      <GlassPane id="journey-heatmap" as="section" state="off" tone="green" paneTitle="Activity heatmap"
        titleRight={<span className="flex items-center gap-1.5 font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }} aria-hidden="true">
            Less
            {[0, 1, 2, 3].map(lv => (
              <span key={lv} className="w-2.5 h-2.5 rounded-[3px]" style={{ background: getHeatmapColor(lv * 34) }} />
            ))}
            More
          </span>}
        screenClassName="!p-4 overflow-x-auto">
          <div className="flex gap-1 min-w-fit">
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map(day => (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date === selectedDate ? null : day.date)}
                    className="f11-heat-cell w-3.5 h-3.5 rounded-[3px] cursor-pointer transition-all hover:scale-125"
                    style={{ background: getHeatmapColor(day.score), border: day.date === selectedDate ? '1px solid var(--arcade-gold)' : 'none' }}
                    title={`${day.date} — ${day.score}%`}
                    aria-label={`${day.date} — ${day.score}%`}
                    aria-pressed={day.date === selectedDate}
                  />
                ))}
              </div>
            ))}
          </div>
      </GlassPane>

      {/* Day details */}
      {dayDetails && selectedDate && (
        <GlassPane as="section" state="playing" tone="aurora" paneTitle={selectedDate}
          titleRight={<span className="font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-gold)' }}>{dayDetails.dayScore}%</span>}
          screenClassName="!p-4 grid grid-cols-1 md:grid-cols-3 gap-4"
          className="animate-fade-in">
            <div>
              <p className="font-mono text-[9px] uppercase mb-2" style={{ color: 'var(--arcade-paper-muted)' }}>Habits</p>
              <div className="flex flex-col gap-1">
                {dayDetails.dayHabits.filter(d => d.done).map(d => (
                  <span key={d.habit.id} className="font-mono text-[10px]" style={{ color: 'var(--arcade-green)' }}>✓ {d.habit.name}</span>
                ))}
                {dayDetails.dayHabits.filter(d => !d.done).map(d => (
                  <span key={d.habit.id} className="font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>○ {d.habit.name}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase mb-2" style={{ color: 'var(--arcade-paper-muted)' }}>Quests done</p>
              <div className="flex flex-col gap-1">
                {dayDetails.dayTasks.length === 0 ? (
                  <span className="font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>None</span>
                ) : (
                  dayDetails.dayTasks.map(t => (
                    <span key={t.id} className="font-mono text-[10px]" style={{ color: 'var(--arcade-paper-dim)' }}>✓ {t.title}</span>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase mb-2" style={{ color: 'var(--arcade-paper-muted)' }}>Journal</p>
              {dayDetails.dayJournal ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px]" style={{ color: 'var(--arcade-paper-dim)' }}>{dayDetails.dayJournal.mood} {dayDetails.dayJournal.highlight}</span>
                </div>
              ) : (
                <span className="font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>No entry</span>
              )}
            </div>
      </GlassPane>
      )}

      {/* Charts */}
      {/* F11: chart gradients defined ONCE as a hidden sibling svg — <defs> inside
          Recharts 3.x charts (or inside ResponsiveContainer, which expects exactly
          one child) triggers 'Maximum update depth exceeded' and kills the tooltip.
          url(#…) resolves document-wide from anywhere in the DOM. */}
      <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="f11XpFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.35} />
          </linearGradient>
          <linearGradient id="f11HabitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.35} />
          </linearGradient>
          <linearGradient id="f11TaskFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.3} />
          </linearGradient>
        </defs>
      </svg>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPane as="section" state="off" tone="cobalt" paneTitle="XP over time" screenClassName="!p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(233,230,242,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(233,230,242,0.12)' }}
                  tick={{ fill: '#7f7c93', fontSize: 10, fontFamily: 'Fragment Mono, ui-monospace, monospace' }}
                  dy={4}
                  minTickGap={28}
                />
                <YAxis
                  width={30}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(233,230,242,0.12)' }}
                  tick={{ fill: '#7f7c93', fontSize: 10, fontFamily: 'Fragment Mono, ui-monospace, monospace' }}
                  allowDecimals={false}
                />
                <Tooltip content={XP_TOOLTIP} cursor={XP_CURSOR} />
                <Bar
                  dataKey="xp"
                  name="XP"
                  fill="url(#f11XpFill)"
                  maxBarSize={10}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
      </GlassPane>

        <GlassPane as="section" state="off" tone="aurora" paneTitle="Daily activity" screenClassName="!p-4 h-52">

            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(233,230,242,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(233,230,242,0.12)' }}
                  tick={{ fill: '#7f7c93', fontSize: 10, fontFamily: 'Fragment Mono, ui-monospace, monospace' }}
                  dy={4}
                  minTickGap={28}
                />
                <YAxis
                  width={30}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(233,230,242,0.12)' }}
                  tick={{ fill: '#7f7c93', fontSize: 10, fontFamily: 'Fragment Mono, ui-monospace, monospace' }}
                  allowDecimals={false}
                />
                <Tooltip content={ACTIVITY_TOOLTIP} cursor={ACTIVITY_CURSOR} />
                <Bar
                  dataKey="habits"
                  stackId="a"
                  name="Habits"
                  fill="url(#f11HabitFill)"
                  maxBarSize={10}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="tasks"
                  stackId="a"
                  name="Quests"
                  fill="url(#f11TaskFill)"
                  maxBarSize={10}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
      </GlassPane>
      </div>

      {/* Streaks — longest-streak leaderboard */}
      <GlassPane as="section" state="off" tone="green" paneTitle="Streak leaderboard"
        titleRight={<span className="font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }} aria-hidden="true">best-ever · current</span>}
        screenClassName="!p-4">
          {rankedStreaks.length === 0 ? (
            <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>No active habits yet.</p>
          ) : (
            <div className="flex flex-col">
              {rankedStreaks.map(({ habit, streak, best }, i) => (
                <div key={habit.id} className="flex items-center gap-2.5 py-2" style={{ borderBottom: i < rankedStreaks.length - 1 ? '1px solid var(--obs-glass-5)' : 'none' }}>
                  <span
                    className="font-mono text-[10px] score-readout w-6 shrink-0"
                    style={{ color: i === 0 ? 'var(--arcade-gold)' : i === 1 ? 'var(--arcade-cobalt)' : i === 2 ? 'var(--arcade-magenta)' : 'var(--arcade-paper-disabled)' }}
                    aria-hidden="true"
                  >
                    #{i + 1}
                  </span>
                  <span className="text-[0.78rem] min-w-0 truncate" style={{ color: 'var(--arcade-paper-dim)' }}>{habit.icon} {habit.name}</span>
                  <span className="ml-auto flex items-center gap-2.5 shrink-0">
                    <span className="font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>best {best}</span>
                    <span className="chip" style={{ borderColor: streak >= 7 ? 'rgba(139, 92, 246, 0.35)' : 'var(--obs-glass-12)', background: streak >= 7 ? 'rgba(139, 92, 246, 0.07)' : 'rgba(242,242,242,0.04)' }}>
                      <b className="score-readout" style={{ color: streak >= 7 ? 'var(--arcade-gold)' : 'var(--arcade-green)' }}>🔥 {streak}</b>
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
      </GlassPane>

      {/* Insights */}
      <GlassPane as="section" state="attract" tone="aurora" paneTitle="Insights"
        screenClassName="!p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg p-3" style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid var(--obs-glass-8)' }}>
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
              <div>
                <p className="m-0 text-[0.8rem] leading-relaxed" style={{ color: 'var(--arcade-paper-dim)' }}>{insight}</p>
              </div>
            </div>
          ))}
      </GlassPane>

      {/* Recent events */}
      <GlassPane as="section" state="off" tone="cobalt" paneTitle="Recent events" screenClassName="!p-4">
          {events.length === 0 ? (
            <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>No events yet — your ledger is quiet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {[...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 12).map(e => (
                <div key={e.id} className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: '1px solid var(--obs-glass-5)' }}>
                  <span className="text-sm shrink-0" aria-hidden="true">{getStatEmoji(e.stat)}</span>
                  <span className="text-[0.78rem] min-w-0 truncate" style={{ color: 'var(--arcade-paper-dim)' }}>{e.entity}</span>
                  <span className="ml-auto shrink-0">{getSourceBadge(e.source)}</span>
                  <span className="font-mono text-[10px] score-readout shrink-0" style={{ color: 'var(--arcade-gold)' }}>+{e.xp} XP</span>
                  <span className="font-mono text-[9px] shrink-0 hidden sm:inline" style={{ color: 'var(--arcade-paper-disabled)' }}>{(e.timestamp || '').slice(0, 10)}</span>
                </div>
              ))}
            </div>
          )}
      </GlassPane>

      <ExportLifeModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  );
};