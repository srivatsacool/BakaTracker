import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import type { Task, EisenhowerQuadrant, TaskArea } from '../types';
import { Plus, ExternalLink, Trash2 } from 'lucide-react';

type QuadrantKey = 'do' | 'schedule' | 'delegate' | 'delete';

const QUADRANTS: {
  key: QuadrantKey;
  label: string;
  subtitle: string;
  emoji: string;
  accent: string;
  description: string;
}[] = [
  {
    key: 'do',
    label: 'Do First',
    subtitle: 'Urgent + Important',
    emoji: '🔥',
    accent: 'var(--arcade-red)',
    description: 'Crises, pressing deadlines, urgent health issues. Do these today.',
  },
  {
    key: 'schedule',
    label: 'Schedule',
    subtitle: 'Important, Not Urgent',
    emoji: '📅',
    accent: 'var(--arcade-cobalt)',
    description: 'Long-term goals, learning, planning. Block time on your calendar.',
  },
  {
    key: 'delegate',
    label: 'Delegate',
    subtitle: 'Urgent, Not Important',
    emoji: '👥',
    accent: 'var(--arcade-gold)',
    description: 'Routine tasks that need doing but don\'t need you specifically.',
  },
  {
    key: 'delete',
    label: 'Eliminate',
    subtitle: 'Not Urgent, Not Important',
    emoji: '🗑️',
    accent: 'var(--arcade-paper-muted)',
    description: 'Distractions and busywork. Delete or ignore these.',
  },
];

const getAreaColor = (area: TaskArea): string => {
  switch (area) {
    case 'health': return 'var(--arcade-green)';
    case 'career': return 'var(--arcade-gold)';
    case 'learning': return 'var(--arcade-cobalt)';
    case 'personal': return 'var(--arcade-magenta)';
    case 'creativity': return 'var(--arcade-red)';
  }
};

const TaskCard: React.FC<{
  task: Task;
  onAssign: (q: EisenhowerQuadrant) => void;
  onDelete: () => void;
  onMoveToKanban: () => void;
  showQuadrantPicker?: boolean;
  compact?: boolean;
}> = ({ task, onAssign, onDelete, onMoveToKanban, showQuadrantPicker = false, compact = false }) => {
  // pickerOpen intentionally unused; quadrants render inline

  return (
    <div className="relative cabinet !overflow-visible !shadow-none p-3 flex flex-col gap-2 transition hover:scale-[1.01]" style={{ background: 'rgba(242,242,242,0.04)', border: '1px solid rgba(242,242,242,0.1)', borderRadius: 10 }}>
      <div className="flex items-start justify-between gap-2">
        <h4 className={`font-bold leading-snug flex-1 m-0 ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: 'var(--arcade-paper)' }}>{task.title}</h4>
        <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0 group-hover/card:!opacity-100" style={{ opacity: 0 }}>
          <button onClick={onMoveToKanban} title="Open in Kanban" className="p-1 rounded cursor-pointer hover:bg-white/10" style={{ border: '1px solid rgba(242,242,242,0.15)' }}>
            <ExternalLink className="w-3 h-3" />
          </button>
          <button onClick={onDelete} title="Delete task" className="p-1 rounded cursor-pointer hover:bg-white/10 hover:text-danger" style={{ border: '1px solid rgba(242,242,242,0.15)' }}>
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 items-center">
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded chip" style={{ color: getAreaColor(task.area), borderColor: `${getAreaColor(task.area)}44`, background: `${getAreaColor(task.area)}12` }}>
          {task.area}
        </span>
        <span className="font-mono text-[9px] score-readout chip chip--gold">+{task.xp} XP</span>
        {task.due_date && (
          <span className="font-mono text-[9px] chip">{task.due_date}</span>
        )}
      </div>

      {showQuadrantPicker && (
        <div className="flex flex-wrap gap-1 mt-1">
          {QUADRANTS.map(q => (
            <button
              key={q.key}
              type="button"
              onClick={() => { onAssign(q.key); }}
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded cursor-pointer chip"
              style={{ color: q.accent, borderColor: `${q.accent}44`, background: `${q.accent}10` }}
            >
              {q.emoji} {q.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Eisenhower — the matrix cabinet. Sort work by urgency × importance:
 * Do First / Schedule / Delegate / Eliminate, plus the unassigned inbox.
 */
export const Eisenhower: React.FC = () => {
  const { tasks, assignQuadrant, deleteTask } = useStore();
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const [title, setTitle] = useState('');
  const [area, setArea] = useState<TaskArea>('personal');
  const [xp, setXp] = useState(10);

  const getQuadrantTasks = (q: QuadrantKey) => tasks.filter(t => t.quadrant === q);
  const unassigned = tasks.filter(t => t.quadrant === null);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    // Add to the matrix via the store's addTask (quadrant set after creation)
    const { addTask } = useStore.getState();
    addTask(title, '', area, Number(xp) || 10, false);
    setTitle('');
    setArea('personal');
    setXp(10);
    setShowAddForm(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="marquee-title text-2xl m-0" style={{ color: 'var(--arcade-paper)' }}>Priority Matrix</h2>
          <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Sort work by urgency and importance when everything feels loud.</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="insert-coin !text-xs w-full md:w-auto justify-center">
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>New task</span>
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="cabinet cabinet--playing animate-fade-in" style={{ '--marquee-color': 'var(--arcade-orange)' } as React.CSSProperties}>
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">Add to inbox</span>
          </div>
          <div className="cabinet-screen !p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Call the dentist" className="arcade-input" maxLength={200} required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>Area</label>
              <select value={area} onChange={e => setArea(e.target.value as TaskArea)} className="arcade-input font-mono">
                <option value="health">Health</option>
                <option value="career">Career</option>
                <option value="learning">Learning</option>
                <option value="personal">Personal</option>
                <option value="creativity">Creativity</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>XP</label>
              <input type="number" value={xp} onChange={e => setXp(Number(e.target.value))} min={0} className="arcade-input font-mono" />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost !text-xs">Cancel</button>
              <button type="submit" disabled={!title.trim()} className="insert-coin !py-2 !px-4 !text-xs"><span className="coin-slot" aria-hidden="true" /> Add to inbox</button>
            </div>
          </div>
        </form>
      )}

      {justAdded && (
        <p className="font-mono text-[10px] text-success m-0 animate-fade-in">Added — assign it to a quadrant below.</p>
      )}

      {/* The 2×2 grid */}
      <div id="eisenhower-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map(q => {
          const qTasks = getQuadrantTasks(q.key);
          return (
            <section key={q.key} className="cabinet cabinet--off" style={{ '--marquee-color': q.accent } as React.CSSProperties}>
              <div className="cabinet-marquee">
                <span className="cabinet-led" aria-hidden="true" />
                <span className="cabinet-marquee-title">{q.emoji} {q.label}</span>
                <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: q.accent }}>{qTasks.length}</span>
              </div>
              <div className="cabinet-screen !p-3 min-h-[140px] flex flex-col gap-2">
                <p className="m-0 font-mono text-[9px] uppercase" style={{ color: 'var(--arcade-paper-muted)' }}>{q.subtitle}</p>
                {qTasks.length === 0 ? (
                  <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>Empty bay</p>
                ) : (
                  qTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onAssign={q => assignQuadrant(task.id, q)}
                      onDelete={() => deleteTask(task.id)}
                      onMoveToKanban={() => navigate('/tasks')}
                      compact
                    />
                  ))
                )}
                <p className="m-0 font-mono text-[9px] leading-relaxed" style={{ color: 'var(--arcade-paper-disabled)' }}>{q.description}</p>
              </div>
            </section>
          );
        })}
      </div>

      {/* Inbox — unassigned */}
      <section className="cabinet cabinet--attract" style={{ '--marquee-color': 'var(--arcade-gold)' } as React.CSSProperties}>
        <div className="cabinet-marquee">
          <span className="cabinet-led" aria-hidden="true" />
          <span className="cabinet-marquee-title">Inbox · unassigned</span>
          <span className="ml-auto font-mono text-[10px] score-readout" style={{ color: 'var(--arcade-gold)' }}>{unassigned.length}</span>
        </div>
        <div className="cabinet-screen !p-4">
          {unassigned.length === 0 ? (
            <p className="m-0 py-4 text-center font-mono text-[10px]" style={{ color: 'var(--arcade-paper-disabled)' }}>Nothing waiting — every quest has a quadrant.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {unassigned.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAssign={q => assignQuadrant(task.id, q)}
                  onDelete={() => deleteTask(task.id)}
                  onMoveToKanban={() => navigate('/tasks')}
                  showQuadrantPicker
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
