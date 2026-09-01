import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateDailyXP, sumDailyXP } from '../services/stats/calculateDailyXP';
import type { Task, TaskStatus, TaskArea } from '../types';
import { Search, Zap } from 'lucide-react';
import { UndoToast } from '../components/shared/UndoToast';
import { GlassPane, PixelIcon, SystemLabel, TerminalText } from '../components/ui';
import { QuestCard } from '../components/shared/QuestCard';

type GlassTone = React.ComponentProps<typeof GlassPane>['tone'];
type ViewMode = 'command' | 'board';

/**
 * Tasks — Quest Command + Board.
 * Default: Command view ("What should I do next?").
 * Secondary: Board view (Kanban for organization).
 */
export const Tasks: React.FC = () => {
  const { tasks, addTask, moveTask, toggleTodayTask, deleteTask, habits, habitLogs, journal } = useStore(useShallow(s => ({
    tasks: s.tasks,
    addTask: s.addTask,
    moveTask: s.moveTask,
    toggleTodayTask: s.toggleTodayTask,
    deleteTask: s.deleteTask,
    habits: s.habits,
    habitLogs: s.habitLogs,
    journal: s.journal,
  })));

  const [view, setView] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem('bt_tasks_view');
      if (stored === 'board' || stored === 'command') return stored;
    } catch { /* ignore */ }
    return 'command';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<TaskArea | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeMobileColumn, setActiveMobileColumn] = useState<TaskStatus>('todo');

  // Undo toast
  const [pendingDelete, setPendingDelete] = useState<{ title: string; id: string } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { return () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); }; }, []);

  const handleDeleteTask = useCallback((task: { id: string; title: string }) => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    setPendingDelete({ title: task.title, id: task.id });
    deleteTimerRef.current = setTimeout(() => { deleteTask(task.id); setPendingDelete(null); }, 5000);
  }, [deleteTask]);
  const undoDeleteTask = useCallback(() => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); setPendingDelete(null); }, []);

  // XP feedback
  interface FloatingXP { id: number; xp: number; statName: string; x: number; y: number; }
  const [floatingXPs, setFloatingXPs] = useState<FloatingXP[]>([]);
  const [xpNote, setXpNote] = useState<{ id: number; text: string } | null>(null);
  const xpIdRef = useRef(0);
  const triggerXP = (e: React.MouseEvent | null, xp: number, statName: string) => {
    const x = e && 'clientX' in e && e.clientX ? e.clientX : window.innerWidth / 2;
    const y = e && 'clientY' in e && e.clientY ? e.clientY : window.innerHeight / 2;
    const item = { id: ++xpIdRef.current, xp, statName, x, y };
    setFloatingXPs(prev => [...prev, item]);
    setTimeout(() => { setFloatingXPs(prev => prev.filter(p => p.id !== item.id)); }, 1000);
  };
  const showXpNote = (text: string) => {
    const id = ++xpIdRef.current;
    setXpNote({ id, text });
    setTimeout(() => { setXpNote(prev => (prev && prev.id === id ? null : prev)); }, 3000);
  };

  // Form
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
    setTitle(''); setNotes(''); setArea('personal'); setXp(10); setToday(false); setDueDate('');
    setShowAddForm(false);
  };

  // Filter
  const filteredTasks = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchArea = selectedArea === 'all' || t.area === selectedArea;
    return matchSearch && matchArea;
  });

  // Status shift
  const statusOrder: TaskStatus[] = ['backlog', 'todo', 'doing', 'done'];
  const shiftStatus = (task: Task, direction: 'left' | 'right', e?: React.MouseEvent) => {
    const ci = statusOrder.indexOf(task.status);
    let ni = ci;
    if (direction === 'left' && ci > 0) ni--;
    else if (direction === 'right' && ci < statusOrder.length - 1) ni++;
    if (ni !== ci) {
      moveTask(task.id, statusOrder[ni]);
      if (statusOrder[ni] === 'done') {
        if (task.today) triggerXP(e || null, task.xp, task.area);
        else showXpNote(`Done — no XP. Star it for Today to earn +${task.xp} XP.`);
      }
    }
  };

  // Computed
  const openTasks = filteredTasks.filter(t => t.status !== 'done');
  const urgentTasks = openTasks.filter(t => t.due_date && t.due_date <= new Date().toISOString().slice(0, 10));
  const totalXpAvailable = openTasks.reduce((sum, t) => sum + t.xp, 0);
  const completedToday = filteredTasks.filter(t => t.status === 'done' && t.completed_at && t.completed_at.startsWith(new Date().toISOString().slice(0, 10))).length;
  // Canonical daily XP from habit logs, tasks completed today, and journal entries
  const todayStr = new Date().toISOString().slice(0, 10);
  const dailyXP = calculateDailyXP(todayStr, habits, habitLogs, tasks, journal);
  const xpEarnedToday = sumDailyXP(dailyXP);

  // Command view: active quest = first doing, then first todo
  const activeQuest = filteredTasks.find(t => t.status === 'doing') || filteredTasks.find(t => t.status === 'todo');
  const upNextTasks = filteredTasks.filter(t => t.status === 'todo' && t.id !== activeQuest?.id).slice(0, 6);
  const questLogTasks = filteredTasks.filter(t => (t.status === 'todo' || t.status === 'backlog') && t.id !== activeQuest?.id && !upNextTasks.some(u => u.id === t.id));

  // Board view columns
  const boardColumns: { id: TaskStatus; label: string; subtitle: string; tone: GlassTone; icon: string }[] = [
    { id: 'backlog', label: 'BACKLOG', subtitle: 'Planning', tone: 'paper', icon: 'inbox' },
    { id: 'todo', label: 'TO-DO', subtitle: 'Ready', tone: 'cobalt', icon: 'checkbox' },
    { id: 'doing', label: 'DOING', subtitle: 'Active', tone: 'aurora', icon: 'fire' },
    { id: 'done', label: 'DONE', subtitle: 'Complete', tone: 'teal', icon: 'trophy' },
  ];
  const areas: (TaskArea | 'all')[] = ['all', 'health', 'career', 'learning', 'personal', 'creativity'];

  return (
    <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-5">
      {/* Undo toast */}
      {pendingDelete && <UndoToast message={`"${pendingDelete.title}" removing — tap Undo to keep`} onUndo={undoDeleteTask} />}

      {/* Floating XP */}
      {floatingXPs.map(item => (
        <div key={item.id} className="fixed z-30 pointer-events-none" style={{ left: `${item.x}px`, top: `${item.y}px`, transform: 'translate(-50%, -50%)' }}>
          <div className="float-xp">+{item.xp} {item.statName.toUpperCase()} XP</div>
        </div>
      ))}
      {xpNote && <div className="xp-note animate-fade-in" role="status"><Zap className="w-3.5 h-3.5" aria-hidden="true" /><span>{xpNote.text}</span></div>}

      {/* ─── HEADER ─── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <TerminalText tone="primary" prompt>QUEST_COMMAND</TerminalText>
            <SystemLabel tone="muted">{openTasks.length} OPEN · {urgentTasks.length} URGENT · {totalXpAvailable} XP AVAILABLE</SystemLabel>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              const next = view === 'command' ? 'board' : 'command';
              setView(next);
              try { localStorage.setItem('bt_tasks_view', next); } catch { /* ignore */ }
            }}
              className="chip cursor-pointer font-mono text-[10px]" aria-label={`Switch to ${view === 'command' ? 'board' : 'command'} view`}>
              <PixelIcon name={view === 'command' ? 'grid' : 'list'} size={12} className="mr-1" />
              {view === 'command' ? 'BOARD' : 'COMMAND'}
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="insert-coin !py-1.5 !px-3 !text-xs">
              <PixelIcon name="plus" size={14} className="mr-1" /> NEW QUEST
            </button>
          </div>
        </div>
      </div>

      {/* ─── ADD QUEST FORM ─── */}
      {showAddForm && (
        <GlassPane as="form" onSubmit={handleAddTask} state="playing" tone="coral"
          paneTitle="NEW QUEST" screenClassName="!p-4 grid grid-cols-1 sm:grid-cols-2 gap-3" className="animate-fade-in">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--bt-text-muted)' }}>Quest Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Update resume" className="arcade-input" maxLength={200} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--bt-text-muted)' }}>Area</label>
            <select value={area} onChange={e => setArea(e.target.value as TaskArea)} className="arcade-input font-mono">
              <option value="health">Health</option><option value="career">Career</option>
              <option value="learning">Learning</option><option value="personal">Personal</option>
              <option value="creativity">Creativity</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--bt-text-muted)' }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Details…" className="arcade-input min-h-[50px] resize-y" maxLength={500} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--bt-text-muted)' }}>XP</label>
            <input type="number" value={xp} onChange={e => setXp(Number(e.target.value))} min={0} max={1000} className="arcade-input font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="task-today" checked={today} onChange={e => setToday(e.target.checked)} className="w-4 h-4 accent-arcade-gold" />
            <label htmlFor="task-today" className="font-mono text-[10px] font-bold cursor-pointer" style={{ color: 'var(--bt-text-dim)' }}>Star for Today</label>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--bt-text-muted)' }}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="arcade-input font-mono" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost !text-xs">Cancel</button>
            <button type="submit" disabled={!title.trim()} className="insert-coin !py-1.5 !px-4 !text-xs">
              <PixelIcon name="plus" size={14} className="mr-1" /> Add Quest
            </button>
          </div>
        </GlassPane>
      )}

      {/* ─── SEARCH + FILTER ─── */}
      {tasks.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--bt-text-disabled)' }} aria-hidden="true" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search quests…" className="arcade-input !pl-9 !py-1.5" maxLength={120} aria-label="Search tasks" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {areas.map(a => (
              <button key={a} type="button" onClick={() => setSelectedArea(a)} className={`chip cursor-pointer ${selectedArea === a ? 'chip--aurora' : ''}`} style={{ textTransform: 'capitalize' }}>{a}</button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          COMMAND VIEW
         ═══════════════════════════════════════════════════════════════════ */}
      {view === 'command' && (
        <div className="flex flex-col gap-5">
          {/* ─── ACTIVE QUEST — MISSION CONSOLE ─── */}
          <section aria-label="Active quest">
            <div className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--bt-text-muted)' }}>ACTIVE_QUEST</div>
            {activeQuest ? (
              <div className="mt-3 rounded-xl border p-6" style={{ background: 'linear-gradient(180deg, rgba(232,180,90,0.06) 0%, rgba(233,230,242,0.03) 100%)', borderColor: 'rgba(232,180,90,0.3)', boxShadow: '0 4px 24px rgba(232,180,90,0.08)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 rounded" style={{ color: 'var(--obs-gold, #e8b45a)', background: 'rgba(232,180,90,0.12)', border: '1px solid rgba(232,180,90,0.25)' }}>CURRENT QUEST · +{activeQuest.xp} XP</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ color: 'var(--bt-text-muted)', background: 'rgba(233,230,242,0.05)', border: '1px solid rgba(233,230,242,0.08)' }}>{activeQuest.area.toUpperCase()} → +{activeQuest.xp}</span>
                  </div>
                  {activeQuest.due_date && (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{
                      color: activeQuest.due_date <= new Date().toISOString().slice(0, 10) ? 'var(--bt-danger)' : 'var(--bt-text-muted)',
                      background: activeQuest.due_date <= new Date().toISOString().slice(0, 10) ? 'rgba(248,113,113,0.1)' : 'rgba(233,230,242,0.05)'
                    }}>Due {activeQuest.due_date}</span>
                  )}
                </div>
                <h3 className="font-bold text-xl m-0 tracking-tight" style={{ color: 'var(--bt-text)' }}>{activeQuest.title.toUpperCase()}</h3>
                <div className="h-px mt-3 mb-3" style={{ background: 'rgba(233,230,242,0.08)' }} />
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--bt-text-muted)' }}>{activeQuest.area} · Personal · Daily</span>
                </div>
                {activeQuest.notes && <p className="font-mono text-xs m-0 mb-4 leading-relaxed" style={{ color: 'var(--bt-text-muted)' }}>{activeQuest.notes}</p>}
                {!activeQuest.notes && <p className="font-mono text-xs m-0 mb-4" style={{ color: 'var(--bt-text-muted)' }}>Reflect on what actually mattered today.</p>}
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { moveTask(activeQuest.id, 'done'); triggerXP(e, activeQuest.xp, activeQuest.area); }}
                    className="insert-coin !py-2.5 !px-5 !text-sm flex items-center gap-2 font-bold">
                    <PixelIcon name="checkboxOn" size={16} /> COMPLETE QUEST
                  </button>
                  <button onClick={(e) => shiftStatus(activeQuest, 'right', e)} className="btn-ghost !text-xs flex items-center gap-1">
                    <PixelIcon name="chevronRight" size={14} /> DEFER
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border p-6 text-center" style={{ background: 'rgba(233,230,242,0.02)', borderColor: 'rgba(233,230,242,0.06)' }}>
                <PixelIcon name="checkbox" size={28} color="var(--bt-text-disabled)" />
                <SystemLabel tone="muted" className="mt-2">No active quest — start one from UP NEXT</SystemLabel>
              </div>
            )}
          </section>

          {/* ─── UP NEXT — SECONDARY ─── */}
          {upNextTasks.length > 0 && (
            <section aria-label="Up next">
              <div className="font-mono text-xs font-bold tracking-widest" style={{ color: 'var(--bt-text-muted)' }}>UP_NEXT</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {upNextTasks.map(task => (
                  <div key={task.id} className="rounded-lg border p-3 flex flex-col gap-2" style={{ background: 'rgba(233,230,242,0.03)', borderColor: 'rgba(233,230,242,0.06)' }}>
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-sm" style={{ color: 'var(--bt-text)' }}>{task.title}</span>
                      {task.due_date && <span className="font-mono text-[9px] shrink-0" style={{ color: 'var(--bt-text-muted)' }}>{task.due_date}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase" style={{ color: 'var(--bt-text-muted)' }}>{task.area} · +{task.xp} XP</span>
                      <button onClick={() => moveTask(task.id, 'doing')} className="font-mono text-[10px] font-bold px-2 py-0.5 min-h-[28px] rounded cursor-pointer transition"
                        style={{ color: 'var(--obs-gold, #e8b45a)', background: 'rgba(232,180,90,0.1)', border: '1px solid rgba(232,180,90,0.2)' }}
                        aria-label={`Start ${task.title}`}>
                        START
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── QUEST LOG — TERTIARY ─── */}
          {questLogTasks.length > 0 && (
            <section aria-label="Quest log">
              <div className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--bt-text-disabled)' }}>QUEST_LOG</div>
              <div className="mt-2 flex flex-col" style={{ borderTop: '1px solid rgba(233,230,242,0.06)' }}>
                {questLogTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 py-2.5 px-2" style={{ borderBottom: '1px solid rgba(233,230,242,0.04)' }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--bt-text-disabled)' }} aria-hidden="true" />
                    <span className="font-bold text-sm flex-1 truncate" style={{ color: 'var(--bt-text-dim)' }}>{task.title}</span>
                    <span className="font-mono text-[10px] uppercase shrink-0" style={{ color: 'var(--bt-text-muted)' }}>{task.area}</span>
                    <span className="font-mono text-[10px] shrink-0" style={{ color: 'var(--obs-gold, #e8b45a)' }}>+{task.xp}</span>
                    {task.due_date && <span className="font-mono text-[9px] shrink-0" style={{ color: 'var(--bt-text-muted)' }}>{task.due_date}</span>}
                    <button onClick={() => moveTask(task.id, 'doing')} className="font-mono text-[10px] px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                      style={{ color: 'var(--bt-text-muted)', border: '1px solid rgba(233,230,242,0.1)' }}
                      aria-label={`Start ${task.title}`}>▶</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── DAILY SUMMARY — TERTIARY ─── */}
          <section className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4" style={{ borderTop: '1px solid rgba(233,230,242,0.06)' }}>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--bt-text-disabled)' }}>TODAY</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold" style={{ color: 'var(--bt-text)' }}>{completedToday} COMPLETED</span>
                <span className="font-mono text-sm" style={{ color: 'var(--obs-gold, #e8b45a)' }}>+{xpEarnedToday} XP</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          BOARD VIEW (Kanban — secondary)
         ═══════════════════════════════════════════════════════════════════ */}
      {view === 'board' && (
        <div className="flex flex-col gap-4">
          {/* Desktop Kanban — DOING is the hero column */}
          <div className="hidden md:grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1.35fr 1fr' }}>
            {boardColumns.map(col => {
              const colTasks = filteredTasks.filter(t => t.status === col.id);
              const isDoing = col.id === 'doing';
              return (
                <GlassPane key={col.id} state={isDoing ? 'playing' : 'off'} tone={col.tone} paneTitle={col.label}
                  titleRight={<SystemLabel tone="muted">{colTasks.length}</SystemLabel>}
                  className={`min-h-[200px] ${isDoing ? 'shadow-[0_0_24px_rgba(232,180,90,0.08)]' : ''}`}
                  screenClassName={`!p-2.5 flex flex-col gap-1.5 min-h-[160px] ${isDoing ? '!bg-[rgba(232,180,90,0.04)]' : ''}`}
                  style={isDoing ? { borderColor: 'rgba(232,180,90,0.22)' } as React.CSSProperties : undefined}>
                  {colTasks.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5 py-6">
                      <PixelIcon name={col.icon as never} size={18} color="var(--bt-text-disabled)" />
                      <SystemLabel tone="muted">Empty</SystemLabel>
                    </div>
                  ) : colTasks.map(task => (
                    <QuestCard key={task.id} task={task} isCompleted={task.status === 'done'} extended
                      onComplete={(e) => {
                        const next = task.status === 'done' ? 'todo' : 'done';
                        moveTask(task.id, next);
                        if (next === 'done') { if (task.today) triggerXP(e, task.xp, task.area); else showXpNote(`Done — no XP. Star it for Today to earn +${task.xp} XP.`); }
                      }}
                      onShiftLeft={(e) => shiftStatus(task, 'left', e)}
                      onShiftRight={(e) => shiftStatus(task, 'right', e)}
                      showShiftLeft={col.id !== 'backlog'} showShiftRight={col.id !== 'done'}
                      onToggleToday={() => toggleTodayTask(task.id)}
                      onDelete={() => handleDeleteTask(task)} />
                  ))}
                </GlassPane>
              );
            })}
          </div>
          {/* Mobile column tabs */}
          <div className="md:hidden flex gap-1.5">
            {boardColumns.map(col => (
              <button key={col.id} type="button" onClick={() => setActiveMobileColumn(col.id)}
                className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-[10px] font-bold cursor-pointer transition ${activeMobileColumn === col.id ? 'chip chip--aurora' : 'chip'}`}>
                {col.label} ({filteredTasks.filter(t => t.status === col.id).length})
              </button>
            ))}
          </div>
          <div className="md:hidden">
            {boardColumns.filter(col => col.id === activeMobileColumn).map(col => {
              const colTasks = filteredTasks.filter(t => t.status === col.id);
              return (
                <GlassPane key={col.id} state="off" tone={col.tone} paneTitle={col.label} screenClassName="!p-2.5 flex flex-col gap-1.5">
                  {colTasks.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5 py-6">
                      <PixelIcon name={col.icon as never} size={18} color="var(--bt-text-disabled)" />
                      <SystemLabel tone="muted">Empty</SystemLabel>
                    </div>
                  ) : colTasks.map(task => (
                    <QuestCard key={task.id} task={task} isCompleted={task.status === 'done'} extended
                      onComplete={(e) => {
                        const next = task.status === 'done' ? 'todo' : 'done';
                        moveTask(task.id, next);
                        if (next === 'done') { if (task.today) triggerXP(e, task.xp, task.area); else showXpNote(`Done — no XP. Star it for Today to earn +${task.xp} XP.`); }
                      }}
                      onShiftLeft={(e) => shiftStatus(task, 'left', e)}
                      onShiftRight={(e) => shiftStatus(task, 'right', e)}
                      showShiftLeft={col.id !== 'backlog'} showShiftRight={col.id !== 'done'}
                      onToggleToday={() => toggleTodayTask(task.id)}
                      onDelete={() => handleDeleteTask(task)} />
                  ))}
                </GlassPane>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
