import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { getTodayDateString, isHabitCompleted } from '../lib/utils';
import { calculateHabitStreak, calculateBestStreak } from '../services/habits/calculateHabitStreak';
import { UndoToast } from '../components/shared/UndoToast';
import { MoodInstrument, WaterInstrument, SleepInstrument, ReadingInstrument, WorkoutInstrument, PresetCatalog } from '../components/habits/HabitInstruments';
import { formatPresetValue } from '../lib/habitPresets';
import { PixelIcon, SystemLabel, TerminalText } from '../components/ui';
import type { Habit, StatType } from '../types';

type HabitView = 'today' | 'week' | 'history';
const STAT_LABELS: Record<StatType, { label: string; icon: string; color: string }> = {
  discipline: { label: 'DISCIPLINE', icon: 'sword', color: 'var(--obs-coral, #f87171)' },
  health: { label: 'HEALTH', icon: 'fire', color: 'var(--obs-teal, #3dca84)' },
  knowledge: { label: 'KNOWLEDGE', icon: 'book', color: 'var(--obs-cobalt, #3f7bff)' },
  creativity: { label: 'CREATIVITY', icon: 'brush', color: 'var(--obs-rose, #fb7185)' },
  career: { label: 'CAREER', icon: 'briefcase', color: 'var(--obs-amber, #f59e0b)' },
};

/**
 * Habits — Habit Engine.
 * "What I'm becoming through repetition."
 * REPEAT → STREAK → ATTRIBUTE XP → CHARACTER EVOLUTION
 */
export const Habits: React.FC = () => {
  const {
    habits, habitLogs, toggleHabit, deleteHabit,
  } = useStore(useShallow(s => ({
    habits: s.habits, habitLogs: s.habitLogs,
    toggleHabit: s.toggleHabit,
    deleteHabit: s.deleteHabit,
  })));

  const todayStr = getTodayDateString();
  const [view, setView] = useState<HabitView>('today');
  const [dayEditor, setDayEditor] = useState<{ habitId: string; date: string } | null>(null);

  // Undo toast for delete
  const [pendingDelete, setPendingDelete] = useState<{ name: string; id: string } | null>(null);
  const deleteTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoDeleteHabit = useCallback(() => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); setPendingDelete(null); }, []);
  const requestDeleteHabit = useCallback((habit: Habit) => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDelete({ name: habit.name, id: habit.id });
    deleteTimerRef.current = setTimeout(() => { void deleteHabit(habit.id); setPendingDelete(null); }, 5000);
  }, [deleteHabit]);

  // XP floating
  const [floatingXPs, setFloatingXPs] = useState<{ id: number; xp: number; stat: string }[]>([]);
  const xpIdRef = React.useRef(0);
  const triggerXP = (xp: number, stat: string) => {
    const item = { id: ++xpIdRef.current, xp, stat };
    setFloatingXPs(prev => [...prev, item]);
    setTimeout(() => { setFloatingXPs(prev => prev.filter(p => p.id !== item.id)); }, 1000);
  };

  // Computed
  const activeHabits = habits.filter(h => h.active);
  const todayLogs = habitLogs.filter(l => l.date === todayStr);
  const completedToday = activeHabits.filter(h => {
    const log = todayLogs.find(l => l.habit_id === h.id);
    return isHabitCompleted(h, log);
  }).length;
  const activeStreaks = activeHabits.filter(h => calculateHabitStreak(h, habitLogs) > 0).length;
  const consistencyPct = activeHabits.length > 0 ? Math.round((completedToday / activeHabits.length) * 100) : 0;

  // Character impact: attribute → habits mapping + XP earned this week
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStr = weekStart.toISOString().slice(0, 10);
  const weekLogs = habitLogs.filter(l => l.date >= weekStr);
  const statImpact: Record<StatType, { totalXp: number; count: number }> = {
    discipline: { totalXp: 0, count: 0 }, health: { totalXp: 0, count: 0 },
    knowledge: { totalXp: 0, count: 0 }, creativity: { totalXp: 0, count: 0 }, career: { totalXp: 0, count: 0 },
  };
  activeHabits.forEach(h => {
    const habitWeekLogs = weekLogs.filter(l => l.habit_id === h.id && isHabitCompleted(h, l));
    if (habitWeekLogs.length > 0) {
      statImpact[h.stat].totalXp += habitWeekLogs.reduce((sum, l) => sum + (l.xp_earned || 0), 0);
      statImpact[h.stat].count++;
    }
  });

  // At-risk habits
  const atRiskHabits = activeHabits.filter(h => {
    const streak = calculateHabitStreak(h, habitLogs);
    if (streak === 0) return false;
    const log = todayLogs.find(l => l.habit_id === h.id);
    return !isHabitCompleted(h, log);
  });

  // Helper: get log for date
  const getLogForDate = (habitId: string, date: string) => habitLogs.find(l => l.habit_id === habitId && l.date === date);

  // Helper: handle check-in
  const handleCheckIn = (habit: Habit) => {
    if (habit.type === 'checkbox') {
      toggleHabit(habit.id, todayStr);
      triggerXP(habit.xp, habit.stat);
    }
  };

  // Week dates (last 7 days)
  const weekDates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    weekDates.push(d.toISOString().slice(0, 10));
  }
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-5 md:pb-48 pb-20">
      {/* Floating XP */}
      {floatingXPs.map(item => (
        <div key={item.id} className="fixed z-30 pointer-events-none animate-fade-in" style={{ left: '50%', top: '20%', transform: 'translate(-50%, -50%)' }}>
          <span className="font-mono text-lg font-bold" style={{ color: 'var(--obs-gold, #e8b45a)' }}>+{item.xp} {item.stat.toUpperCase()}</span>
        </div>
      ))}
      {pendingDelete && <UndoToast message={`"${pendingDelete.name}" removing — tap Undo to keep`} onUndo={undoDeleteHabit} />}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col gap-2">
        <TerminalText tone="primary" prompt>HABIT_ENGINE</TerminalText>
        <SystemLabel tone="muted">{activeHabits.length} TRACKED · {activeStreaks} ACTIVE STREAKS · {consistencyPct}% CONSISTENCY</SystemLabel>
      </div>

      {/* ─── CHARACTER IMPACT ─── */}
      <section aria-label="Character impact">
        <TerminalText prompt>CHARACTER_IMPACT</TerminalText>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {(Object.keys(STAT_LABELS) as StatType[]).map(stat => {
            const info = STAT_LABELS[stat];
            const impact = statImpact[stat];
            const isZero = impact.totalXp === 0;
            return (
              <div key={stat} className={`rounded-lg border p-2.5 text-center ${isZero ? 'opacity-40' : ''}`} style={{ background: 'rgba(233,230,242,0.03)', borderColor: 'rgba(233,230,242,0.06)' }}>
                <PixelIcon name={info.icon as never} size={16} color={isZero ? 'var(--bt-text-disabled)' : info.color} />
                <div className="font-mono text-[10px] font-bold mt-1" style={{ color: 'var(--bt-text)' }}>{info.label}</div>
                <div className="font-mono text-sm font-bold" style={{ color: isZero ? 'var(--bt-text-muted)' : info.color }}>+{impact.totalXp}</div>
                <div className="font-mono text-[9px]" style={{ color: 'var(--bt-text-muted)' }}>{impact.count} habit{impact.count !== 1 ? 's' : ''}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── VIEW TABS ─── */}
      <div className="flex gap-1.5" role="tablist">
        {(['today', 'week', 'history'] as const).map(v => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={`chip cursor-pointer font-mono text-[10px] uppercase ${view === v ? 'chip--aurora' : ''}`}>
            {v}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TODAY VIEW
         ═══════════════════════════════════════════════════════════════════ */}
      {view === 'today' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start" data-tour="habit-list">
          {activeHabits.length === 0 ? (
            <div className="rounded-xl border p-8 text-center" style={{ background: 'rgba(233,230,242,0.02)', borderColor: 'rgba(233,230,242,0.06)' }}>
              <PixelIcon name="fire" size={32} color="var(--bt-text-disabled)" />
              <SystemLabel tone="muted" className="mt-3 block">No habits tracked yet. Start building consistency.</SystemLabel>
            </div>
          ) : activeHabits.map(habit => {
            const log = getLogForDate(habit.id, todayStr);
            const completed = isHabitCompleted(habit, log);
            const streak = calculateHabitStreak(habit, habitLogs);
            const bestStreak = calculateBestStreak(habit, habitLogs);
            const statInfo = STAT_LABELS[habit.stat];
            // Consistency: last 7 days
            const last7 = weekDates.filter(d => {
              const l = getLogForDate(habit.id, d);
              return isHabitCompleted(habit, l);
            }).length;
            const consistencyPct = Math.round((last7 / 7) * 100);

            return (
              <div key={habit.id} className="rounded-xl border p-4" style={{ background: completed ? 'rgba(61,220,132,0.04)' : 'rgba(233,230,242,0.03)', borderColor: completed ? 'rgba(61,220,132,0.15)' : 'rgba(233,230,242,0.06)' }}>
                {/* Title row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden="true">{habit.icon}</span>
                    <span className="font-bold text-sm" style={{ color: completed ? 'var(--bt-success)' : 'var(--bt-text)' }}>{habit.name}</span>
                  </div>
                  {streak > 0 && <span className="font-mono text-[10px]" style={{ color: 'var(--obs-gold, #e8b45a)' }}>{streak} DAY STREAK</span>}
                </div>
                {/* Meta */}
                <div className="flex items-center gap-2 mb-2">
                  <SystemLabel>{statInfo.label}</SystemLabel>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--obs-gold, #e8b45a)' }}>+{habit.xp} XP</span>
                </div>
                {/* Consistency battery */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(233,230,242,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${consistencyPct}%`, background: completed ? 'var(--bt-success)' : statInfo.color }} />
                  </div>
                  <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--bt-text-muted)' }}>{consistencyPct}%</span>
                </div>
                {/* Week strip */}
                <div className="flex items-center gap-1 mb-2">
                  {weekDates.map((date, i) => {
                    const log = getLogForDate(habit.id, date);
                    const done = isHabitCompleted(habit, log);
                    const isToday = date === todayStr;
                    return (
                      <div key={date} className="flex flex-col items-center gap-0.5">
                        <span className="font-mono text-[8px]" style={{ color: 'var(--bt-text-muted)' }}>{dayLabels[i]}</span>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{
                          background: done ? 'var(--bt-success)' : isToday ? 'rgba(233,230,242,0.08)' : 'transparent',
                          border: isToday ? '1px solid var(--bt-success)' : '1px solid rgba(233,230,242,0.06)',
                          boxShadow: done ? '0 0 6px rgba(61,220,132,0.3)' : 'none'
                        }} aria-label={`${date}: ${done ? 'completed' : 'pending'}`}>
                          {done && <span className="text-[8px]">✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Actions — preset habits record through their instrument;
                     custom habits keep CHECK IN / EDIT exactly as before. */}
                {habit.preset ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {bestStreak > 0 && <span className="font-mono text-[9px]" style={{ color: 'var(--bt-text-muted)' }}>BEST {bestStreak} DAYS</span>}
                        {completed && log?.value !== undefined && (
                          <span className="font-mono text-[9px]" style={{ color: 'var(--bt-success)' }}>TODAY · {formatPresetValue(habit.type, log.value)}</span>
                        )}
                      </div>
                      <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded" style={{ color: 'var(--arcade-gold)', background: 'rgba(232,180,90,0.08)', border: '1px solid rgba(232,180,90,0.2)' }} title="Preset habits keep their identity — record values, never redefine the preset.">PRESET</span>
                    </div>
                    {habit.preset === 'mood' && <MoodInstrument habit={habit} log={log} />}
                    {habit.preset === 'water' && <WaterInstrument habit={habit} log={log} />}
                    {habit.preset === 'sleep' && <SleepInstrument habit={habit} log={log} />}
                    {habit.preset === 'reading' && <ReadingInstrument habit={habit} log={log} />}
                    {habit.preset === 'workout' && <WorkoutInstrument habit={habit} log={log} />}
                  </div>
                ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {bestStreak > 0 && <span className="font-mono text-[9px]" style={{ color: 'var(--bt-text-muted)' }}>BEST {bestStreak} DAYS</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {habit.type !== 'checkbox' && (
                      <button onClick={() => setDayEditor({ habitId: habit.id, date: todayStr })}
                        className="font-mono text-[10px] px-2 py-1 rounded cursor-pointer" style={{ color: 'var(--bt-text-muted)', border: '1px solid rgba(233,230,242,0.1)' }}>
                        EDIT
                      </button>
                    )}
                    <button onClick={() => handleCheckIn(habit)} disabled={completed}
                      className="font-mono text-[10px] font-bold px-3 py-1 rounded cursor-pointer transition disabled:opacity-40"
                      style={{ color: completed ? 'var(--bt-success)' : 'var(--obs-gold, #e8b45a)', background: completed ? 'rgba(61,220,132,0.1)' : 'rgba(232,180,90,0.1)', border: `1px solid ${completed ? 'rgba(61,220,132,0.2)' : 'rgba(232,180,90,0.2)'}` }}
                      aria-label={completed ? `${habit.name} already checked in` : `Check in ${habit.name}`}>
                      {completed ? '✓ DONE' : 'CHECK IN'}
                    </button>
                    <button onClick={() => requestDeleteHabit(habit)}
                      className="font-mono text-[10px] px-2 py-1 rounded cursor-pointer transition hover:!text-[var(--bt-danger)]"
                      style={{ color: 'var(--bt-text-muted)', border: '1px solid rgba(233,230,242,0.1)' }}
                      aria-label={`Delete ${habit.name}`}>
                      DEL
                    </button>
                  </div>
                </div>
                )}
              </div>
            );
          })}

          <PresetCatalog />

          {/* ─── SYSTEM ALERTS ─── */}
          {atRiskHabits.length > 0 && (
            <section aria-label="Streaks at risk">
              <TerminalText prompt>SYSTEM_ALERTS</TerminalText>
              <div className="mt-2 flex flex-col gap-1.5">
                {atRiskHabits.map(habit => {
                  const streak = calculateHabitStreak(habit, habitLogs);
                  return (
                    <div key={habit.id} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
                      <span className="text-sm" aria-hidden="true">⚠</span>
                      <span className="font-bold text-sm" style={{ color: 'var(--bt-danger)' }}>{habit.icon} {habit.name}</span>
                      <span className="font-mono text-[10px] flex-1" style={{ color: 'var(--bt-text-muted)' }}>{streak} day streak · Check in before midnight</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          WEEK VIEW
         ═══════════════════════════════════════════════════════════════════ */}
      {view === 'week' && (() => {
        // Deterministic weekly interpretation — no AI, pure counts
        const totalCells = activeHabits.length * 7;
        const completedCells = activeHabits.reduce((sum, h) => sum + weekDates.filter(d => isHabitCompleted(h, getLogForDate(h.id, d))).length, 0);
        const weekConsistency = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0;
        const habitWeekCounts = activeHabits.map(h => ({ habit: h, count: weekDates.filter(d => isHabitCompleted(h, getLogForDate(h.id, d))).length }))
          .sort((a, b) => b.count - a.count);
        const strongest = habitWeekCounts[0];
        const atRisk = [...habitWeekCounts].reverse().find(x => x.count < 4 && x.count < 7);
        return (
        <div className="flex flex-col gap-3">
          <div className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--bt-text-muted)' }}>WEEKLY_CONSISTENCY</div>
          {activeHabits.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]" style={{ color: 'var(--bt-text-muted)' }}>
              <span style={{ color: 'var(--bt-text)' }}>{weekConsistency}% CONSISTENCY</span>
              {strongest && <span>· STRONGEST: {strongest.habit.name} {strongest.count}/7</span>}
              {atRisk && <span style={{ color: 'var(--bt-danger)' }}>· AT RISK: {atRisk.habit.name} {atRisk.count}/7</span>}
            </div>
          )}
          {activeHabits.length === 0 ? (
            <SystemLabel tone="muted">No habits to show.</SystemLabel>
          ) : (
            <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'rgba(233,230,242,0.06)' }}>
              <div className="min-w-[520px]">
              <div className="grid gap-0" style={{ gridTemplateColumns: '140px repeat(7, 1fr)', borderBottom: '1px solid rgba(233,230,242,0.06)' }}>
                <div className="p-2 font-mono text-[10px] font-bold" style={{ color: 'var(--bt-text-muted)' }}>HABIT</div>
                {weekDates.map((d, i) => (
                  <div key={d} className="p-2 text-center font-mono text-[10px]" style={{ color: 'var(--bt-text-muted)' }}>{dayLabels[i]}</div>
                ))}
              </div>
              {/* Rows */}
              {activeHabits.map(habit => {
                return (
                  <div key={habit.id} className="grid gap-0" style={{ gridTemplateColumns: '140px repeat(7, 1fr)', borderBottom: '1px solid rgba(233,230,242,0.04)' }}>
                    <div className="p-2 flex items-center gap-1.5">
                      <span className="text-sm">{habit.icon}</span>
                      <span className="font-bold text-xs truncate" style={{ color: 'var(--bt-text)' }}>{habit.name}</span>
                    </div>
                    {weekDates.map(date => {
                      const log = getLogForDate(habit.id, date);
                      const done = isHabitCompleted(habit, log);
                      return (
                        <div key={date} className="p-2 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                            background: done ? 'var(--bt-success)' : 'rgba(233,230,242,0.05)',
                            boxShadow: done ? '0 0 6px rgba(61,220,132,0.3)' : 'none'
                          }} aria-label={`${habit.name} ${date}: ${done ? 'completed' : 'pending'}`}>
                            {done && <span className="text-[8px]">✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      )})()}


      {/* ═══════════════════════════════════════════════════════════════════
          HISTORY VIEW — CHARACTER GROWTH
         ═══════════════════════════════════════════════════════════════════ */}
      {view === 'history' && (
        <div className="flex flex-col gap-5">
          {/* Character Growth This Week */}
          <section>
            <TerminalText prompt>CHARACTER_GROWTH</TerminalText>
            <SystemLabel tone="muted">THIS WEEK</SystemLabel>
            <div className="mt-2 flex flex-col gap-2">
              {(Object.keys(STAT_LABELS) as StatType[]).map(stat => {
                const info = STAT_LABELS[stat];
                const impact = statImpact[stat];
                const maxVal = Math.max(...(Object.values(statImpact).map(v => v.totalXp)), 1);
                const pct = Math.round((impact.totalXp / maxVal) * 100);
                // Deterministic momentum: +N with zero => no activity, otherwise growing/steady from habit count
                const momentum = impact.totalXp === 0 ? '— no activity' : impact.count >= 2 ? '▲ growing' : '→ steady';
                return (
                  <div key={stat} className="flex items-center gap-3">
                    <PixelIcon name={info.icon as never} size={14} color={info.color} />
                    <span className="font-mono text-[10px] font-bold w-20" style={{ color: 'var(--bt-text)' }}>{info.label}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(233,230,242,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: info.color }} />
                    </div>
                    <span className="font-mono text-[10px] w-12 text-right" style={{ color: info.color }}>+{impact.totalXp}</span>
                    <span className="font-mono text-[9px] w-20 text-right" style={{ color: 'var(--bt-text-muted)' }}>{momentum}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* WHAT CHANGED — deterministic narrative from this week's statImpact */}
          {(() => {
            const ranked = (Object.keys(statImpact) as StatType[]).map(k => ({ stat: k, xp: statImpact[k].totalXp } as { stat: StatType; xp: number })).sort((a, b) => b.xp - a.xp);
            const top = ranked[0];
            const zeroStats = ranked.filter(r => r.xp === 0).map(r => r.stat.toUpperCase());
            const narrative = top.xp === 0
              ? 'No attribute activity recorded this week — check in to start building momentum.'
              : zeroStats.length > 0
                ? `${top.stat.toUpperCase()} is your strongest growth vector this week (+${top.xp} XP). ${zeroStats.join(', ')} ${zeroStats.length === 1 ? 'has' : 'have'} no recorded activity.`
                : `${top.stat.toUpperCase()} leads this week (+${top.xp} XP) — balanced progress across attributes.`;
            return (
              <section className="rounded-lg border p-3" style={{ background: 'rgba(233,230,242,0.03)', borderColor: 'rgba(233,230,242,0.06)' }}>
                <TerminalText prompt>WHAT_CHANGED</TerminalText>
                <p className="font-mono text-[11px] m-0 mt-2" style={{ color: 'var(--bt-text-dim)' }}>{narrative}</p>
              </section>
            );
          })()}

          {/* Most Influential — TERTIARY */}
          <section>
            <div className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--bt-text-disabled)' }}>MOST_INFLUENTIAL</div>
            <div className="mt-2 flex flex-col" style={{ borderTop: '1px solid rgba(233,230,242,0.06)' }}>
              {activeHabits
                .map(h => {
                  const habitWeekLogs = weekLogs.filter(l => l.habit_id === h.id && isHabitCompleted(h, l));
                  const totalXp = habitWeekLogs.reduce((sum, l) => sum + (l.xp_earned || 0), 0);
                  return { habit: h, totalXp };
                })
                .filter(x => x.totalXp > 0)
                .sort((a, b) => b.totalXp - a.totalXp)
                .slice(0, 5)
                .map(({ habit: h, totalXp }) => (
                  <div key={h.id} className="flex items-center gap-3 py-2 px-2" style={{ borderBottom: '1px solid rgba(233,230,242,0.04)' }}>
                    <span className="text-sm">{h.icon}</span>
                    <span className="font-bold text-sm flex-1" style={{ color: 'var(--bt-text)' }}>{h.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--obs-gold, #e8b45a)' }}>+{totalXp}</span>
                    <span className="font-mono text-[10px] uppercase" style={{ color: 'var(--bt-text-muted)' }}>{STAT_LABELS[h.stat].label}</span>
                  </div>
                ))
              }
            </div>
          </section>
        </div>
      )}

      {/* Day editor modal */}
      {dayEditor && (() => {
        const habit = habits.find(h => h.id === dayEditor.habitId);
        if (!habit) return null;
        return (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={() => setDayEditor(null)}>
            <div className="glass-strong rounded-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-sm m-0 mb-3" style={{ color: 'var(--bt-text)' }}>{habit.icon} {habit.name}</h3>
              <p className="font-mono text-[10px] m-0 mb-3" style={{ color: 'var(--bt-text-muted)' }}>Edit for {dayEditor.date}</p>
              {/* Type-specific editor placeholder */}
              <div className="flex gap-2">
                <button onClick={() => { setDayEditor(null); }} className="btn-ghost flex-1 !text-xs">Cancel</button>
                <button onClick={() => { handleCheckIn(habit); setDayEditor(null); }} className="insert-coin flex-1 !text-xs">Save</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
