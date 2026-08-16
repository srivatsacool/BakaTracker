import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { getTodayDateString, isHabitCompleted, getDaysInCurrentMonth } from '../lib/utils';
import { calculateHabitStreak, calculateBestStreak } from '../services/habits/calculateHabitStreak';
import { Plus, Trash2, RefreshCw, Activity, Calendar } from 'lucide-react';
import { UndoToast } from '../components/shared/UndoToast';
import type { Habit, HabitType, StatType } from '../types';

/**
 * Habits — the consistency instrument. Five tracker types, streaks as
 * battery-backed memory, XP per check-in, floating score ticks.
 */
export const Habits: React.FC = () => {
  const {
    habits,
    habitLogs,
    currentQuote,
    stats,
    toggleHabit,
    incrementCounterHabit,
    setNumericHabit,
    setMoodHabit,
    setEnergyHabit,
    addHabit,
    deleteHabit,
    refreshQuote
  } = useStore();

  const todayStr = getTodayDateString();

  const getLast5Days = (): { date: string; label: string }[] => {
    const days = [];
    const d = new Date();
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setDate(d.getDate() - i);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'narrow' });
      days.push({ date: dateStr, label: dayLabel });
    }
    return days;
  };

  const [viewMode, setViewMode] = useState<'today' | 'month'>('today');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<HabitType>('checkbox');
  const [newHabitIcon, setNewHabitIcon] = useState('💪');
  const [newHabitXP, setNewHabitXP] = useState(5);
  const [newHabitStat, setNewHabitStat] = useState<StatType>('health');

  // Micro-interactions state
  interface FloatingXP {
    id: number;
    xp: number;
    statName: string;
    x: number;
    y: number;
  }
  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const prevLevelRef = useRef(stats.level);

  // Undo-toast for habit delete
  const [pendingDelete, setPendingDelete] = useState<{ habit: typeof habits[0] } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteHabit = useCallback((habit: typeof habits[0]) => {
    // Cancel any pending delete
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDelete({ habit });
    deleteTimerRef.current = setTimeout(() => {
      deleteHabit(habit.id);
      setPendingDelete(null);
    }, 5000);
  }, [deleteHabit]);

  const undoDeleteHabit = useCallback(() => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDelete(null);
  }, []);

  const triggerFloatingXP = (e: React.MouseEvent | React.FocusEvent | null, xp: number, statName: string) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (e && 'clientX' in e && e.clientX) {
      x = e.clientX;
      y = e.clientY;
    } else if (e && e.currentTarget) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    const newXP = {
      id: Date.now() + Math.random(),
      xp,
      statName,
      x,
      y
    };
    setFloatingXPs(prev => [...prev, newXP]);
    setTimeout(() => {
      setFloatingXPs(prev => prev.filter(item => item.id !== newXP.id));
    }, 1000);
  };

  // Level up — the HIGH SCORE moment
  useEffect(() => {
    if (stats.level > prevLevelRef.current) {
      setShowLevelUpModal(true);
      setTimeout(() => setShowLevelUpModal(false), 2600);
    }
    prevLevelRef.current = stats.level;
  }, [stats.level]);

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    addHabit({
      name: newHabitName,
      type: newHabitType,
      icon: newHabitIcon,
      xp: Number(newHabitXP) || 5,
      stat: newHabitStat
    });

    setNewHabitName('');
    setShowAddForm(false);
  };

  const statConfig = [
    { name: 'Discipline', icon: '⚔️', value: stats.discipline, barColor: 'var(--arcade-magenta)' },
    { name: 'Health', icon: '💪', value: stats.health, barColor: 'var(--arcade-green)' },
    { name: 'Knowledge', icon: '🧠', value: stats.knowledge, barColor: 'var(--arcade-cobalt)' },
    { name: 'Creativity', icon: '🎨', value: stats.creativity, barColor: 'var(--arcade-red)' },
    { name: 'Career', icon: '💼', value: stats.career, barColor: 'var(--arcade-gold)' }
  ];

  // Stat-tone stroke colors — the existing bar grammar, reused for the
  // weekly progress rings so the rhythm readout matches each habit's stat.
  const statColor: Record<StatType, string> = {
    discipline: 'var(--arcade-magenta)',
    health: 'var(--arcade-green)',
    knowledge: 'var(--arcade-cobalt)',
    creativity: 'var(--arcade-red)',
    career: 'var(--arcade-gold)'
  };

  // Calendar-week progress (Monday start, matching the store's week model):
  // completed days ÷ days elapsed so far this week. Honest — never counts
  // days that haven't happened yet.
  const getWeekProgress = (habit: Habit) => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now);
    weekStart.setDate(diff);
    const daysElapsed = Math.floor((now.getTime() - weekStart.getTime()) / 86400000) + 1;
    let done = 0;
    for (let i = 0; i < daysElapsed; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const log = habitLogs.find(l => l.habit_id === habit.id && l.date === dateStr);
      if (isHabitCompleted(habit, log)) done += 1;
    }
    return { done, daysElapsed };
  };

  const getLogForToday = (habitId: string) => {
    return habitLogs.find(l => l.habit_id === habitId && l.date === todayStr);
  };

  const daysInMonth = getDaysInCurrentMonth();

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 relative">
      {/* Floating XP Elements */}
      {floatingXPs.map(item => (
        <div
          key={item.id}
          className="float-xp"
          style={{ left: `${item.x}px`, top: `${item.y}px`, transform: 'translate(-50%, -50%)' }}
        >
          +{item.xp} {item.statName.toUpperCase()} XP
        </div>
      ))}

      {/* Level Up Modal — HIGH SCORE moment */}
      {showLevelUpModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none">
          <div className="cabinet cabinet--highscore animate-fade-in px-8 py-6 text-center" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
            <div className="cabinet-marquee">
              <span className="cabinet-led" aria-hidden="true" />
              <span className="cabinet-marquee-title">HIGH SCORE</span>
            </div>
            <div className="cabinet-screen">
              <h3 className="marquee-title m-0" style={{ fontSize: '1.6rem', color: 'var(--arcade-gold)' }}>LEVEL {stats.level}!</h3>
              <p className="m-0 mt-2 font-mono text-xs" style={{ color: 'var(--arcade-paper-dim)' }}>New high score on the board. Keep playing.</p>
            </div>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
        <div>
          <h2 className="marquee-title text-2xl sm:text-3xl m-0" style={{ color: 'var(--arcade-paper)' }}>Habits</h2>
          <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>
            The save file — streaks are battery-backed memory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--obs-glass-12)' }} role="group" aria-label="View mode">
            <button
              type="button"
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 font-mono text-[10px] font-bold cursor-pointer transition ${viewMode === 'today' ? 'chip chip--teal' : 'chip'}`}
            >
              <Activity className="w-3 h-3 inline mr-1" aria-hidden="true" /> Today
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 font-mono text-[10px] font-bold cursor-pointer transition ${viewMode === 'month' ? 'chip chip--cobalt' : 'chip'}`}
            >
              <Calendar className="w-3 h-3 inline mr-1" aria-hidden="true" /> Month
            </button>
          </div>
          <button type="button" id="add-habit-btn" onClick={() => setShowAddForm(s => !s)} className="insert-coin !py-2 !px-3 !text-xs">
            <Plus className="w-4 h-4" aria-hidden="true" /> <span>Habit</span>
          </button>
        </div>
      </div>

      {/* Add Habit Form */}
      {showAddForm && (
        <form onSubmit={handleAddHabit} className="cabinet cabinet--playing animate-fade-in z-10" style={{ '--marquee-color': 'var(--arcade-green)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">New instrument</span>
          </div>
          <div className="cabinet-screen !p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Name</label>
              <input value={newHabitName} onChange={e => setNewHabitName(e.target.value)} placeholder="e.g. Morning workout" className="arcade-input !py-2 !text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Type</label>
              <select value={newHabitType} onChange={e => setNewHabitType(e.target.value as HabitType)} className="arcade-input !py-2 !text-sm">
                <option value="checkbox">Checkbox</option>
                <option value="counter">Counter</option>
                <option value="numeric">Numeric</option>
                <option value="mood">Mood</option>
                <option value="energy">Energy</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Icon</label>
              <input value={newHabitIcon} onChange={e => setNewHabitIcon(e.target.value)} maxLength={2} className="arcade-input !py-2 !text-sm text-center" aria-label="Habit icon emoji" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>XP</label>
              <input type="number" value={newHabitXP} onChange={e => setNewHabitXP(Number(e.target.value))} min={1} className="arcade-input !py-2 !text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Stat</label>
              <select value={newHabitStat} onChange={e => setNewHabitStat(e.target.value as StatType)} className="arcade-input !py-2 !text-sm">
                <option value="health">Health</option>
                <option value="discipline">Discipline</option>
                <option value="knowledge">Knowledge</option>
                <option value="creativity">Creativity</option>
                <option value="career">Career</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost !text-xs">Cancel</button>
              <button type="submit" disabled={!newHabitName.trim()} className="insert-coin !py-2 !px-4 !text-xs">
                <span className="coin-slot" aria-hidden="true" /> Start tracking
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Quote strip */}
      {currentQuote && (
        <div className="cabinet cabinet--attract z-10" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Quote of the day</span>
            <button type="button" onClick={refreshQuote} className="icon-button icon-button-small !ml-auto" aria-label="Refresh quote" title="Refresh quote">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="cabinet-screen !py-3 flex items-center justify-between gap-3">
            <p className="m-0 text-sm italic" style={{ color: 'var(--arcade-paper-dim)' }}>“{currentQuote.quote}”</p>
            <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--arcade-paper-muted)' }}>— {currentQuote.author}</span>
          </div>
        </div>
      )}

      {/* Habit List */}
      <div id="habit-list-container" className="flex flex-col gap-3 z-10">
        {habits.length === 0 ? (
          <div className="attract-state">
            <span className="text-4xl" aria-hidden="true">🎮</span>
            <div className="attract-dots" aria-hidden="true"><span /><span /><span /></div>
            <h3>No cabinets installed</h3>
            <p>Add your first habit — a checkbox, counter, numeric, mood, or energy tracker. Each one earns XP and builds a stat.</p>
            <button type="button" onClick={() => setShowAddForm(true)} className="insert-coin mt-2">
              <Plus className="w-4 h-4" aria-hidden="true" /> <span>Add your first habit</span>
            </button>
          </div>
        ) : (
          <>
            {/* Stat bars — the character status panel */}
            <div className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-cobalt)' } as React.CSSProperties}>
              <div className="cabinet-marquee">
                <span className="cabinet-led" aria-hidden="true" />
                <span className="cabinet-marquee-title">Character status</span>
                <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-gold)' }}>LVL {stats.level}</span>
              </div>
              <div className="cabinet-screen !p-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
                {statConfig.map(stat => (
                  <div key={stat.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold" style={{ color: 'var(--arcade-paper-dim)' }}>{stat.icon} {stat.name}</span>
                      <span className="font-mono text-[10px] score-readout" style={{ color: stat.barColor }}>{stat.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--obs-glass-8)' }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (stat.value / 200) * 100)}%`, background: stat.barColor, boxShadow: `0 0 8px ${stat.barColor}` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {habits.map(habit => {
              const log = getLogForToday(habit.id);
              const streak = calculateHabitStreak(habit, habitLogs);
              const bestStreak = calculateBestStreak(habit, habitLogs);
              const { done: weekDone, daysElapsed: weekElapsed } = getWeekProgress(habit);
              const isCompleted = isHabitCompleted(habit, log);
              const last5 = getLast5Days();

              return (
                <div key={habit.id} className="cabinet cabinet--playing" style={{ '--marquee-color': 'var(--arcade-green)' } as React.CSSProperties}>
                  <div className="cabinet-marquee">
                    <span className="cabinet-led" aria-hidden="true" />
                    <span className="cabinet-marquee-title min-w-0 truncate">{habit.icon} {habit.name}</span>
                    <span className="ml-auto flex items-center gap-2 shrink-0">
                      {/* Weekly rhythm ring — stat-tone stroke, days done this week */}
                      <div
                        className="progress-ring"
                        role="img"
                        aria-label={`${weekDone} of ${weekElapsed} days completed this week`}
                        title={`${weekDone}/${weekElapsed} days this week`}
                        style={{ '--ring-progress': weekElapsed > 0 ? weekDone / weekElapsed : 0, '--ring-color': statColor[habit.stat] } as React.CSSProperties}
                      >
                        <span>{weekDone}</span>
                      </div>
                      <span className="font-mono text-[9px]" style={{ color: 'var(--arcade-paper-disabled)' }} title={`Longest streak ever: ${bestStreak} days`}>
                        best {bestStreak}
                      </span>
                      <span className={`font-mono text-[10px] chip ${streak >= 7 ? 'chip--aurora' : isCompleted ? 'chip--teal' : ''}`}>
                        🔥 {streak} streak
                      </span>
                    </span>
                  </div>
                  <div className="cabinet-screen !p-4">
                    {/* Habit Controls — by type */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 flex items-center gap-2">
                        {habit.type === 'checkbox' && (
                          <button
                            type="button"
                            onClick={(e) => { toggleHabit(habit.id, todayStr); if (!isCompleted) triggerFloatingXP(e, habit.xp, habit.stat); }}
                            className={`insert-coin !py-2 !px-4 !text-xs ${isCompleted ? '!bg-arcade-green !border-arcade-green' : ''}`}
                            aria-pressed={isCompleted}
                          >
                            <span className="coin-slot" aria-hidden="true" />
                            {isCompleted ? 'Checked in' : 'Check in'}
                          </button>
                        )}
                        {habit.type === 'counter' && (
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { incrementCounterHabit(habit.id, todayStr, -1); }} className="btn-ghost !py-1.5 !px-3" aria-label={`Decrease ${habit.name}`}>−</button>
                            <span className="score-readout text-lg min-w-[3ch] text-center" style={{ color: 'var(--arcade-gold)' }}>{Number(log?.value) || 0}</span>
                            <button type="button" onClick={(e) => { incrementCounterHabit(habit.id, todayStr, 1); triggerFloatingXP(e, habit.xp, habit.stat); }} className="btn-ghost !py-1.5 !px-3" aria-label={`Increase ${habit.name}`}>+</button>
                          </div>
                        )}
                        {habit.type === 'numeric' && (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>Value</span>
                            <input
                              type="number"
                              value={Number(log?.value) || ''}
                              onChange={e => setNumericHabit(habit.id, todayStr, Number(e.target.value) || 0)}
                              className="arcade-input !py-1.5 !w-24 !text-sm"
                              placeholder="0"
                              aria-label={`${habit.name} value`}
                            />
                          </div>
                        )}
                        {habit.type === 'mood' && (
                          <div className="flex gap-1.5" role="group" aria-label={`${habit.name} mood`}>
                            {['😞', '😐', '🙂', '😄'].map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={(e) => { const isCurrent = log?.value === emoji; setMoodHabit(habit.id, todayStr, isCurrent ? '' : emoji); if (!isCurrent) triggerFloatingXP(e, habit.xp, habit.stat); }}
                                className={`w-10 h-10 rounded-lg text-lg cursor-pointer transition hover:scale-110 ${log?.value === emoji ? 'chip chip--magenta' : 'chip'}`}
                                aria-label={`Set mood to ${emoji}`}
                                aria-pressed={log?.value === emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                        {habit.type === 'energy' && (
                          <div className="flex gap-1.5" role="group" aria-label={`${habit.name} energy level`}>
                            {['low', 'med', 'high'].map(level => (
                              <button
                                key={level}
                                type="button"
                                onClick={(e) => { const isCurrent = log?.value === level; setEnergyHabit(habit.id, todayStr, isCurrent ? '' : level); if (!isCurrent) triggerFloatingXP(e, habit.xp, habit.stat); }}
                                className={`px-3 py-2 rounded-lg text-xs font-bold font-mono cursor-pointer transition hover:scale-105 uppercase ${log?.value === level ? 'chip chip--aurora' : 'chip'}`}
                                aria-label={`Set energy to ${level}`}
                                aria-pressed={log?.value === level}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] chip" style={{ color: 'var(--arcade-gold)' }}>+{habit.xp} XP</span>
                        <span className="font-mono text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>{habit.stat}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteHabit(habit)}
                          className="icon-button icon-button-small hover:!text-danger"
                          aria-label={`Delete ${habit.name}`}
                          title="Delete habit"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Week strip */}
                    <div className="mt-3 pt-3 flex items-end gap-1.5" style={{ borderTop: '1px solid var(--obs-glass-7)' }} aria-label="Last 5 days">
                      {last5.map(day => {
                        const dayLog = habitLogs.find(l => l.habit_id === habit.id && l.date === day.date);
                        const done = isHabitCompleted(habit, dayLog);
                        return (
                          <button
                            key={day.date}
                            type="button"
                            onClick={() => toggleHabit(habit.id, day.date)}
                            className="flex-1 flex flex-col items-center gap-1 rounded-md py-1.5 cursor-pointer transition hover:scale-105"
                            style={{ background: done ? 'rgba(61,220,132,0.1)' : 'rgba(242,242,242,0.03)', border: `1px solid ${done ? 'rgba(61,220,132,0.3)' : 'var(--obs-glass-7)'}` }}
                            aria-label={`Toggle ${habit.name} on ${day.date}`}
                            aria-pressed={done}
                          >
                            <span className="font-mono text-[9px]" style={{ color: done ? 'var(--arcade-green)' : 'var(--arcade-paper-muted)' }}>{day.label}</span>
                            <span className="w-4 h-4 rounded-sm" style={{ background: done ? 'var(--arcade-green)' : 'transparent', border: done ? 'none' : '1px solid rgba(242,242,242,0.2)', boxShadow: done ? '0 0 6px var(--arcade-green)' : 'none' }} aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Undo toast for deletes */}
      {pendingDelete && (
        <UndoToast
          message={`"${pendingDelete.habit.name}" removing — tap Undo to keep`}
          onUndo={undoDeleteHabit}
        />
      )}

      {/* Month view */}
      {viewMode === 'month' && habits.length > 0 && (
        <div className="cabinet cabinet--off z-10" style={{ '--marquee-color': 'var(--arcade-cobalt)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Month grid</span>
          </div>
          <div className="cabinet-screen !p-4">
            <div className="grid grid-cols-7 gap-1.5">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i} className="text-center font-mono text-[9px]" style={{ color: 'var(--arcade-paper-disabled)' }}>{d}</span>
              ))}
              {daysInMonth.map(dateStr => {
                const isToday = dateStr === todayStr;
                const completedCount = habits.filter(h => isHabitCompleted(h, habitLogs.find(l => l.habit_id === h.id && l.date === dateStr))).length;
                const pct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
                return (
                  <div
                    key={dateStr}
                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-mono font-bold cursor-default ${isToday ? 'chip chip--aurora' : ''}`}
                    style={{
                      background: pct >= 80 ? 'rgba(61,220,132,0.25)' : pct >= 40 ? 'rgba(139, 92, 246,0.18)' : pct > 0 ? 'rgba(63,123,255,0.14)' : 'rgba(242,242,242,0.03)',
                      border: `1px solid ${isToday ? 'rgba(139, 92, 246,0.5)' : 'rgba(242,242,242,0.06)'}`,
                      boxShadow: isToday ? '0 0 10px rgba(139, 92, 246,0.25)' : 'none',
                      color: isToday ? 'var(--arcade-gold)' : pct > 0 ? 'var(--arcade-paper-dim)' : 'var(--arcade-paper-disabled)',
                    }}
                    title={`${dateStr} — ${completedCount}/${habits.length} habits (${pct}%)`}
                  >
                    {Number(dateStr.slice(8))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
