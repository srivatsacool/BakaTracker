import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Task, TaskStatus } from '../types';
import { ChevronLeft, ChevronRight, Star, Calendar, Award, CheckSquare, Square } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Today: React.FC = () => {
  const { tasks, moveTask, toggleTodayTask } = useStore();

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

  const columns: { id: 'todo' | 'doing' | 'done'; label: string; bg: string; mobileTab: 'today' | 'doing' | 'done' }[] = [
    { id: 'todo', label: 'Today\'s Focus', bg: 'bg-white', mobileTab: 'today' },
    { id: 'doing', label: 'Doing Now', bg: 'bg-warning/5', mobileTab: 'doing' },
    { id: 'done', label: 'Finished', bg: 'bg-success/5', mobileTab: 'done' }
  ];

  const getColumnTasks = (colId: 'todo' | 'doing' | 'done') => {
    if (colId === 'todo') {
      return todayTasks.filter(t => t.status === 'todo' || t.status === 'backlog');
    }
    return todayTasks.filter(t => t.status === colId);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 relative">
      {/* Floating XP Elements */}
      {floatingXPs.map(item => (
        <div
          key={item.id}
          className="fixed animate-xp-float z-[9999] pointer-events-none font-black font-mono text-xs bg-black border border-white text-accent-pink px-2 py-0.5 rounded shadow-gumroad-sm flex items-center gap-1"
          style={{ left: `${item.x}px`, top: `${item.y}px`, transform: 'translate(-50%, -50%)' }}
        >
          +{item.xp} {item.statName.toUpperCase()} XP
        </div>
      ))}

      {/* Spotlight Backdrop Dimmer (focus helper) */}
      {doingTasks.length > 0 && <div className="spotlight-overlay" />}

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 text-text-primary">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Today's Focus Board</h2>
          <p className="text-xs text-gray-500 font-mono">Execution mode. No clutter, only action.</p>
        </div>
        
        {/* Quick Celebration Widget */}
        {todayTasks.length > 0 && activeTasks.length === 0 && (
          <div className="flex items-center gap-2 bg-success/15 border-2 border-success text-success px-4 py-2 rounded-lg font-mono font-bold text-sm shadow-gumroad-sm">
            <Award className="w-5 h-5 cart-insert text-success" />
            <span>Daily Board Cleared! +10 XP</span>
          </div>
        )}
      </div>

      {/* Empty Board State */}
      {todayTasks.length === 0 ? (
        <section className="neo-card p-10 bg-white text-center flex flex-col items-center gap-4 max-w-lg mx-auto mt-8 z-10 text-black">
          <span className="text-5xl">🎯</span>
          <h3 className="text-lg font-black leading-none">Your Board is Clear</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            You don't have any tasks set for today. Separate planning from execution: browse your master board and star the tasks you want to tackle today.
          </p>
          <Link
            to="/tasks"
            className="neo-button mt-2 inline-flex items-center gap-2"
          >
            <span>Go to Master Planner</span>
            <ChevronRight className="w-4 h-4 text-black" />
          </Link>
        </section>
      ) : (
        <>
          {/* Today's Quests Checklist Panel */}
          <section className="neo-card p-6 bg-white dark:bg-surface border-2 border-black dark:border-white z-10 text-text-primary">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-black dark:border-white pb-3 mb-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                  <span>Today's Quests</span>
                </h3>
                <p className="text-xs text-gray-500 font-mono">Quick list for rapid checking</p>
              </div>

              {/* Progress Count */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-400">Progress</span>
                <div className="bg-bg-primary dark:bg-black/35 px-3 py-1 rounded border-2 border-black font-mono font-black text-sm text-black dark:text-white shadow-gumroad-sm">
                  {doneTasks.length} / {todayTasks.length}
                </div>
              </div>
            </div>

            {/* Quests List */}
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
                        triggerFloatingXP(e, task.xp, task.area);
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
                        triggerFloatingXP(null, task.xp, task.area);
                      }
                    }}
                    className={`p-3 border-2 rounded-lg flex items-center gap-3 cursor-pointer select-none transition-all ${
                      isCompleted 
                        ? 'border-success bg-success/5 dark:bg-success/5 opacity-65 line-through' 
                        : 'border-black dark:border-white hover:bg-gray-50 dark:hover:bg-white/5 bg-white dark:bg-surface'
                    }`}
                  >
                    {/* Retro Checkbox Box */}
                    <div className="shrink-0">
                      {isCompleted ? (
                        <CheckSquare className="w-5 h-5 text-success fill-success/10" />
                      ) : (
                        <Square className="w-5 h-5 text-black dark:text-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">
                        {getAreaEmoji(task.area)} {task.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold font-mono bg-bg-primary dark:bg-black/35 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded border border-black/10 dark:border-white/10 text-black">
                        +{task.xp} XP
                      </span>
                      <span className="text-xs capitalize font-bold font-mono text-gray-400">
                        ({task.status === 'backlog' ? 'todo' : task.status})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar Visualizer */}
            <div className="w-full bg-bg-primary dark:bg-black/35 h-3 rounded-full border-2 border-black dark:border-white overflow-hidden relative mt-4">
              <div 
                className="bg-accent-pink h-full transition-all duration-300"
                style={{ width: `${(doneTasks.length / todayTasks.length) * 100}%` }}
              />
            </div>
          </section>

          {/* Mobile Tab Selectors */}
          <div className="sm:hidden flex border-2 border-black rounded-lg overflow-hidden bg-white shadow-gumroad-sm z-10 text-black">
            {columns.map(col => {
              const colTasks = getColumnTasks(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveMobileTab(col.mobileTab)}
                  className={`flex-1 py-2.5 text-xs font-black font-mono text-center border-r last:border-r-0 border-black transition ${
                    activeMobileTab === col.mobileTab ? 'bg-accent-pink text-black' : 'bg-white text-gray-500'
                  }`}
                >
                  {col.label.split(' ')[0]} ({colTasks.length})
                </button>
              );
            })}
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 min-h-[400px]">
            {columns.map(col => {
              const colTasks = getColumnTasks(col.id);
              const isTabActive = activeMobileTab === col.mobileTab;

              return (
                <div
                  key={col.id}
                  className={`flex flex-col neo-card p-4 border-2 border-black bg-white dark:bg-surface text-text-primary ${
                    isTabActive ? 'flex' : 'hidden sm:flex'
                  } ${col.id === 'doing' && doingTasks.length > 0 ? 'spotlight-active' : ''}`}
                >
                  {/* Column Header */}
                  <div className="flex justify-between items-center border-b-2 border-black dark:border-white pb-2 mb-4">
                    <span className="font-black text-sm font-mono uppercase tracking-wider">{col.label}</span>
                    <span className="bg-black text-white px-2 py-0.5 rounded font-mono text-xs font-bold border border-black shadow-gumroad-sm">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="flex flex-col gap-4 flex-1 overflow-y-auto no-scrollbar max-h-[500px]">
                    {colTasks.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 text-xs font-mono border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        Empty
                      </div>
                    ) : (
                      colTasks.map(task => (
                        <div
                          key={task.id}
                          className={`neo-card p-4 bg-white dark:bg-surface border-2 border-black dark:border-white shadow-gumroad-sm flex flex-col gap-3 relative transition-all text-text-primary ${
                            task.status === 'done' ? 'opacity-50 line-through decoration-black dark:decoration-white decoration-2' : ''
                          } ${
                            task.status === 'doing' ? 'spotlight-active spotlight-pulse ring-2 ring-accent-pink' : ''
                          }`}
                        >
                          {/* Remove from Today button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTodayTask(task.id);
                            }}
                            className="absolute top-3 right-3 p-1 rounded-full text-amber-500 hover:text-gray-300 transition cursor-pointer"
                            title="Remove from Today's Board"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-black dark:stroke-white" />
                          </button>

                          <div className="pr-6">
                            <h4 className="font-black text-sm leading-snug break-words">
                              {getAreaEmoji(task.area)} {task.title}
                            </h4>
                            {task.notes && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1 whitespace-pre-wrap break-words">
                                {task.notes}
                              </p>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[9px] font-bold font-mono bg-bg-primary dark:bg-black/35 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded border border-black/10 dark:border-white/10 text-black">
                              +{task.xp} XP
                            </span>
                            {task.due_date && (
                              <span className="text-[9px] font-bold font-mono bg-danger/10 text-danger px-2 py-0.5 rounded border border-danger/20 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5 text-danger" />
                                {task.due_date}
                              </span>
                            )}
                          </div>

                          {/* Status Actions */}
                          <div className="flex justify-between items-center border-t border-black/10 dark:border-white/10 pt-2 mt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                shiftStatus(task, 'left');
                              }}
                              disabled={task.status === 'todo' || task.status === 'backlog'}
                              className="p-1.5 rounded border border-black dark:border-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 bg-white dark:bg-surface text-black dark:text-white cursor-pointer shadow-gumroad-sm hover:translate-x-[-1px] hover:translate-y-[-1px]"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            
                            <span className="text-[10px] font-bold font-mono text-gray-400 capitalize">
                              {task.status === 'backlog' ? 'todo' : task.status}
                            </span>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                shiftStatus(task, 'right', e);
                              }}
                              disabled={task.status === 'done'}
                              className="p-1.5 rounded border border-black dark:border-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 bg-white dark:bg-surface text-black dark:text-white cursor-pointer shadow-gumroad-sm hover:translate-x-[-1px] hover:translate-y-[-1px]"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
