import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { isHabitCompleted } from '../lib/utils';
import { calculateHabitStreak, calculateBestStreak } from '../services/habits/calculateHabitStreak';
import { calculateDailyScore } from '../services/stats/calculateDailyScore';
import { generateInsights } from '../services/stats/generateInsights';
import { Lightbulb, FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ExportLifeModal } from '../components/shared/ExportLifeModal';
import { GlassPane, PixelIcon, PixelBadge, SystemLabel, TerminalText } from '../components/ui';
import { CharacterCard } from '../components/shared/CharacterCard';
import { StatBar } from '../components/shared/StatBar';
import { StreakCounter } from '../components/shared/StreakCounter';
import type { StatType } from '../types';

const SERIES_TONES: Record<string, string> = {
  xp: 'var(--obs-aurora-bright)',
  habits: 'var(--obs-aurora)',
  tasks: 'var(--obs-cobalt)',
};

interface ChartTooltipItem { name?: string; value?: number | string; dataKey?: string | number; color?: string; stroke?: string; }
interface ChartTooltipProps { active?: boolean; payload?: ChartTooltipItem[]; label?: string | number; }

const F11Tooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  const toneOf = (pld: ChartTooltipItem) => {
    const c = pld.color || pld.stroke;
    if (typeof c === 'string' && c.startsWith('url(')) return SERIES_TONES[pld.dataKey as string] ?? 'var(--obs-aurora)';
    return c || 'var(--obs-aurora)';
  };
  return (
    <div className="f11-chart-tooltip" style={{ '--tt': toneOf(payload[0]) } as React.CSSProperties}>
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

const XP_TOOLTIP = <F11Tooltip />;
const ACTIVITY_TOOLTIP = <F11Tooltip />;
const XP_CURSOR = { stroke: 'rgba(167,139,250,0.35)', strokeWidth: 1, strokeDasharray: '3 4' };
const ACTIVITY_CURSOR = { fill: 'rgba(139,92,246,0.08)' };

const STAT_ICONS: Record<string, string> = {
  discipline: 'sword', health: 'fire', knowledge: 'book', creativity: 'brush', career: 'briefcase',
};

/**
 * Journey — the character progression screen. Level, XP, stats, streaks,
 * heatmap, weekly XP, insights, and recent events.
 */
export const Journey: React.FC = () => {
  const { habits, habitLogs, tasks, journal, stats, events, character, weeklyStats } = useStore(useShallow(s => ({
    habits: s.habits, habitLogs: s.habitLogs, tasks: s.tasks, journal: s.journal,
    stats: s.stats, events: s.events, character: s.character, weeklyStats: s.weeklyStats,
  })));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const characterTitle = character[0]?.title ?? 'Novice Adventurer';
  const xpPerLevel = 1500;

  const statMeta: Record<StatType, { icon: string; barColor: string }> = {
    discipline: { icon: 'sword', barColor: 'var(--bt-primary)' },
    health: { icon: 'fire', barColor: 'var(--bt-success)' },
    knowledge: { icon: 'book', barColor: 'var(--bt-info)' },
    creativity: { icon: 'brush', barColor: 'var(--bt-danger)' },
    career: { icon: 'briefcase', barColor: 'var(--bt-xp)' },
  };

  const statConfig = (Object.keys(statMeta) as StatType[]).map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1), key: s, icon: statMeta[s].icon,
    value: stats[s], barColor: statMeta[s].barColor,
  }));

  // Heatmap
  const generateHeatmapData = () => {
    const data = []; const today = new Date(); const startDate = new Date();
    startDate.setDate(today.getDate() - 105);
    const dayOfWeek = startDate.getDay(); startDate.setDate(startDate.getDate() - dayOfWeek);
    const currentDate = new Date(startDate); const endLimit = new Date(today);
    endLimit.setDate(endLimit.getDate() + (6 - endLimit.getDay()));
    while (currentDate <= endLimit) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      data.push({ date: dateStr, score: calculateDailyScore(dateStr, habits, habitLogs, tasks, journal), dayNum: currentDate.getDate(), dayOfWeek: currentDate.getDay() });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return data;
  };

  const heatmapDays = generateHeatmapData();
  const heatmapWeeks: typeof heatmapDays[] = [];
  for (let i = 0; i < heatmapDays.length; i += 7) heatmapWeeks.push(heatmapDays.slice(i, i + 7));

  const getHeatmapColor = (score: number) => {
    if (score >= 80) return 'rgba(139, 92, 246, 0.92)';
    if (score >= 40) return 'rgba(139, 92, 246, 0.55)';
    if (score > 0) return 'rgba(139, 92, 246, 0.28)';
    return 'rgba(233, 230, 242, 0.06)';
  };

  // Streaks
  const activeHabits = habits.filter(h => h.active);
  const rankedStreaks = activeHabits
    .map(h => ({ habit: h, streak: calculateHabitStreak(h, habitLogs), best: calculateBestStreak(h, habitLogs) }))
    .sort((a, b) => b.best - a.best || b.streak - a.streak);

  // Weekly recap
  const getWeeklyRecap = () => {
    const now = new Date(); const weekStart = new Date(now); const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); weekStart.setDate(diff);
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const weekEvents = events.filter(e => (e.timestamp || '').slice(0, 10) >= weekStartStr);
    return { weekXP: weekEvents.reduce((a, e) => a + (e.xp || 0), 0), weekHabits: weekEvents.filter(e => e.type === 'habit_completed').length, weekTasks: weekEvents.filter(e => e.type === 'task_completed').length };
  };
  const weeklyRecap = getWeeklyRecap();

  // Attribute deltas
  const attributeDeltas = (() => {
    const recs = weeklyStats; const latest = recs[recs.length - 1];
    if (!latest) return null;
    const prev = recs[recs.length - 2];
    return (Object.keys(statMeta) as StatType[]).map(s => ({ stat: s, thisWeek: latest[s] || 0, lastWeek: prev ? prev[s] || 0 : null }));
  })();

  const insights = generateInsights(habitLogs, tasks, habits);

  // Chart data — full 30-day demo world period
  const chartData = (() => {
    const data = []; const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayEvents = events.filter(e => (e.timestamp || '').slice(0, 10) === dateStr);
      data.push({ date: dateStr.slice(5), xp: dayEvents.reduce((a, e) => a + (e.xp || 0), 0),
        habits: dayEvents.filter(e => e.type === 'habit_completed').length,
        tasks: dayEvents.filter(e => e.type === 'task_completed').length });
    }
    return data;
  })();

  // Day details
  const getSelectedDayDetails = () => {
    if (!selectedDate) return null;
    const dayHabits = activeHabits.map(h => ({ habit: h, done: isHabitCompleted(h, habitLogs.find(l => l.habit_id === h.id && l.date === selectedDate)) }));
    const dayTasks = tasks.filter(t => t.status === 'done' && (t.completed_at || '').slice(0, 10) === selectedDate);
    const dayJournal = journal.find(j => j.date === selectedDate);
    return { dayHabits, dayTasks, dayJournal, dayScore: calculateDailyScore(selectedDate, habits, habitLogs, tasks, journal) };
  };
  const dayDetails = getSelectedDayDetails();

  const getSourceBadge = (source: string) => {
      const map: Record<string, 'success' | 'info' | 'rose' | 'warning' | 'default'> = { habit: 'success', task: 'info', journal: 'rose', system: 'warning' };
      return <PixelBadge tone={map[source] || 'default'}>{source}</PixelBadge>;
    };

  return (
    <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
        <div>
          <h2 className="marquee-title text-2xl m-0" style={{ color: 'var(--bt-text)' }}>
            <TerminalText tone="primary" prompt>CHARACTER</TerminalText>
          </h2>
          <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--bt-text-muted)' }}>
            Your life as a high-score wall.
          </p>
        </div>
        <button onClick={() => setShowExportModal(true)} className="btn-ghost !text-xs">
          <FileText className="w-4 h-4" aria-hidden="true" /> Export life
        </button>
      </div>

      {/* Character Hero + Stats — side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 z-10">
        {/* Character Card */}
        <CharacterCard level={stats.level} xp={stats.xp} xpPerLevel={xpPerLevel} title={characterTitle} />

        {/* Stats Panel */}
        <div className="md:col-span-2">
          <GlassPane id="journey-stat-bars" state="off" tone="cobalt" paneTitle="CHARACTER STATS"
            screenClassName="!p-4 flex flex-col gap-3">
            {statConfig.map(stat => (
              <StatBar key={stat.key} name={stat.name} icon={stat.icon} value={stat.value}
                barColor={stat.barColor}
                delta={(() => { const d = attributeDeltas?.find(d => d.stat === stat.key); return d && d.lastWeek !== null ? d.thisWeek - d.lastWeek : null; })()} />
            ))}

            {/* Attribute deltas — this week's XP per stat */}
            {attributeDeltas && (
              <div className="mt-2 pt-3" style={{ borderTop: '1px solid var(--bt-border-soft)' }}>
                <SystemLabel tone="muted">ATTRIBUTE XP — THIS WEEK</SystemLabel>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">
                  {attributeDeltas.map(({ stat, thisWeek }) => {
                    const meta = statMeta[stat];
                    return (
                      <div key={stat} className="flex items-center gap-1.5 min-w-0">
                        <PixelIcon name={meta.icon as never} size={10} color={thisWeek > 0 ? meta.barColor : 'var(--bt-text-disabled)'} />
                        <span className="font-mono text-[10px]" style={{ color: thisWeek > 0 ? meta.barColor : 'var(--bt-text-disabled)' }}>+{thisWeek}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </GlassPane>
        </div>
      </div>

      {/* Weekly Recap */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 z-10">
        <GlassPane state="highscore" tone="aurora" screenClassName="!py-4 text-center">
          <PixelIcon name="trophy" size={20} color="var(--bt-xp)" className="mx-auto mb-1.5" />
          <p className="marquee-title m-0 text-xl" style={{ color: 'var(--bt-xp)' }}>+{weeklyRecap.weekXP}</p>
          <SystemLabel tone="muted">XP this week</SystemLabel>
        </GlassPane>
        <GlassPane state="off" tone="green" screenClassName="!py-4 text-center">
          <PixelIcon name="fire" size={20} color="var(--bt-success)" className="mx-auto mb-1.5" />
          <p className="marquee-title m-0 text-xl" style={{ color: 'var(--bt-success)' }}>{weeklyRecap.weekHabits}</p>
          <SystemLabel tone="muted">habits checked</SystemLabel>
        </GlassPane>
        <GlassPane state="off" tone="cobalt" screenClassName="!py-4 text-center">
          <PixelIcon name="checkbox" size={20} color="var(--bt-info)" className="mx-auto mb-1.5" />
          <p className="marquee-title m-0 text-xl" style={{ color: 'var(--bt-info)' }}>{weeklyRecap.weekTasks}</p>
          <SystemLabel tone="muted">quests done</SystemLabel>
        </GlassPane>
        <GlassPane state="off" tone="magenta" screenClassName="!py-4 text-center">
          <PixelIcon name="book" size={20} color="var(--bt-rose)" className="mx-auto mb-1.5" />
          <p className="marquee-title m-0 text-xl" style={{ color: 'var(--bt-rose)' }}>{journal.length}</p>
          <SystemLabel tone="muted">journal entries</SystemLabel>
        </GlassPane>
      </div>

      {/* Heatmap */}
      <GlassPane id="journey-heatmap" as="section" state="off" tone="green" paneTitle="ACTIVITY HEATMAP"
        titleRight={<span className="flex items-center gap-1.5 font-mono text-[9px]" style={{ color: 'var(--bt-text-muted)' }} aria-hidden="true">
          Less {[0, 1, 2, 3].map(lv => <span key={lv} className="w-2.5 h-2.5 rounded-[3px]" style={{ background: getHeatmapColor(lv * 34) }} />)} More
        </span>}
        screenClassName="!p-4 overflow-x-auto" className="z-10">
        <div className="flex gap-1 min-w-fit">
          {heatmapWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map(day => (
                <button key={day.date} type="button"
                  onClick={() => setSelectedDate(day.date === selectedDate ? null : day.date)}
                  className="f11-heat-cell w-3.5 h-3.5 rounded-[3px] cursor-pointer transition-all hover:scale-125"
                  style={{ background: getHeatmapColor(day.score), border: day.date === selectedDate ? '1px solid var(--bt-xp)' : 'none' }}
                  title={`${day.date} — ${day.score}%`} aria-label={`${day.date} — ${day.score}%`} aria-pressed={day.date === selectedDate} />
              ))}
            </div>
          ))}
        </div>
      </GlassPane>

      {/* Day details */}
      {dayDetails && selectedDate && (
        <GlassPane as="section" state="playing" tone="aurora" paneTitle={selectedDate}
          titleRight={<SystemLabel tone="primary">{dayDetails.dayScore}%</SystemLabel>}
          screenClassName="!p-4 grid grid-cols-1 md:grid-cols-3 gap-4" className="animate-fade-in z-10">
          <div>
            <SystemLabel tone="muted">HABITS</SystemLabel>
            <div className="flex flex-col gap-1 mt-2">
              {dayDetails.dayHabits.filter(d => d.done).map(d => (
                <span key={d.habit.id} className="font-mono text-[10px]" style={{ color: 'var(--bt-success)' }}>✓ {d.habit.name}</span>
              ))}
              {dayDetails.dayHabits.filter(d => !d.done).map(d => (
                <span key={d.habit.id} className="font-mono text-[10px]" style={{ color: 'var(--bt-text-disabled)' }}>○ {d.habit.name}</span>
              ))}
            </div>
          </div>
          <div>
            <SystemLabel tone="muted">QUESTS DONE</SystemLabel>
            <div className="flex flex-col gap-1 mt-2">
              {dayDetails.dayTasks.length === 0 ? (
                <span className="font-mono text-[10px]" style={{ color: 'var(--bt-text-disabled)' }}>None</span>
              ) : dayDetails.dayTasks.map(t => (
                <span key={t.id} className="font-mono text-[10px]" style={{ color: 'var(--bt-text-dim)' }}>✓ {t.title}</span>
              ))}
            </div>
          </div>
          <div>
            <SystemLabel tone="muted">JOURNAL</SystemLabel>
            {dayDetails.dayJournal ? (
              <span className="text-[10px] mt-2 block" style={{ color: 'var(--bt-text-dim)' }}>{dayDetails.dayJournal.mood} {dayDetails.dayJournal.highlight}</span>
            ) : (
              <span className="font-mono text-[10px] mt-2 block" style={{ color: 'var(--bt-text-disabled)' }}>No entry</span>
            )}
          </div>
        </GlassPane>
      )}

      {/* Charts — Recharts preserved */}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 z-10">
        <GlassPane as="section" state="off" tone="cobalt" paneTitle="XP OVER TIME" screenClassName="!p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(233,230,242,0.06)" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: 'rgba(233,230,242,0.12)' }} tick={{ fill: '#7f7c93', fontSize: 9, fontFamily: 'Fragment Mono, ui-monospace, monospace' }} dy={4} minTickGap={12} interval={2} />
              <YAxis width={30} tickLine={false} axisLine={{ stroke: 'rgba(233,230,242,0.12)' }} tick={{ fill: '#7f7c93', fontSize: 10, fontFamily: 'Fragment Mono, ui-monospace, monospace' }} allowDecimals={false} />
              <Tooltip content={XP_TOOLTIP} cursor={XP_CURSOR} />
              <Bar dataKey="xp" name="XP" fill="url(#f11XpFill)" maxBarSize={10} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </GlassPane>
        <GlassPane as="section" state="off" tone="aurora" paneTitle="DAILY ACTIVITY" screenClassName="!p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(233,230,242,0.06)" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: 'rgba(233,230,242,0.12)' }} tick={{ fill: '#7f7c93', fontSize: 9, fontFamily: 'Fragment Mono, ui-monospace, monospace' }} dy={4} minTickGap={12} interval={2} />
              <YAxis width={30} tickLine={false} axisLine={{ stroke: 'rgba(233,230,242,0.12)' }} tick={{ fill: '#7f7c93', fontSize: 10, fontFamily: 'Fragment Mono, ui-monospace, monospace' }} allowDecimals={false} />
              <Tooltip content={ACTIVITY_TOOLTIP} cursor={ACTIVITY_CURSOR} />
              <Bar dataKey="habits" stackId="a" name="Habits" fill="url(#f11HabitFill)" maxBarSize={10} isAnimationActive={false} />
              <Bar dataKey="tasks" stackId="a" name="Quests" fill="url(#f11TaskFill)" maxBarSize={10} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </GlassPane>
      </div>

      {/* Streaks */}
      <GlassPane as="section" state="off" tone="green" paneTitle="STREAK LEADERBOARD"
        titleRight={<SystemLabel tone="muted">best-ever · current</SystemLabel>}
        screenClassName="!p-4" className="z-10">
        {rankedStreaks.length === 0 ? (
          <SystemLabel tone="muted">No active habits yet.</SystemLabel>
        ) : (
          <div className="flex flex-col">
            {rankedStreaks.map(({ habit, streak, best }, i) => (
              <div key={habit.id} className="flex items-center gap-2.5 py-2" style={{ borderBottom: i < rankedStreaks.length - 1 ? '1px solid var(--bt-border-soft)' : 'none' }}>
                <PixelBadge tone={i === 0 ? 'warning' : i === 1 ? 'info' : 'default'} className="!text-[8px]">#{i + 1}</PixelBadge>
                <span className="text-[0.78rem] min-w-0 truncate" style={{ color: 'var(--bt-text-dim)' }}>{habit.icon} {habit.name}</span>
                <span className="ml-auto flex items-center gap-2.5 shrink-0">
                  <SystemLabel tone="muted">best {best}</SystemLabel>
                  <StreakCounter current={streak} best={0} />
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassPane>

      {/* Insights */}
      <GlassPane as="section" state="attract" tone="aurora" paneTitle="WEEKLY REPORT"
        screenClassName="!p-4 grid grid-cols-1 md:grid-cols-2 gap-3" className="z-10">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-lg p-3" style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid var(--bt-border-soft)' }}>
            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--bt-xp)' }} aria-hidden="true" />
            <p className="m-0 text-[0.8rem] leading-relaxed" style={{ color: 'var(--bt-text-dim)' }}>{insight}</p>
          </div>
        ))}
      </GlassPane>

      {/* Recent events */}
      <GlassPane as="section" state="off" tone="cobalt" paneTitle="RECENT EVENTS" screenClassName="!p-4" className="z-10">
        {events.length === 0 ? (
          <SystemLabel tone="muted">No events yet — your ledger is quiet.</SystemLabel>
        ) : (
          <div className="flex flex-col gap-1.5">
            {[...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 12).map(e => (
              <div key={e.id} className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: '1px solid var(--bt-border-soft)' }}>
                <PixelIcon name={(STAT_ICONS[e.stat] || 'star') as never} size={14} color="var(--bt-text-muted)" className="shrink-0" />
                <span className="text-[0.78rem] min-w-0 truncate" style={{ color: 'var(--bt-text-dim)' }}>{e.entity}</span>
                <span className="ml-auto shrink-0">{getSourceBadge(e.source)}</span>
                <SystemLabel tone="primary">+{e.xp} XP</SystemLabel>
                <SystemLabel tone="muted" className="hidden sm:inline">{(e.timestamp || '').slice(0, 10)}</SystemLabel>
              </div>
            ))}
          </div>
        )}
      </GlassPane>

      <ExportLifeModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  );
};
