import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { isHabitCompleted } from '../lib/utils';
import { calculateHabitStreak } from '../services/habits/calculateHabitStreak';
import { calculateDailyScore } from '../services/stats/calculateDailyScore';
import { generateInsights } from '../services/stats/generateInsights';
import { Flame, Lightbulb, CheckCircle, BookOpen, Award, FileText } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ExportLifeModal } from '../components/shared/ExportLifeModal';

// Arcade tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="cabinet cabinet--playing !shadow-none !overflow-visible p-3 font-mono text-xs" style={{ '--marquee-color': 'var(--arcade-gold)', background: 'rgba(20,16,31,0.96)', border: '1px solid rgba(111, 91, 216,0.3)' } as React.CSSProperties}>
        <p className="font-bold m-0 mb-1" style={{ color: 'var(--arcade-gold)' }}>{label}</p>
        {payload.map((pld: any) => (
          <p key={pld.name} className="flex justify-between gap-4 m-0" style={{ color: 'var(--arcade-paper-dim)' }}>
            <span style={{ color: pld.color || pld.stroke }} className="font-semibold">{pld.name}:</span>
            <span className="font-black score-readout" style={{ color: 'var(--arcade-paper)' }}>{pld.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Journey — the high-score wall. Heatmap, XP over time, streaks,
 * character stats, weekly recap, and insights. Read mode.
 */
export const Journey: React.FC = () => {
  const { habits, habitLogs, tasks, journal, stats, events } = useStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const statConfig = [
    { name: 'Discipline', icon: '⚔️', value: stats.discipline, barColor: 'var(--arcade-magenta)' },
    { name: 'Health', icon: '💪', value: stats.health, barColor: 'var(--arcade-green)' },
    { name: 'Knowledge', icon: '🧠', value: stats.knowledge, barColor: 'var(--arcade-cobalt)' },
    { name: 'Creativity', icon: '🎨', value: stats.creativity, barColor: 'var(--arcade-red)' },
    { name: 'Career', icon: '💼', value: stats.career, barColor: 'var(--arcade-gold)' }
  ];

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

  const getHeatmapColor = (score: number) => {
    if (score >= 80) return 'rgba(61,220,132,0.85)';
    if (score >= 40) return 'rgba(111, 91, 216,0.55)';
    if (score > 0) return 'rgba(63,123,255,0.4)';
    return 'rgba(242,242,242,0.06)';
  };

  // 2. Habit streaks
  const activeHabits = habits.filter(h => h.active);
  const habitCounts = activeHabits.map(h => ({
    habit: h,
    streak: calculateHabitStreak(h, habitLogs)
  }));

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

  // 5. Insights
  const insights = generateInsights(habitLogs, tasks);

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
        </div>
        <button onClick={() => setShowExportModal(true)} className="btn-ghost !text-xs">
          <FileText className="w-4 h-4" aria-hidden="true" /> Export life
        </button>
      </div>

      {/* Stat overview — the character panel */}
      <div id="journey-stat-bars" className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-cobalt)' } as React.CSSProperties}>
        <div className="cabinet-marquee">
          <span className="cabinet-led" aria-hidden="true" />
          <span className="cabinet-marquee-title">Character stats</span>
          <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-gold)' }}>LVL {stats.level} · {stats.xp} XP</span>
        </div>
        <div className="cabinet-screen !p-4 grid grid-cols-1 sm:grid-cols-5 gap-4">
          {statConfig.map(stat => (
            <div key={stat.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold" style={{ color: 'var(--arcade-paper-dim)' }}>{stat.icon} {stat.name}</span>
                <span className="font-mono text-[10px] score-readout" style={{ color: stat.barColor }}>{stat.value}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(242,242,242,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (stat.value / 200) * 100)}%`, background: stat.barColor, boxShadow: `0 0 10px ${stat.barColor}` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly recap */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="cabinet cabinet--highscore" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
          <div className="cabinet-screen !py-4 text-center">
            <Award className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
            <p className="marquee-title m-0 text-xl" style={{ color: 'var(--arcade-gold)' }}>+{weeklyRecap.weekXP}</p>
            <p className="m-0 font-mono text-[9px] uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>XP this week</p>
          </div>
        </div>
        <div className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-green)' } as React.CSSProperties}>
          <div className="cabinet-screen !py-4 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--arcade-green)' }} aria-hidden="true" />
            <p className="marquee-title m-0 text-xl" style={{ color: 'var(--arcade-green)' }}>{weeklyRecap.weekHabits}</p>
            <p className="m-0 font-mono text-[9px] uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>habits checked</p>
          </div>
        </div>
        <div className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-cobalt)' } as React.CSSProperties}>
          <div className="cabinet-screen !py-4 text-center">
            <CheckCircle className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--arcade-cobalt)' }} aria-hidden="true" />
            <p className="marquee-title m-0 text-xl" style={{ color: 'var(--arcade-cobalt)' }}>{weeklyRecap.weekTasks}</p>
            <p className="m-0 font-mono text-[9px] uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>quests done</p>
          </div>
        </div>
        <div className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-magenta)' } as React.CSSProperties}>
          <div className="cabinet-screen !py-4 text-center">
            <BookOpen className="w-5 h-5 mx-auto mb-1.5" style={{ color: 'var(--arcade-magenta)' }} aria-hidden="true" />
            <p className="marquee-title m-0 text-xl" style={{ color: 'var(--arcade-magenta)' }}>{journal.length}</p>
            <p className="m-0 font-mono text-[9px] uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>journal entries</p>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <section id="journey-heatmap" className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-green)' } as React.CSSProperties}>
        <div className="cabinet-marquee">
          <span className="cabinet-led" aria-hidden="true" />
          <span className="cabinet-marquee-title">Activity heatmap</span>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }} aria-hidden="true">
            Less
            {[0, 1, 2, 3].map(lv => (
              <span key={lv} className="w-2.5 h-2.5 rounded-[3px]" style={{ background: getHeatmapColor(lv * 34) }} />
            ))}
            More
          </span>
        </div>
        <div className="cabinet-screen !p-4 overflow-x-auto">
          <div className="flex gap-1 min-w-fit">
            {heatmapWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map(day => (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date === selectedDate ? null : day.date)}
                    className="w-3.5 h-3.5 rounded-[3px] cursor-pointer transition-transform hover:scale-125"
                    style={{ background: getHeatmapColor(day.score), border: day.date === selectedDate ? '1px solid var(--arcade-gold)' : 'none' }}
                    title={`${day.date} — ${day.score}%`}
                    aria-label={`${day.date} — ${day.score}%`}
                    aria-pressed={day.date === selectedDate}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Day details */}
      {dayDetails && selectedDate && (
        <section className="cabinet cabinet--playing animate-fade-in" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">{selectedDate}</span>
            <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-gold)' }}>{dayDetails.dayScore}%</span>
          </div>
          <div className="cabinet-screen !p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </section>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-cobalt)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">XP over time</span>
          </div>
          <div className="cabinet-screen !p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(242,242,242,0.06)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--arcade-paper-muted)', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: 'var(--arcade-paper-muted)', fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="xp" stroke="var(--arcade-cobalt)" strokeWidth={2} dot={{ fill: 'var(--arcade-cobalt)', r: 2 }} name="XP" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Daily activity</span>
          </div>
          <div className="cabinet-screen !p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(242,242,242,0.06)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--arcade-paper-muted)', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: 'var(--arcade-paper-muted)', fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="habits" stackId="a" fill="var(--arcade-green)" name="Habits" />
                <Bar dataKey="tasks" stackId="a" fill="var(--arcade-cobalt)" name="Quests" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Streaks */}
      <section className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-green)' } as React.CSSProperties}>
        <div className="cabinet-marquee">
          <span className="cabinet-led" aria-hidden="true" />
          <span className="cabinet-marquee-title">Habit streaks</span>
        </div>
        <div className="cabinet-screen !p-4">
          {habitCounts.length === 0 ? (
            <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>No active habits yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {habitCounts.map(({ habit, streak }) => (
                <span key={habit.id} className="chip" style={{ borderColor: streak >= 7 ? 'rgba(111, 91, 216,0.35)' : 'rgba(242,242,242,0.12)', background: streak >= 7 ? 'rgba(111, 91, 216,0.07)' : 'rgba(242,242,242,0.04)' }}>
                  {habit.icon} {habit.name}
                  <b className="score-readout" style={{ color: streak >= 7 ? 'var(--arcade-gold)' : 'var(--arcade-green)' }}>🔥 {streak}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Insights */}
      <section className="cabinet cabinet--attract" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
        <div className="cabinet-marquee">
          <span className="cabinet-led" aria-hidden="true" />
          <span className="cabinet-marquee-title">Insights</span>
        </div>
        <div className="cabinet-screen !p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg p-3" style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid rgba(242,242,242,0.08)' }}>
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
              <div>
                <p className="m-0 text-[0.8rem] leading-relaxed" style={{ color: 'var(--arcade-paper-dim)' }}>{insight}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent events */}
      <section className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-cobalt)' } as React.CSSProperties}>
        <div className="cabinet-marquee">
          <span className="cabinet-led" aria-hidden="true" />
          <span className="cabinet-marquee-title">Recent events</span>
        </div>
        <div className="cabinet-screen !p-4">
          {events.length === 0 ? (
            <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>No events yet — your ledger is quiet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {[...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 12).map(e => (
                <div key={e.id} className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: '1px solid rgba(242,242,242,0.05)' }}>
                  <span className="text-sm shrink-0" aria-hidden="true">{getStatEmoji(e.stat)}</span>
                  <span className="text-[0.78rem] min-w-0 truncate" style={{ color: 'var(--arcade-paper-dim)' }}>{e.entity}</span>
                  <span className="ml-auto shrink-0">{getSourceBadge(e.source)}</span>
                  <span className="font-mono text-[10px] score-readout shrink-0" style={{ color: 'var(--arcade-gold)' }}>+{e.xp} XP</span>
                  <span className="font-mono text-[9px] shrink-0 hidden sm:inline" style={{ color: 'var(--arcade-paper-disabled)' }}>{(e.timestamp || '').slice(0, 10)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ExportLifeModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  );
};
