import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { getTodayDateString, getCurrentWeekDates, isHabitCompleted } from '../lib/utils';
import { calculateHabitStreak } from '../services/habits/calculateHabitStreak';
import { UndoToast } from '../components/shared/UndoToast';
import { PresetCatalog } from '../components/habits/HabitInstruments';
import { HabitCard, STAT_LABELS } from '../components/habits/HabitCard';
import { EditHabitModal } from '../components/habits/EditHabitModal';
import { CreateHabitModal } from '../components/habits/CreateHabitModal';
import { PixelIcon, SystemLabel, TerminalText } from '../components/ui';
import type { Habit, StatType } from '../types';

type HabitView = 'today' | 'week' | 'history' | 'archived';

/**
 * Habits — Habit Engine.
 * "What I'm becoming through repetition."
 * REPEAT → STREAK → ATTRIBUTE XP → CHARACTER EVOLUTION
 */
export const Habits: React.FC = () => {
  const {
    habits,
    habitLogs,
    addHabit,
    updateHabit,
    archiveHabit,
    unarchiveHabit,
    deleteHabit,
    setHabitValue,
  } = useStore(
    useShallow((s) => ({
      habits: s.habits,
      habitLogs: s.habitLogs,
      addHabit: s.addHabit,
      updateHabit: s.updateHabit,
      archiveHabit: s.archiveHabit,
      unarchiveHabit: s.unarchiveHabit,
      deleteHabit: s.deleteHabit,
      setHabitValue: s.setHabitValue,
    }))
  );

  const todayStr = getTodayDateString();
  const weekDays = React.useMemo(() => getCurrentWeekDates(), []);
  const [view, setView] = useState<HabitView>('today');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Undo toast for delete
  const [pendingDelete, setPendingDelete] = useState<{ name: string; id: string } | null>(null);
  const deleteTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoDeleteHabit = useCallback(() => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDelete(null);
  }, []);
  const requestDeleteHabit = useCallback(
    (habit: Habit) => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      setPendingDelete({ name: habit.name, id: habit.id });
      deleteTimerRef.current = setTimeout(() => {
        void deleteHabit(habit.id);
        setPendingDelete(null);
      }, 5000);
    },
    [deleteHabit]
  );

  // XP floating toast
  const [floatingXPs, setFloatingXPs] = useState<{ id: number; xp: number; stat: string }[]>([]);
  const xpIdRef = React.useRef(0);
  const triggerXP = (xp: number, stat: string) => {
    const item = { id: ++xpIdRef.current, xp, stat };
    setFloatingXPs((prev) => [...prev, item]);
    setTimeout(() => {
      setFloatingXPs((prev) => prev.filter((p) => p.id !== item.id));
    }, 1000);
  };

  // Active / Archived partitioning
  const activeHabits = habits.filter((h) => !h.archived && h.active !== false);
  const archivedHabits = habits.filter((h) => h.archived || h.active === false);

  const todayLogs = habitLogs.filter((l) => l.date === todayStr);
  const completedToday = activeHabits.filter((h) => {
    const log = todayLogs.find((l) => l.habit_id === h.id);
    return isHabitCompleted(h, log);
  }).length;
  const activeStreaks = activeHabits.filter((h) => calculateHabitStreak(h, habitLogs) > 0).length;
  const consistencyPct = activeHabits.length > 0 ? Math.round((completedToday / activeHabits.length) * 100) : 0;

  // Character impact: attribute → habits mapping + XP earned this week (Mon-Sun)
  const weekStartStr = weekDays[0]?.date || todayStr;
  const weekEndStr = weekDays[6]?.date || todayStr;
  const weekLogs = habitLogs.filter((l) => l.date >= weekStartStr && l.date <= weekEndStr);

  const statImpact: Record<StatType, { totalXp: number; count: number }> = {
    discipline: { totalXp: 0, count: 0 },
    health: { totalXp: 0, count: 0 },
    knowledge: { totalXp: 0, count: 0 },
    creativity: { totalXp: 0, count: 0 },
    career: { totalXp: 0, count: 0 },
  };

  activeHabits.forEach((h) => {
    const habitWeekLogs = weekLogs.filter((l) => l.habit_id === h.id && isHabitCompleted(h, l));
    if (habitWeekLogs.length > 0) {
      statImpact[h.stat].totalXp += habitWeekLogs.reduce((sum, l) => sum + (l.xp_earned || 0), 0);
      statImpact[h.stat].count++;
    }
  });

  // At-risk habits (active habit with streak > 0 not completed today)
  const atRiskHabits = activeHabits.filter((h) => {
    const streak = calculateHabitStreak(h, habitLogs);
    if (streak === 0) return false;
    const log = todayLogs.find((l) => l.habit_id === h.id);
    return !isHabitCompleted(h, log);
  });

  // Helper: record value
  const handleRecord = (habit: Habit, date: string, value: number | string) => {
    setHabitValue(habit.id, date, value);
    if (value && value !== '' && value !== 0) {
      triggerXP(habit.xp, habit.stat);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-5 md:pb-48 pb-20">
      {/* Floating XP */}
      {floatingXPs.map((item) => (
        <div
          key={item.id}
          className="fixed z-30 pointer-events-none animate-fade-in"
          style={{ left: '50%', top: '20%', transform: 'translate(-50%, -50%)' }}
        >
          <span className="font-mono text-lg font-bold" style={{ color: 'var(--obs-gold, #e8b45a)' }}>
            +{item.xp} {item.stat.toUpperCase()}
          </span>
        </div>
      ))}

      {pendingDelete && (
        <UndoToast message={`"${pendingDelete.name}" removed — tap Undo to restore`} onUndo={undoDeleteHabit} />
      )}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <TerminalText tone="primary" prompt>
            HABIT_ENGINE
          </TerminalText>
          <SystemLabel tone="muted">
            {activeHabits.length} TRACKED · {activeStreaks} ACTIVE STREAKS · {consistencyPct}% CONSISTENCY
          </SystemLabel>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="insert-coin !text-xs px-3.5 py-2 font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span>
            <span>CREATE HABIT</span>
          </button>
        </div>
      </div>

      {/* ─── CHARACTER IMPACT ─── */}
      <section aria-label="Character impact">
        <TerminalText prompt>CHARACTER_IMPACT</TerminalText>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(STAT_LABELS) as StatType[]).map((stat) => {
            const info = STAT_LABELS[stat];
            const impact = statImpact[stat];
            const isZero = impact.totalXp === 0;
            return (
              <div
                key={stat}
                className={`rounded-xl border p-3 text-center transition ${isZero ? 'opacity-40' : ''}`}
                style={{
                  background: 'rgba(233,230,242,0.02)',
                  borderColor: 'rgba(233,230,242,0.06)',
                }}
              >
                <div className="flex justify-center mb-1">
                  <PixelIcon name={info.icon as never} size={16} color={isZero ? 'var(--bt-text-disabled)' : info.color} />
                </div>
                <div className="font-mono text-[10px] font-bold" style={{ color: 'var(--bt-text)' }}>
                  {info.label}
                </div>
                <div className="font-mono text-sm font-bold mt-0.5" style={{ color: isZero ? 'var(--bt-text-muted)' : info.color }}>
                  +{impact.totalXp} XP
                </div>
                <div className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--bt-text-muted)' }}>
                  {impact.count} habit{impact.count !== 1 ? 's' : ''} active
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── VIEW TABS ─── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5" role="tablist">
          {(['today', 'week', 'history', 'archived'] as const).map((v) => {
            if (v === 'archived' && archivedHabits.length === 0) return null;
            return (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`chip cursor-pointer font-mono text-[10px] uppercase ${view === v ? 'chip--aurora' : ''}`}
              >
                {v === 'archived' ? `ARCHIVED (${archivedHabits.length})` : v}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TODAY VIEW
         ═══════════════════════════════════════════════════════════════════ */}
      {view === 'today' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start" data-tour="habit-list">
            {activeHabits.length === 0 ? (
              <div
                className="col-span-full rounded-2xl border p-10 text-center flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(233,230,242,0.02)', borderColor: 'rgba(233,230,242,0.06)' }}
              >
                <PixelIcon name="fire" size={36} color="var(--bt-text-disabled)" />
                <div className="font-bold text-base" style={{ color: 'var(--bt-text)' }}>
                  No habits tracked yet
                </div>
                <SystemLabel tone="muted" className="max-w-md">
                  Add a preset habit below or create your custom habit protocol to start building consistency and earning character XP.
                </SystemLabel>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="insert-coin !text-xs px-4 py-2 mt-2 font-mono uppercase font-bold"
                >
                  + Create Your First Habit
                </button>
              </div>
            ) : (
              activeHabits.map((habit) => {
                const log = todayLogs.find((l) => l.habit_id === habit.id);
                return (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    log={log}
                    habitLogs={habitLogs}
                    weekDays={weekDays}
                    todayStr={todayStr}
                    onRecord={handleRecord}
                    onEdit={(h) => setEditingHabit(h)}
                    onDelete={requestDeleteHabit}
                    onArchive={(h) => archiveHabit(h.id)}
                  />
                );
              })
            )}
          </div>

          {/* Preset Catalog */}
          <PresetCatalog />

          {/* ─── SYSTEM ALERTS ─── */}
          {atRiskHabits.length > 0 && (
            <section aria-label="Streaks at risk">
              <TerminalText prompt>SYSTEM_ALERTS</TerminalText>
              <div className="mt-2 flex flex-col gap-1.5">
                {atRiskHabits.map((habit) => {
                  const streak = calculateHabitStreak(habit, habitLogs);
                  return (
                    <div
                      key={habit.id}
                      className="flex items-center gap-3 py-2 px-3 rounded-xl"
                      style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}
                    >
                      <span className="text-sm" aria-hidden="true">
                        ⚠
                      </span>
                      <span className="font-bold text-sm" style={{ color: 'var(--bt-danger)' }}>
                        {habit.icon} {habit.name}
                      </span>
                      <span className="font-mono text-[10px] flex-1" style={{ color: 'var(--bt-text-muted)' }}>
                        {streak} day streak · Check in before midnight
                      </span>
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
        const totalCells = activeHabits.length * 7;
        const completedCells = activeHabits.reduce(
          (sum, h) =>
            sum +
            weekDays.filter((d) => {
              const l = habitLogs.find((entry) => entry.habit_id === h.id && entry.date === d.date);
              return isHabitCompleted(h, l);
            }).length,
          0
        );
        const weekConsistency = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0;
        const habitWeekCounts = activeHabits
          .map((h) => ({
            habit: h,
            count: weekDays.filter((d) => {
              const l = habitLogs.find((entry) => entry.habit_id === h.id && entry.date === d.date);
              return isHabitCompleted(h, l);
            }).length,
          }))
          .sort((a, b) => b.count - a.count);
        const strongest = habitWeekCounts[0];
        const atRisk = [...habitWeekCounts].reverse().find((x) => x.count < 4 && x.count < 7);

        return (
          <div className="flex flex-col gap-3">
            <div className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--bt-text-muted)' }}>
              WEEKLY_CONSISTENCY ({weekDays[0]?.dayLabel} {weekDays[0]?.dayNumber} – {weekDays[6]?.dayLabel} {weekDays[6]?.dayNumber})
            </div>
            {activeHabits.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]" style={{ color: 'var(--bt-text-muted)' }}>
                <span style={{ color: 'var(--bt-text)' }}>{weekConsistency}% CONSISTENCY</span>
                {strongest && <span>· STRONGEST: {strongest.habit.name} {strongest.count}/7</span>}
                {atRisk && <span style={{ color: 'var(--bt-danger)' }}>· AT RISK: {atRisk.habit.name} {atRisk.count}/7</span>}
              </div>
            )}
            {activeHabits.length === 0 ? (
              <SystemLabel tone="muted">No active habits to show.</SystemLabel>
            ) : (
              <div className="rounded-xl border overflow-x-auto" style={{ borderColor: 'rgba(233,230,242,0.06)' }}>
                <div className="min-w-[560px]">
                  <div
                    className="grid gap-0"
                    style={{ gridTemplateColumns: '180px repeat(7, 1fr)', borderBottom: '1px solid rgba(233,230,242,0.06)' }}
                  >
                    <div className="p-3 font-mono text-[10px] font-bold" style={{ color: 'var(--bt-text-muted)' }}>
                      HABIT
                    </div>
                    {weekDays.map((d) => (
                      <div
                        key={d.date}
                        className="p-3 text-center font-mono text-[10px]"
                        style={{ color: d.isToday ? 'var(--bt-text)' : 'var(--bt-text-muted)' }}
                      >
                        <div>{d.dayLabel}</div>
                        <div className="text-[9px] opacity-70">{d.dayNumber}</div>
                      </div>
                    ))}
                  </div>
                  {/* Rows */}
                  {activeHabits.map((habit) => {
                    return (
                      <div
                        key={habit.id}
                        className="grid gap-0 items-center"
                        style={{ gridTemplateColumns: '180px repeat(7, 1fr)', borderBottom: '1px solid rgba(233,230,242,0.04)' }}
                      >
                        <div className="p-3 flex items-center gap-2">
                          <span className="text-base">{habit.icon}</span>
                          <span className="font-bold text-xs truncate" style={{ color: 'var(--bt-text)' }}>
                            {habit.name}
                          </span>
                        </div>
                        {weekDays.map((day) => {
                          const log = habitLogs.find((l) => l.habit_id === habit.id && l.date === day.date);
                          const done = isHabitCompleted(habit, log);
                          return (
                            <div key={day.date} className="p-2.5 flex items-center justify-center">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] transition"
                                style={{
                                  background: done ? 'var(--bt-success)' : 'rgba(233,230,242,0.04)',
                                  color: done ? '#000' : 'var(--bt-text-disabled)',
                                  border: day.isToday ? '1px solid var(--bt-success)' : '1px solid rgba(233,230,242,0.06)',
                                  boxShadow: done ? '0 0 8px rgba(61,220,132,0.35)' : 'none',
                                }}
                                aria-label={`${habit.name} ${day.date}: ${done ? 'completed' : 'pending'}`}
                              >
                                {done && '✓'}
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
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════
          HISTORY VIEW — CHARACTER GROWTH
         ═══════════════════════════════════════════════════════════════════ */}
      {view === 'history' && (
        <div className="flex flex-col gap-5">
          <section>
            <TerminalText prompt>CHARACTER_GROWTH</TerminalText>
            <SystemLabel tone="muted">THIS WEEK ({weekDays[0]?.dayLabel} {weekDays[0]?.dayNumber} – {weekDays[6]?.dayLabel} {weekDays[6]?.dayNumber})</SystemLabel>
            <div className="mt-2 flex flex-col gap-2">
              {(Object.keys(STAT_LABELS) as StatType[]).map((stat) => {
                const info = STAT_LABELS[stat];
                const impact = statImpact[stat];
                const maxVal = Math.max(...Object.values(statImpact).map((v) => v.totalXp), 1);
                const pct = Math.round((impact.totalXp / maxVal) * 100);
                const momentum = impact.totalXp === 0 ? '— no activity' : impact.count >= 2 ? '▲ growing' : '→ steady';
                return (
                  <div key={stat} className="flex items-center gap-3">
                    <PixelIcon name={info.icon as never} size={14} color={info.color} />
                    <span className="font-mono text-[10px] font-bold w-24" style={{ color: 'var(--bt-text)' }}>
                      {info.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(233,230,242,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: info.color }} />
                    </div>
                    <span className="font-mono text-[10px] w-14 text-right" style={{ color: info.color }}>
                      +{impact.totalXp} XP
                    </span>
                    <span className="font-mono text-[9px] w-20 text-right" style={{ color: 'var(--bt-text-muted)' }}>
                      {momentum}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* WHAT CHANGED — narrative */}
          {(() => {
            const ranked = (Object.keys(statImpact) as StatType[])
              .map((k) => ({ stat: k, xp: statImpact[k].totalXp } as { stat: StatType; xp: number }))
              .sort((a, b) => b.xp - a.xp);
            const top = ranked[0];
            const zeroStats = ranked.filter((r) => r.xp === 0).map((r) => r.stat.toUpperCase());
            const narrative =
              top.xp === 0
                ? 'No attribute activity recorded this week — check in to start building momentum.'
                : zeroStats.length > 0
                ? `${top.stat.toUpperCase()} is your strongest growth vector this week (+${top.xp} XP). ${zeroStats.join(', ')} ${zeroStats.length === 1 ? 'has' : 'have'} no recorded activity.`
                : `${top.stat.toUpperCase()} leads this week (+${top.xp} XP) — balanced progress across attributes.`;
            return (
              <section className="rounded-xl border p-4" style={{ background: 'rgba(233,230,242,0.02)', borderColor: 'rgba(233,230,242,0.06)' }}>
                <TerminalText prompt>WHAT_CHANGED</TerminalText>
                <p className="font-mono text-[11px] m-0 mt-2" style={{ color: 'var(--bt-text-dim)' }}>
                  {narrative}
                </p>
              </section>
            );
          })()}

          {/* Most Influential */}
          <section>
            <div className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--bt-text-disabled)' }}>
              MOST_INFLUENTIAL_HABITS
            </div>
            <div className="mt-2 flex flex-col" style={{ borderTop: '1px solid rgba(233,230,242,0.06)' }}>
              {activeHabits
                .map((h) => {
                  const habitWeekLogs = weekLogs.filter((l) => l.habit_id === h.id && isHabitCompleted(h, l));
                  const totalXp = habitWeekLogs.reduce((sum, l) => sum + (l.xp_earned || 0), 0);
                  return { habit: h, totalXp };
                })
                .filter((x) => x.totalXp > 0)
                .sort((a, b) => b.totalXp - a.totalXp)
                .slice(0, 5)
                .map(({ habit: h, totalXp }) => (
                  <div key={h.id} className="flex items-center gap-3 py-2.5 px-2" style={{ borderBottom: '1px solid rgba(233,230,242,0.04)' }}>
                    <span className="text-sm">{h.icon}</span>
                    <span className="font-bold text-sm flex-1" style={{ color: 'var(--bt-text)' }}>
                      {h.name}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--obs-gold, #e8b45a)' }}>
                      +{totalXp} XP
                    </span>
                    <span className="font-mono text-[10px] uppercase" style={{ color: 'var(--bt-text-muted)' }}>
                      {STAT_LABELS[h.stat]?.label || h.stat}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ARCHIVED VIEW
         ═══════════════════════════════════════════════════════════════════ */}
      {view === 'archived' && (
        <div className="flex flex-col gap-4">
          <SystemLabel tone="muted">
            Archived habits preserve all historical logs, XP, and streaks. You can restore them anytime.
          </SystemLabel>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {archivedHabits.map((habit) => (
              <div
                key={habit.id}
                className="rounded-2xl border p-4 flex items-center justify-between gap-3 opacity-75"
                style={{ background: 'rgba(233,230,242,0.02)', borderColor: 'rgba(233,230,242,0.06)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{habit.icon}</span>
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--bt-text)' }}>
                      {habit.name}
                    </div>
                    <div className="font-mono text-[10px]" style={{ color: 'var(--bt-text-muted)' }}>
                      +{habit.xp} XP · {STAT_LABELS[habit.stat]?.label || habit.stat}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => unarchiveHabit(habit.id)}
                    className="font-mono text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition border hover:bg-[rgba(61,220,132,0.1)] hover:!text-[var(--bt-success)]"
                    style={{ color: 'var(--bt-text-muted)', borderColor: 'rgba(233,230,242,0.1)' }}
                  >
                    RESTORE
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteHabit(habit)}
                    className="font-mono text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition border hover:bg-[rgba(248,113,113,0.1)] hover:!text-[var(--bt-danger)]"
                    style={{ color: 'var(--bt-text-muted)', borderColor: 'rgba(233,230,242,0.1)' }}
                  >
                    DELETE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Habit Modal */}
      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          isOpen={true}
          onClose={() => setEditingHabit(null)}
          onSave={(updates) => updateHabit(editingHabit.id, updates)}
          onArchive={() => (editingHabit.archived ? unarchiveHabit(editingHabit.id) : archiveHabit(editingHabit.id))}
        />
      )}

      {/* Create Habit Modal */}
      <CreateHabitModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={(habit) => addHabit(habit)}
      />
    </div>
  );
};
