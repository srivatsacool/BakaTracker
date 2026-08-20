import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Task, TaskStatus } from '../types';
import { ChevronLeft, ChevronRight, Award, CheckSquare, Square } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Today — the lit pane. Starred quests, spotlight focus,
 * floating XP. Completing a quest lights the pane (the one authored moment).
 */
export const Today: React.FC = () => {
  const { tasks, moveTask } = useStore();

  const todayTasks = tasks.filter(t => t.today);
  const activeTasks = todayTasks.filter(t => t.status !== 'done');
  const doingTasks = todayTasks.filter(t => t.status === 'doing');
  const doneTasks = todayTasks.filter(t => t.status === 'done');

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
    const star = { id: Date.now() + Math.random(), x, y };
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
    <div className="max-w-4xl mx-auto flex flex-col gap-6 relative">
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
            <span>Daily Board Cleared! +10 XP</span>
          </div>
        )}
      </div>

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
            <div className="cabinet-screen !p-4">
              <div className="flex flex-col gap-3">
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
                      className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer select-none transition-all border ${
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
          <div className="hidden md:grid grid-cols-3 gap-4 z-10">
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
                  <div className="cabinet-screen !p-3 flex flex-col gap-2 min-h-[120px]">
                    {colTasks.length === 0 ? (
                      <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>
                        No quests here
                      </p>
                    ) : (
                      colTasks.map(task => (
                        <div
                          key={task.id}
                          className="rounded-lg p-3 flex flex-col gap-2"
                          style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid rgba(242,242,242,0.09)' }}
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
                  <div className="cabinet-screen !p-3 flex flex-col gap-2">
                    {colTasks.length === 0 ? (
                      <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>No quests here</p>
                    ) : (
                      colTasks.map(task => (
                        <div key={task.id} className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid rgba(242,242,242,0.09)' }}>
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
    </div>
  );
};
