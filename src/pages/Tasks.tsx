import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import type { Task, TaskStatus, TaskArea } from '../types';
import { Plus, Search, Star, ChevronLeft, ChevronRight, Calendar, Trash2, CheckCircle2, Zap } from 'lucide-react';
import { UndoToast } from '../components/shared/UndoToast';

/**
 * Tasks — the action cabinet. Four-column Kanban:
 * Backlog → Todo → Doing → Done, with areas, due dates, XP, today stars.
 */
export const Tasks: React.FC = () => {
  const { tasks, addTask, moveTask, toggleTodayTask, deleteTask } = useStore(useShallow(s => ({
    tasks: s.tasks,
    addTask: s.addTask,
    moveTask: s.moveTask,
    toggleTodayTask: s.toggleTodayTask,
    deleteTask: s.deleteTask,
  })));

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<TaskArea | 'all'>('all');

  // Undo-toast for task delete. The 5s grace timer must be cleared on
  // unmount: otherwise navigation within the window still fires the delete
  // (the user left the board, so the toast and its Undo are gone — the
  // removal would be un-missable and irreversible).
  const [pendingDelete, setPendingDelete] = useState<{ title: string; id: string } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    };
  }, []);

  const handleDeleteTask = useCallback((task: { id: string; title: string }) => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDelete({ title: task.title, id: task.id });
    deleteTimerRef.current = setTimeout(() => {
      deleteTask(task.id);
      setPendingDelete(null);
    }, 5000);
  }, [deleteTask]);

  const undoDeleteTask = useCallback(() => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDelete(null);
  }, []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeMobileColumn, setActiveMobileColumn] = useState<TaskStatus>('todo');

  // Completion feedback — a quiet XP tick (starred quests only, honest: the
  // store grants an XP event for task.today completions; non-starred get a note).
  interface FloatingXP {
    id: number;
    xp: number;
    statName: string;
    x: number;
    y: number;
  }
  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);
  const [xpNote, setXpNote] = useState<{ id: number; text: string } | null>(null);

  const triggerXP = (e: React.MouseEvent | null, xp: number, statName: string) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (e && 'clientX' in e && e.clientX) {
      x = e.clientX;
      y = e.clientY;
    }
    const item = { id: Date.now() + Math.random(), xp, statName, x, y };
    setFloatingXPs(prev => [...prev, item]);
    setTimeout(() => {
      setFloatingXPs(prev => prev.filter(p => p.id !== item.id));
    }, 1000);
  };

  const showXpNote = (text: string) => {
    const note = { id: Date.now() + Math.random(), text };
    setXpNote(note);
    setTimeout(() => {
      setXpNote(prev => (prev && prev.id === note.id ? null : prev));
    }, 3000);
  };

  // Form states
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [area, setArea] = useState<TaskArea>('personal');
  const [xp, setXp] = useState(10);
  const [today, setToday] = useState(false);
  const [dueDate, setDueDate] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask(title, notes, area, Number(xp) || 10, today, dueDate);

    // Reset form
    setTitle('');
    setNotes('');
    setArea('personal');
    setXp(10);
    setToday(false);
    setDueDate('');
    setShowAddForm(false);
  };

  const columns: { id: TaskStatus; label: string; tone: string }[] = [
    { id: 'backlog', label: 'Backlog', tone: 'var(--arcade-paper-dim)' },
    { id: 'todo', label: 'Todo', tone: 'var(--arcade-cobalt)' },
    { id: 'doing', label: 'Doing', tone: 'var(--arcade-gold)' },
    { id: 'done', label: 'Done', tone: 'var(--arcade-green)' }
  ];

  const areas: (TaskArea | 'all')[] = ['all', 'health', 'career', 'learning', 'personal', 'creativity'];

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea = selectedArea === 'all' || t.area === selectedArea;
    return matchesSearch && matchesArea;
  });

  const getAreaColor = (area: TaskArea) => {
    switch (area) {
      case 'health': return 'var(--arcade-green)';
      case 'career': return 'var(--arcade-gold)';
      case 'learning': return 'var(--arcade-cobalt)';
      case 'personal': return 'var(--arcade-magenta)';
      case 'creativity': return 'var(--arcade-red)';
    }
  };

  const shiftStatus = (task: Task, direction: 'left' | 'right', e?: React.MouseEvent) => {
    const statusOrder: TaskStatus[] = ['backlog', 'todo', 'doing', 'done'];
    const currentIndex = statusOrder.indexOf(task.status);
    let newIndex = currentIndex;

    if (direction === 'left' && currentIndex > 0) {
      newIndex--;
    } else if (direction === 'right' && currentIndex < statusOrder.length - 1) {
      newIndex++;
    }

    if (newIndex !== currentIndex) {
      moveTask(task.id, statusOrder[newIndex]);
      if (statusOrder[newIndex] === 'done') {
        if (task.today) {
          triggerXP(e || null, task.xp, task.area);
        } else {
          showXpNote(`Done — no XP. Star it for Today to earn +${task.xp} XP.`);
        }
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Undo toast for deletes */}
      {pendingDelete && (
        <UndoToast
          message={`"${pendingDelete.title}" removing — tap Undo to keep`}
          onUndo={undoDeleteTask}
        />
      )}

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="marquee-title text-2xl m-0" style={{ color: 'var(--arcade-paper)' }}>Master Planner Board</h2>
          <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Brain dump, organize, and map out your quests.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="insert-coin w-full md:w-auto justify-center !text-xs"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>New Quest</span>
        </button>
      </div>

      {/* Completion feedback — quiet XP tick + honesty note */}
      {floatingXPs.map(item => (
        <div
          key={item.id}
          className="fixed z-30 pointer-events-none"
          style={{ left: `${item.x}px`, top: `${item.y}px`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="float-xp">
            +{item.xp} {item.statName.toUpperCase()} XP
          </div>
        </div>
      ))}
      {xpNote && (
        <div className="xp-note animate-fade-in" role="status">
          <Zap className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{xpNote.text}</span>
        </div>
      )}

      {/* Task Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="cabinet cabinet--playing animate-fade-in" style={{ '--marquee-color': 'var(--arcade-red)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Create new quest</span>
          </div>
          <div className="cabinet-screen !p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Task Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Update resume" className="arcade-input" maxLength={200} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>RPG Area</label>
              <select value={area} onChange={e => setArea(e.target.value as TaskArea)} className="arcade-input font-mono">
                <option value="health">Health</option>
                <option value="career">Career</option>
                <option value="learning">Learning</option>
                <option value="personal">Personal</option>
                <option value="creativity">Creativity</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Details…" className="arcade-input min-h-[60px] resize-y" maxLength={500} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>XP Reward</label>
              <input type="number" value={xp} onChange={e => setXp(Number(e.target.value))} min={0} max={1000} className="arcade-input font-mono" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="task-today" checked={today} onChange={e => setToday(e.target.checked)} className="w-4 h-4 accent-arcade-gold" />
              <label htmlFor="task-today" className="font-mono text-[10px] font-bold cursor-pointer" style={{ color: 'var(--arcade-paper-dim)' }}>Star for Today board</label>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="arcade-input font-mono" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost !text-xs">Cancel</button>
              <button type="submit" disabled={!title.trim()} className="insert-coin !py-2 !px-4 !text-xs">
                <span className="coin-slot" aria-hidden="true" /> Add quest
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search + Area Filters */}
      <div className="flex flex-col gap-3">
        {tasks.length > 0 && filteredTasks.length === 0 && (
          <p className="m-0 px-4 py-3 rounded-lg font-mono text-[10px]" style={{ color: 'var(--arcade-red)', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)' }} role="status">
            No quests match “{searchQuery.trim() || 'this area'}” — clear the search or pick another area.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--arcade-paper-disabled)' }} aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search quests…"
              className="arcade-input !pl-9"
              maxLength={120}
              aria-label="Search tasks"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {areas.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setSelectedArea(a)}
                className={`chip cursor-pointer ${selectedArea === a ? 'chip--aurora' : ''}`}
                style={{ textTransform: 'capitalize' }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Board — desktop */}
      <div id="task-kanban-cols" className="hidden md:grid grid-cols-4 gap-4">
        {columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <section key={col.id} className="cabinet cabinet--off min-h-[200px]" style={{ '--marquee-color': col.tone } as React.CSSProperties}>
              <div className="cabinet-marquee">
                <span className="cabinet-led" aria-hidden="true" />
                <span className="cabinet-marquee-title">{col.label}</span>
                <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-paper-muted)' }}>{colTasks.length}</span>
              </div>
              <div className="cabinet-screen !p-3 flex flex-col gap-2 min-h-[160px]">
                {colTasks.length === 0 ? (
                  <p className="m-0 py-6 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>Empty bay</p>
                ) : (
                  colTasks.map(task => (
                    <div
                      key={task.id}
                      className={`rounded-lg p-3 flex flex-col gap-2 ${task.status === 'done' ? 'opacity-60' : ''}`}
                      style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid var(--obs-glass-9)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`m-0 text-xs font-bold truncate min-w-0 ${task.status === 'done' ? 'line-through' : ''}`} style={{ color: 'var(--arcade-paper)' }} title={task.title}>{task.title}</p>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${task.today ? '' : 'opacity-30'}`}
                          style={{ background: 'var(--arcade-gold)', boxShadow: task.today ? '0 0 8px var(--arcade-gold)' : 'none' }}
                          title={task.today ? 'Starred for Today' : 'Not starred'}
                          aria-hidden="true"
                        />
                      </div>
                      {task.notes && (
                        <p className="m-0 text-[10px] leading-relaxed" style={{ color: 'var(--arcade-paper-muted)' }}>{task.notes}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] chip" style={{ color: getAreaColor(task.area), borderColor: `${getAreaColor(task.area)}44`, background: `${getAreaColor(task.area)}12` }}>
                            {task.area}
                          </span>
                          <span className="font-mono text-[9px] score-readout" style={{ color: 'var(--arcade-gold)' }}>+{task.xp}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => toggleTodayTask(task.id)} className="icon-button icon-button-small" style={{ color: task.today ? 'var(--arcade-gold)' : 'var(--arcade-paper-disabled)' }} aria-label={task.today ? `Unstar ${task.title}` : `Star ${task.title} for today`} title={task.today ? 'Starred for Today' : 'Star for Today'}>
                            <Star className="w-3 h-3" aria-hidden="true" />
                          </button>
                          {task.status !== 'backlog' && (
                            <button type="button" onClick={(e) => shiftStatus(task, 'left', e)} className="icon-button icon-button-small" aria-label={`Move ${task.title} left`}>
                              <ChevronLeft className="w-3 h-3" aria-hidden="true" />
                            </button>
                          )}
                          {task.status !== 'done' && (
                            <button type="button" onClick={(e) => shiftStatus(task, 'right', e)} className="icon-button icon-button-small" aria-label={`Move ${task.title} right`}>
                              <ChevronRight className="w-3 h-3" aria-hidden="true" />
                            </button>
                          )}
                          <button type="button" onClick={() => handleDeleteTask(task)} className="icon-button icon-button-small hover:!text-danger" aria-label={`Delete ${task.title}`}>
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      {task.due_date && (
                        <span className="flex items-center gap-1 font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }}>
                          <Calendar className="w-3 h-3" aria-hidden="true" /> {task.due_date}
                        </span>
                      )}
                      {task.status === 'done' && task.completed_at && (
                        <span className="flex items-center gap-1 font-mono text-[9px]" style={{ color: 'var(--arcade-paper-disabled)' }}>
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> done {new Date(task.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Kanban — mobile column tabs */}
      <div className="md:hidden flex gap-2">
        {columns.map(col => (
          <button
            key={col.id}
            type="button"
            onClick={() => setActiveMobileColumn(col.id)}
            className={`flex-1 rounded-lg px-2 py-2 font-mono text-[10px] font-bold cursor-pointer transition ${activeMobileColumn === col.id ? 'chip chip--aurora' : 'chip'}`}
          >
            {col.label} ({filteredTasks.filter(t => t.status === col.id).length})
          </button>
        ))}
      </div>

      {/* Kanban — mobile active column */}
      <div className="md:hidden">
        {columns.filter(col => col.id === activeMobileColumn).map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <section key={col.id} className="cabinet cabinet--off" style={{ '--marquee-color': col.tone } as React.CSSProperties}>
              <div className="cabinet-marquee">
                <span className="cabinet-led" aria-hidden="true" />
                <span className="cabinet-marquee-title">{col.label}</span>
              </div>
              <div className="cabinet-screen !p-3 flex flex-col gap-2">
                {colTasks.length === 0 ? (
                  <p className="m-0 py-6 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>Empty bay</p>
                ) : (
                  colTasks.map(task => (
                    <div key={task.id} className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid var(--obs-glass-9)' }}>
                      <p className="m-0 text-xs font-bold truncate min-w-0" style={{ color: 'var(--arcade-paper)' }} title={task.title}>{task.title}</p>
                      {task.notes && <p className="m-0 text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>{task.notes}</p>}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] chip" style={{ color: getAreaColor(task.area), borderColor: `${getAreaColor(task.area)}44`, background: `${getAreaColor(task.area)}12` }}>{task.area}</span>
                          <span className="font-mono text-[9px] score-readout" style={{ color: 'var(--arcade-gold)' }}>+{task.xp}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => toggleTodayTask(task.id)} className="icon-button icon-button-small" style={{ color: task.today ? 'var(--arcade-gold)' : 'var(--arcade-paper-disabled)' }} aria-label="Toggle today star"><Star className="w-3 h-3" aria-hidden="true" /></button>
                          {task.status !== 'backlog' && <button type="button" onClick={(e) => shiftStatus(task, 'left', e)} className="icon-button icon-button-small" aria-label="Move left"><ChevronLeft className="w-3 h-3" aria-hidden="true" /></button>}
                          {task.status !== 'done' && <button type="button" onClick={(e) => shiftStatus(task, 'right', e)} className="icon-button icon-button-small" aria-label="Move right"><ChevronRight className="w-3 h-3" aria-hidden="true" /></button>}
                          <button type="button" onClick={() => handleDeleteTask(task)} className="icon-button icon-button-small hover:!text-danger" aria-label="Delete"><Trash2 className="w-3 h-3" aria-hidden="true" /></button>
                        </div>
                      </div>
                      {task.status === 'done' && task.completed_at && (
                        <span className="flex items-center gap-1 font-mono text-[9px]" style={{ color: 'var(--arcade-paper-disabled)' }}>
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> done {new Date(task.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
