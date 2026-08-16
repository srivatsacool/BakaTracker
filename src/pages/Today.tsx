import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Task, TaskStatus } from '../types';
import { ChevronLeft, ChevronRight, Award, CheckSquare, Square, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { calculateDailyScore, isHabitCompleted, getTodayDateString } from '../lib/utils';
import { calculateHabitStreak } from '../services/habits/calculateHabitStreak';

/**
 * Today — the daily cockpit. One lit pane: the starred quests board.
 * Around it, real-data modules (score, habits, journal, XP, priority quest)
 * drawn straight from the store — nothing fabricated. Completing a quest
 * lights the pane (the one authored moment).
 */
export const Today: React.FC = () => {
  const { tasks, habits, habitLogs, journal, stats, settings, moveTask } = useStore();

  const todayTasks = tasks.filter(t => t.today);
  const activeTasks = todayTasks.filter(t => t.status !== 'done');
  const doingTasks = todayTasks.filter(t => t.status === 'doing');
  const doneTasks = todayTasks.filter(t => t.status === 'done');

  // --- Cockpit modules — all derived from real store slices ---
  const todayStr = getTodayDateString();
  const activeHabits = habits.filter(h => h.active);
  const todayLogs = habitLogs.filter(l => l.date === todayStr);
  const habitsDone = activeHabits.filter(h => isHabitCompleted(h, todayLogs.find(l => l.habit_id === h.id))).length;
  const dailyScore = calculateDailyScore(todayStr, habits, habitLogs, tasks, journal);
  const todayJournal = journal.find(j => j.date === todayStr);
  const journalLogged = !!(todayJournal && todayJournal.highlight.trim());
  const topStreak = activeHabits
    .map(h => ({ habit: h, streak: calculateHabitStreak(h, habitLogs) }))
    .sort((a, b) => b.streak - a.streak)[0];
  const xpPerLevel = Math.max(1, settings.xp_per_level || 100);
  const xpProgress = Math.min(100, Math.max(0, (stats.xp / xpPerLevel) * 100));
  const xpToNext = Math.max(0, xpPerLevel - stats.xp);
  const openQuests = todayTasks.filter(t => t.status !== 'done');
  // Priority quest: the first quest in Doing, else the highest-XP open quest.
  const priorityQuest = openQuests.find(t => t.status === 'doing') || [...openQuests].sort((a, b) => b.xp - a.xp)[0];
  const scoreTone = dailyScore >= 80 ? 'var(--arcade-green)' : dailyScore >= 40 ? 'var(--arcade-gold)' : 'var(--arcade-red)';
  const hasAnyData = activeHabits.length > 0 || todayTasks.length > 0 || journal.length > 0;

  const [activeMobileTab, setActiveMobileTab] = useState<'today' | 'doing' | 'done'>('today');

  interface FloatingXP {
    id: number;
    xp: number;
    statName: string;
    x: number;
    y: number;
  }
  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);
  const [starBursts, setStarBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [paneLit, setPaneLit] = useState(false);
  // Completion-moment ids (react-hooks/purity: Date.now()/Math.random() are
  // banned in component scope, so ids come from a stable counter).
  const fxIdRef = useRef(0);

  const triggerFloatingXP = (e: React.MouseEvent | null, xp: number, statName: string) => {
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
      id: ++fxIdRef.current,
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

  /** The one authored moment: completing a quest lights the pane and a star joins the night. */
  const lightThePane = (e: React.MouseEvent | null, xp: number, statName: string) => {
    triggerFloatingXP(e, xp, statName);
    // pane lights
    setPaneLit(false);
    requestAnimationFrame(() => setPaneLit(true));
    // a star joins the night at the completion point
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e && 'clientX' in e && e.clientX) {
      x = e.clientX;
      y = e.clientY;
    }
    const star = { id: ++fxIdRef.current, x, y };
    setStarBursts(prev => [...prev, star]);
    setTimeout(() => {
      setStarBursts(prev => prev.filter(s => s.id !== star.id));
    }, 650);
  };

  const shiftStatus = (task: Task, direction: 'left' | 'right', e?: React.MouseEvent) => {
    const statusOrder: TaskStatus[] = ['todo', 'doing', 'done'];
    const currentStatus = task.status === 'backlog' ? 'todo' : task.status;
    const currentIndex = statusOrder.indexOf(currentStatus);
    let newIndex = currentIndex;

    if (direction === 'left' && currentIndex > 0) {
      newIndex--;
    } else if (direction === 'right' && currentIndex < statusOrder.length - 1) {
      newIndex++;
    }

    if (newIndex !== currentIndex) {
      moveTask(task.id, statusOrder[newIndex]);
      if (statusOrder[newIndex] === 'done') {
        triggerFloatingXP(e || null, task.xp, task.area);
      }
    }
  };

  const getAreaEmoji = (area: string) => {
    switch (area) {
      case 'health': return '💪';
      case 'career': return '💼';
      case 'learning': return '🧠';
      case 'personal': return '⚔️';
      case 'creativity': return '🎨';
      default: return '🎯';
    }
  };

  const columns: { id: 'todo' | 'doing' | 'done'; label: string; mobileTab: 'today' | 'doing' | 'done' }[] = [
    { id: 'todo', label: 'Today\'s Focus', mobileTab: 'today' },
    { id: 'doing', label: 'Doing Now', mobileTab: 'doing' },
    { id: 'done', label: 'Finished', mobileTab: 'done' }
  ];

  const getColumnTasks = (colId: 'todo' | 'doing' | 'done') => {
    if (colId === 'todo') {
      return todayTasks.filter(t => t.status === 'todo' || t.status === 'backlog');
    }
    return todayTasks.filter(t => t.status === colId);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 relative pb-12">
      {/* Floating XP Elements — the pane-light score ticker */}
      {floatingXPs.map(item => (
        <div
          key={item.id}
          className="float-xp"
          style={{ left: `${item.x}px`, top: `${item.y}px`, transform: 'translate(-50%, -50%)' }}
        >
          +{item.xp} {item.statName.toUpperCase()} XP
        </div>
      ))}

      {/* Star bursts — a star joins the night on completion */}
      {starBursts.map(star => (
        <div
          key={star.id}
          className="star-join fixed z-30 pointer-events-none"
          style={{ left: `${star.x}px`, top: `${star.y}px`, transform: 'translate(-50%, -50%)', color: 'var(--arcade-gold)', fontSize: '20px', lineHeight: 1 }}
          aria-hidden="true"
        >
          ✦
        </div>
      ))}

      {/* Spotlight Backdrop Dimmer (focus helper) */}
      {doingTasks.length > 0 && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 45% 40% at 50% 45%, transparent 0%, rgba(8,7,15,0.55) 100%)' }}
          aria-hidden="true"
        />
      )}

      {/* Page Title */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 ${paneLit ? 'pane-light' : ''}`}>
        <div>
          <h2 className="marquee-title text-2xl sm:text-3xl m-0" style={{ color: 'var(--arcade-paper)' }}>Today's Focus Board</h2>
          <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Execution mode. No clutter, only action.</p>
          {/* The Day Line — one unbroken track, the running light shows where now is */}
          <div className="day-line mt-3 max-w-md">
            <div className="day-line-track" role="img" aria-label={`${doneTasks.length} of ${todayTasks.length} quests complete`}>
              <div
                className="day-line-fill"
                style={{ '--day-line-progress': todayTasks.length > 0 ? doneTasks.length / todayTasks.length : 0 } as React.CSSProperties}
              />
              <div
                className="day-line-now"
                style={{ '--day-line-now': `${todayTasks.length > 0 ? (doneTasks.length / todayTasks.length) * 100 : 0}%` } as React.CSSProperties}
              />
            </div>
            <span className="font-mono text-[10px] score-readout shrink-0" style={{ color: 'var(--arcade-gold)' }}>
              {doneTasks.length}/{todayTasks.length}
            </span>
          </div>
        </div>

        {/* Quick Celebration Widget */}
        {todayTasks.length > 0 && activeTasks.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-sm chip chip--teal">
            <Award className="w-5 h-5" aria-hidden="true" />
            <span>Daily Board Cleared!</span>
          </div>
        )}
      </div>

      {/* Priority Quest Callout — the machine points at the one quest to start */}
      {priorityQuest && (
        <section className="quest-callout z-10">
          <span className="quest-callout-led" aria-hidden="true" />
          <div className="quest-callout-body">
            <span className="quest-callout-kicker">Your most important quest</span>
            <span className="quest-callout-title">{getAreaEmoji(priorityQuest.area)} {priorityQuest.title}</span>
            <span className="font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-gold)' }}>
              +{priorityQuest.xp} XP · {priorityQuest.area}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              moveTask(priorityQuest.id, 'done');
              lightThePane(e, priorityQuest.xp, priorityQuest.area);
            }}
            className="insert-coin !py-2 !px-4 !text-xs"
            aria-label={`Complete ${priorityQuest.title}`}
          >
            <CheckSquare className="w-4 h-4" aria-hidden="true" />
            Complete
          </button>
        </section>
      )}

      {/* Empty Board State */}
      {todayTasks.length === 0 ? (
        <section className="attract-state max-w-lg mx-auto mt-8 z-10">
          <span className="text-4xl" aria-hidden="true">🎯</span>
          <div className="attract-dots" aria-hidden="true"><span /><span /><span /></div>
          <h3>Your Board is Clear</h3>
          <p>
            You don't have any tasks set for today. Separate planning from execution: browse your master board and star the tasks you want to tackle today.
          </p>
          <Link to="/tasks" className="insert-coin mt-2 no-underline">
            <span>Go to Master Planner</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <>
          {/* Today's Quests Checklist Panel */}
          <section className="cabinet cabinet--playing z-10" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
            <div className="cabinet-marquee">
              <span className="cabinet-led" aria-hidden="true" />
              <span className="cabinet-marquee-title">Today's Quests</span>
              <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-gold)' }}>
                {doneTasks.length} / {todayTasks.length}
              </span>
            </div>
            <div className="cabinet-screen !p-5">
              <div className="flex flex-col gap-4">
                {todayTasks.map(task => {
                  const isCompleted = task.status === 'done';
                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        const nextStatus = isCompleted ? 'todo' : 'done';
                        moveTask(task.id, nextStatus);
                        if (nextStatus === 'done') {
                          lightThePane(e, task.xp, task.area);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isCompleted}
                      aria-label={`${task.title} — ${isCompleted ? 'mark as to do' : 'complete quest'}`}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        const nextStatus = isCompleted ? 'todo' : 'done';
                        moveTask(task.id, nextStatus);
                        if (nextStatus === 'done') {
                          lightThePane(null, task.xp, task.area);
                        }
                      }}
                      className={`p-3.5 rounded-lg flex items-center gap-3 cursor-pointer select-none transition-all border ${
                        isCompleted
                          ? 'opacity-60'
                          : 'hover:bg-white/5'
                      }`}
                      style={{
                        background: isCompleted ? 'rgba(61,220,132,0.05)' : 'rgba(242,242,242,0.03)',
                        borderColor: isCompleted ? 'rgba(61,220,132,0.3)' : 'rgba(242,242,242,0.1)',
                      }}
                    >
                      {/* Retro Checkbox Box */}
                      <div className="shrink-0">
                        {isCompleted ? (
                          <CheckSquare className="w-5 h-5" style={{ color: 'var(--arcade-green)' }} aria-hidden="true" />
                        ) : (
                          <Square className="w-5 h-5" style={{ color: 'var(--arcade-paper-disabled)' }} aria-hidden="true" />
                        )}
                      </div>

                      {/* Task Details */}
                      <div className="flex-1 min-w-0">
                        <p className={`m-0 text-sm font-bold truncate ${isCompleted ? 'line-through' : ''}`} style={{ color: isCompleted ? 'var(--arcade-paper-muted)' : 'var(--arcade-paper)' }}>
                          {task.title}
                        </p>
                        <p className="m-0 font-mono text-[10px] mt-0.5" style={{ color: 'var(--arcade-paper-muted)' }}>
                          {getAreaEmoji(task.area)} {task.area} · +{task.xp} XP
                        </p>
                      </div>

                      {/* Status */}
                      <span className="shrink-0 font-mono text-[10px] font-bold uppercase" style={{ color: isCompleted ? 'var(--arcade-green)' : 'var(--arcade-paper-disabled)' }}>
                        {isCompleted ? 'Done' : 'Open'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Kanban Columns (Desktop) */}
          <div className="hidden md:grid grid-cols-3 gap-6 z-10">
            {columns.map(col => {
              const colTasks = getColumnTasks(col.id);
              const isActiveTab = activeMobileTab === col.mobileTab;
              return (
                <section
                  key={col.id}
                  className={`cabinet ${col.id === 'done' ? 'cabinet--highscore' : 'cabinet--off'} ${isActiveTab ? '' : ''}`}
                  style={{ '--marquee-color': col.id === 'done' ? 'var(--arcade-green)' : 'var(--arcade-cobalt)' } as React.CSSProperties}
                >
                  <div className="cabinet-marquee">
                    <span className="cabinet-led" aria-hidden="true" />
                    <span className="cabinet-marquee-title">{col.label}</span>
                    <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-paper-muted)' }}>{colTasks.length}</span>
                  </div>
                  <div className="cabinet-screen !p-4 flex flex-col gap-3 min-h-[120px]">
                    {colTasks.length === 0 ? (
                      <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>
                        No quests here
                      </p>
                    ) : (
                      colTasks.map(task => (
                        <div
                          key={task.id}
                          className="rounded-lg p-3 flex flex-col gap-2"
                          style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid var(--obs-glass-9)' }}
                        >
                          <p className="m-0 text-xs font-bold" style={{ color: 'var(--arcade-paper)' }}>{task.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] score-readout" style={{ color: 'var(--arcade-gold)' }}>+{task.xp} XP</span>
                            <div className="flex gap-1">
                              {col.id !== 'todo' && (
                                <button
                                  type="button"
                                  onClick={(e) => shiftStatus(task, 'left', e)}
                                  className="icon-button icon-button-small"
                                  aria-label={`Move ${task.title} left`}
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              )}
                              {col.id !== 'done' && (
                                <button
                                  type="button"
                                  onClick={(e) => shiftStatus(task, 'right', e)}
                                  className="icon-button icon-button-small"
                                  aria-label={`Move ${task.title} right`}
                                >
                                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Mobile Column Tabs */}
          <div className="md:hidden flex gap-2 z-10">
            {columns.map(col => (
              <button
                key={col.id}
                type="button"
                onClick={() => setActiveMobileTab(col.mobileTab)}
                className={`flex-1 rounded-lg px-3 py-2 font-mono text-[10px] font-bold cursor-pointer transition ${
                  activeMobileTab === col.mobileTab ? 'chip chip--cobalt' : 'chip'
                }`}
              >
                {col.label} ({getColumnTasks(col.id).length})
              </button>
            ))}
          </div>

          {/* Mobile Column Content */}
          <div className="md:hidden z-10">
            {columns.filter(col => col.mobileTab === activeMobileTab).map(col => {
              const colTasks = getColumnTasks(col.id);
              return (
                <section key={col.id} className="cabinet cabinet--off" style={{ '--marquee-color': col.id === 'done' ? 'var(--arcade-green)' : 'var(--arcade-cobalt)' } as React.CSSProperties}>
                  <div className="cabinet-marquee">
                    <span className="cabinet-led" aria-hidden="true" />
                    <span className="cabinet-marquee-title">{col.label}</span>
                  </div>
                  <div className="cabinet-screen !p-4 flex flex-col gap-3">
                    {colTasks.length === 0 ? (
                      <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>No quests here</p>
                    ) : (
                      colTasks.map(task => (
                        <div key={task.id} className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid var(--obs-glass-9)' }}>
                          <p className="m-0 text-xs font-bold" style={{ color: 'var(--arcade-paper)' }}>{task.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] score-readout" style={{ color: 'var(--arcade-gold)' }}>+{task.xp} XP</span>
                            <div className="flex gap-1">
                              {col.id !== 'todo' && (
                                <button type="button" onClick={(e) => shiftStatus(task, 'left', e)} className="icon-button icon-button-small" aria-label={`Move ${task.title} left`}>
                                  <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              )}
                              {col.id !== 'done' && (
                                <button type="button" onClick={(e) => shiftStatus(task, 'right', e)} className="icon-button icon-button-small" aria-label={`Move ${task.title} right`}>
                                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* Cockpit Modules — every number from the store, nothing fabricated.
          F11: one premium dock — a quiet instrument header over the 2-col
          module grid (stacked on mobile). The quest board above stays the
          one lit surface; these sit dim behind it. */}
      <div className="f11-cockpit-dock z-10">
        <div className="f11-cockpit-head">
          <span className="f11-cockpit-led" aria-hidden="true" />
          <h3 className="f11-cockpit-title">Today's instruments</h3>
          <span className="f11-cockpit-kicker">score · habits · journal · level</span>
        </div>
        <div className="cockpit-grid">
        {/* Daily Score */}
        <section className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Daily Score</span>
            <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: scoreTone }}>{dailyScore}%</span>
          </div>
          <div className="cabinet-screen !p-5 flex flex-col gap-3">
            {hasAnyData ? (
              <>
                <div className="flex items-end justify-between">
                  <span className="marquee-title text-3xl leading-none" style={{ color: scoreTone }}>{dailyScore}%</span>
                  <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>today</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(233,230,242,0.06)', border: '1px solid rgba(233,230,242,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${dailyScore}%`, background: `linear-gradient(90deg, var(--arcade-gold-deep), ${scoreTone})`, boxShadow: `0 0 8px ${scoreTone}` }}
                  />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }}>
                  <span>Habits {activeHabits.length > 0 ? `${habitsDone}/${activeHabits.length}` : '—'}</span>
                  <span>Quests {todayTasks.length > 0 ? `${doneTasks.length}/${todayTasks.length}` : '—'}</span>
                  <span>Journal {journalLogged ? '✓' : '—'}</span>
                </div>
              </>
            ) : (
              <p className="m-0 font-mono text-[10px] leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>
                A blank slate. Star a quest or check in a habit to light the meter.
              </p>
            )}
          </div>
        </section>

        {/* Habits — N/M done today + the streak that matters */}
        <section className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-green)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Habits</span>
            <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-green)' }}>
              {activeHabits.length > 0 ? `${habitsDone}/${activeHabits.length} today` : '—'}
            </span>
          </div>
          <div className="cabinet-screen !p-5 flex flex-col gap-3">
            {activeHabits.length > 0 ? (
              <>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(233,230,242,0.06)', border: '1px solid rgba(233,230,242,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(habitsDone / activeHabits.length) * 100}%`, background: 'linear-gradient(90deg, var(--arcade-gold-deep), var(--arcade-green))', boxShadow: '0 0 8px var(--arcade-green)' }}
                  />
                </div>
                {topStreak && topStreak.streak > 0 ? (
                  <p className="m-0 font-mono text-[10px] leading-relaxed" style={{ color: 'var(--arcade-paper-dim)' }}>
                    <Flame className="w-3 h-3 inline -mt-0.5 mr-1" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
                    {topStreak.habit.icon} {topStreak.habit.name} — {topStreak.streak}-day streak.
                    {isHabitCompleted(topStreak.habit, todayLogs.find(l => l.habit_id === topStreak.habit.id))
                      ? ' Still burning.'
                      : ' Log it today to keep it.'}
                  </p>
                ) : (
                  <p className="m-0 font-mono text-[10px] leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>
                    No streaks yet — consistency is the machine.
                  </p>
                )}
                <Link to="/habits" className="btn-text !p-0 !text-[10px] no-underline self-start" style={{ color: 'var(--arcade-gold)' }}>
                  Check in on Habits →
                </Link>
              </>
            ) : (
              <p className="m-0 font-mono text-[10px] leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>
                No habits yet — build your instruments.
              </p>
            )}
          </div>
        </section>

        {/* Journal — today's entry status */}
        <section className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-magenta)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Journal</span>
            {journalLogged && (
              <span className="ml-auto font-mono text-[10px] chip chip--teal">Today's highlight: ✓ logged</span>
            )}
          </div>
          <div className="cabinet-screen !p-5 flex flex-col gap-3">
            {journalLogged ? (
              <>
                <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--arcade-paper-dim)' }}>
                  “{todayJournal!.highlight}”{todayJournal!.mood ? ` ${todayJournal!.mood}` : ''}
                </p>
                <Link to="/journal" className="btn-text !p-0 !text-[10px] no-underline self-start" style={{ color: 'var(--arcade-gold)' }}>
                  Read the diary →
                </Link>
              </>
            ) : (
              <>
                <p className="m-0 font-mono text-[10px] leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>
                  End the day with one sentence. It counts toward today's score.
                </p>
                <Link to="/journal" className="btn-text !p-0 !text-[10px] no-underline self-start" style={{ color: 'var(--arcade-gold)' }}>
                  Write it →
                </Link>
              </>
            )}
          </div>
        </section>

        {/* XP / Level — same readout as the shell */}
        <section className="cabinet cabinet--off" style={{ '--marquee-color': 'var(--arcade-cobalt)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Level</span>
            <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-gold)' }}>LVL {stats.level}</span>
          </div>
          <div className="cabinet-screen !p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="score-readout text-sm" style={{ color: 'var(--arcade-paper)' }}>{stats.xp} / {xpPerLevel} XP</span>
              <span className="font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }}>{xpToNext} to next</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: 'rgba(233,230,242,0.06)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${xpProgress}%`, background: 'linear-gradient(90deg, var(--arcade-gold-deep), var(--arcade-gold))', boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)' }}
              />
            </div>
            <p className="m-0 font-mono text-[9px] leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>
              Starred quests, habit check-ins and journal entries feed this bar.
            </p>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
};
