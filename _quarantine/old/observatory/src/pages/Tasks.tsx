import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Task, TaskStatus, TaskArea } from '../types';
import { Plus, Search, Star, ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-react';

/**
 * Tasks — the action cabinet. Four-column Kanban:
 * Backlog → Todo → Doing → Done, with areas, due dates, XP, today stars.
 */
export const Tasks: React.FC = () => {
  const { tasks, addTask, moveTask, toggleTodayTask, deleteTask } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<TaskArea | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeMobileColumn, setActiveMobileColumn] = useState<TaskStatus>('todo');

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

  const shiftStatus = (task: Task, direction: 'left' | 'right') => {
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
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">

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
          <span>New Master Task</span>
        </button>
      </div>

      {/* Task Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="cabinet cabinet--playing animate-fade-in" style={{ '--marquee-color': 'var(--arcade-red)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Create master task</span>
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--arcade-paper-disabled)' }} aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search quests…"
            className="arcade-input !pl-9"
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
                      style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid rgba(242,242,242,0.09)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`m-0 text-xs font-bold ${task.status === 'done' ? 'line-through' : ''}`} style={{ color: 'var(--arcade-paper)' }}>{task.title}</p>
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
                            <button type="button" onClick={() => shiftStatus(task, 'left')} className="icon-button icon-button-small" aria-label={`Move ${task.title} left`}>
                              <ChevronLeft className="w-3 h-3" aria-hidden="true" />
                            </button>
                          )}
                          {task.status !== 'done' && (
                            <button type="button" onClick={() => shiftStatus(task, 'right')} className="icon-button icon-button-small" aria-label={`Move ${task.title} right`}>
                              <ChevronRight className="w-3 h-3" aria-hidden="true" />
                            </button>
                          )}
                          <button type="button" onClick={() => deleteTask(task.id)} className="icon-button icon-button-small hover:!text-danger" aria-label={`Delete ${task.title}`}>
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      {task.due_date && (
                        <span className="flex items-center gap-1 font-mono text-[9px]" style={{ color: 'var(--arcade-paper-muted)' }}>
                          <Calendar className="w-3 h-3" aria-hidden="true" /> {task.due_date}
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
                    <div key={task.id} className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(242,242,242,0.03)', border: '1px solid rgba(242,242,242,0.09)' }}>
                      <p className="m-0 text-xs font-bold" style={{ color: 'var(--arcade-paper)' }}>{task.title}</p>
                      {task.notes && <p className="m-0 text-[10px]" style={{ color: 'var(--arcade-paper-muted)' }}>{task.notes}</p>}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] chip" style={{ color: getAreaColor(task.area), borderColor: `${getAreaColor(task.area)}44`, background: `${getAreaColor(task.area)}12` }}>{task.area}</span>
                          <span className="font-mono text-[9px] score-readout" style={{ color: 'var(--arcade-gold)' }}>+{task.xp}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => toggleTodayTask(task.id)} className="icon-button icon-button-small" style={{ color: task.today ? 'var(--arcade-gold)' : 'var(--arcade-paper-disabled)' }} aria-label="Toggle today star"><Star className="w-3 h-3" aria-hidden="true" /></button>
                          {task.status !== 'backlog' && <button type="button" onClick={() => shiftStatus(task, 'left')} className="icon-button icon-button-small" aria-label="Move left"><ChevronLeft className="w-3 h-3" aria-hidden="true" /></button>}
                          {task.status !== 'done' && <button type="button" onClick={() => shiftStatus(task, 'right')} className="icon-button icon-button-small" aria-label="Move right"><ChevronRight className="w-3 h-3" aria-hidden="true" /></button>}
                          <button type="button" onClick={() => deleteTask(task.id)} className="icon-button icon-button-small hover:!text-danger" aria-label="Delete"><Trash2 className="w-3 h-3" aria-hidden="true" /></button>
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
    </div>
  );
};
