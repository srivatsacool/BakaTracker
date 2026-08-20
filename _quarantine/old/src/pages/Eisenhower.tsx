import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import type { Task, EisenhowerQuadrant, TaskArea } from '../types';
import { Plus, ExternalLink, Trash2, ArrowRight, LayoutGrid } from 'lucide-react';

type QuadrantKey = 'do' | 'schedule' | 'delegate' | 'delete';

const QUADRANTS: {
  key: QuadrantKey;
  label: string;
  subtitle: string;
  emoji: string;
  colorClass: string;
  badgeClass: string;
  headerClass: string;
  description: string;
}[] = [
  {
    key: 'do',
    label: 'Do First',
    subtitle: 'Urgent + Important',
    emoji: '🔥',
    colorClass: 'bg-red-50 dark:bg-red-950/20',
    badgeClass: 'bg-red-500 text-white',
    headerClass: 'border-red-500 bg-red-500/10',
    description: 'Crises, pressing deadlines, urgent health issues. Do these today.',
  },
  {
    key: 'schedule',
    label: 'Schedule',
    subtitle: 'Important, Not Urgent',
    emoji: '📅',
    colorClass: 'bg-blue-50 dark:bg-blue-950/20',
    badgeClass: 'bg-blue-500 text-white',
    headerClass: 'border-blue-500 bg-blue-500/10',
    description: 'Long-term goals, learning, planning. Block time on your calendar.',
  },
  {
    key: 'delegate',
    label: 'Delegate',
    subtitle: 'Urgent, Not Important',
    emoji: '👥',
    colorClass: 'bg-amber-50 dark:bg-amber-950/20',
    badgeClass: 'bg-amber-500 text-black',
    headerClass: 'border-amber-500 bg-amber-500/10',
    description: 'Routine tasks that need doing but don\'t need you specifically.',
  },
  {
    key: 'delete',
    label: 'Eliminate',
    subtitle: 'Not Urgent, Not Important',
    emoji: '🗑️',
    colorClass: 'bg-gray-100 dark:bg-gray-800/30',
    badgeClass: 'bg-gray-500 text-white',
    headerClass: 'border-gray-400 bg-gray-400/10',
    description: 'Distractions and busywork. Delete or ignore these.',
  },
];

const getAreaColor = (area: TaskArea): string => {
  switch (area) {
    case 'health': return 'bg-green-100 text-green-800 border-green-200';
    case 'career': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'learning': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'personal': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'creativity': return 'bg-pink-100 text-pink-800 border-pink-200';
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
  const [pickerOpen, setPickerOpen] = useState(showQuadrantPicker);

  return (
    <div className={`relative group/card neo-card bg-white dark:bg-surface border-2 border-black p-3 flex flex-col gap-2 shadow-[2px_2px_0px_black] hover:shadow-[3px_3px_0px_black] transition-all ${compact ? 'text-xs' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className={`font-black leading-snug flex-1 ${compact ? 'text-xs' : 'text-sm'}`}>{task.title}</h4>
        <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onMoveToKanban}
            title="Open in Kanban"
            className="p-1 rounded border border-black/20 hover:border-black hover:bg-gray-50 transition"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={onDelete}
            title="Delete task"
            className="p-1 rounded border border-black/20 hover:border-red-500 hover:bg-red-50 hover:text-red-500 transition"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 items-center">
        <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${getAreaColor(task.area)}`}>
          {task.area}
        </span>
        <span className="text-[9px] font-mono font-bold bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600">
          +{task.xp} XP
        </span>
        {task.due_date && (
          <span className="text-[9px] font-mono font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200">
            Due {task.due_date}
          </span>
        )}
        {task.status === 'done' && (
          <span className="text-[9px] font-mono font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200">
            ✓ Done
          </span>
        )}
      </div>

      {/* Reassign picker */}
      {!compact && (
        <div className="border-t border-black/10 pt-2 mt-1">
          {pickerOpen ? (
            <div className="flex gap-1 flex-wrap">
              {QUADRANTS.map(q => (
                <button
                  key={q.key}
                  onClick={() => { onAssign(q.key); setPickerOpen(false); }}
                  className={`text-[9px] font-black font-mono px-1.5 py-0.5 rounded border border-black transition hover:opacity-80 ${q.badgeClass}`}
                >
                  {q.emoji} {q.label}
                </button>
              ))}
              <button
                onClick={() => { onAssign(null); setPickerOpen(false); }}
                className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded border border-black bg-white hover:bg-gray-50 transition"
              >
                ✕ Unassign
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPickerOpen(true)}
              className="text-[9px] font-mono font-bold text-gray-400 hover:text-black transition flex items-center gap-1"
            >
              <ArrowRight className="w-2.5 h-2.5" /> Reassign quadrant
            </button>
          )}
        </div>
      )}

      {/* Inline assign for unassigned inbox */}
      {compact && (
        <div className="flex gap-1 flex-wrap mt-1 border-t border-black/10 pt-1.5">
          {QUADRANTS.map(q => (
            <button
              key={q.key}
              onClick={() => onAssign(q.key)}
              className={`text-[9px] font-black font-mono px-1.5 py-0.5 rounded border border-black/30 hover:border-black transition ${q.badgeClass} opacity-80 hover:opacity-100`}
            >
              {q.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Eisenhower: React.FC = () => {
  const { tasks, addTask, deleteTask, moveTask, assignQuadrant } = useStore();
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArea, setNewArea] = useState<TaskArea>('personal');
  const [newXP, setNewXP] = useState(10);
  const [newDueDate, setNewDueDate] = useState('');
  const [newQuadrant, setNewQuadrant] = useState<EisenhowerQuadrant>('do');

  const activeTasks = tasks.filter(t => t.status !== 'done' || t.quadrant !== null);

  const getQuadrantTasks = (q: QuadrantKey) =>
    tasks.filter(t => t.quadrant === q);

  const unassigned = tasks.filter(t => t.quadrant === null && t.status !== 'done');

  const stats = {
    do: getQuadrantTasks('do').length,
    schedule: getQuadrantTasks('schedule').length,
    delegate: getQuadrantTasks('delegate').length,
    delete: getQuadrantTasks('delete').length,
    unassigned: unassigned.length,
    total: activeTasks.length,
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addTask(newTitle, '', newArea, newXP, false, newDueDate || undefined);
    // After adding, assign quadrant
    setTimeout(() => {
      const { tasks: currentTasks } = useStore.getState();
      const justAdded = currentTasks.find(t => t.title === newTitle);
      if (justAdded && newQuadrant) {
        assignQuadrant(justAdded.id, newQuadrant);
      }
    }, 50);
    setNewTitle('');
    setNewDueDate('');
    setShowAddForm(false);
  };

  return (
    <div id="eisenhower-page" className="max-w-6xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-accent-pink" />
            Eisenhower Matrix
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5 italic">
            "What is important is seldom urgent, and what is urgent is seldom important." — Eisenhower
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/tasks')}
            className="px-4 py-2 border-2 border-black rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-50 transition"
          >
            <ExternalLink className="w-4 h-4" /> Kanban View
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="neo-button flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-5 gap-2">
        {(['do', 'schedule', 'delegate', 'delete'] as QuadrantKey[]).map(q => {
          const cfg = QUADRANTS.find(x => x.key === q)!;
          return (
            <div key={q} className={`neo-card p-3 border-2 border-black flex flex-col items-center gap-1 ${cfg.colorClass}`}>
              <span className="text-lg">{cfg.emoji}</span>
              <span className="font-black text-xl">{stats[q]}</span>
              <span className="text-[9px] font-mono font-bold text-gray-500 text-center">{cfg.label}</span>
            </div>
          );
        })}
        <div className="neo-card p-3 border-2 border-black flex flex-col items-center gap-1 bg-gray-50 dark:bg-gray-800/30">
          <span className="text-lg">📥</span>
          <span className="font-black text-xl">{stats.unassigned}</span>
          <span className="text-[9px] font-mono font-bold text-gray-500 text-center">Unassigned</span>
        </div>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="neo-card p-5 bg-white dark:bg-surface border-2 border-black flex flex-col gap-3">
          <h3 className="font-black border-b border-black/10 pb-2">Add Task to Matrix</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Task title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="neo-input"
              required
            />
            <select value={newArea} onChange={e => setNewArea(e.target.value as TaskArea)} className="neo-input font-mono">
              <option value="health">💪 Health</option>
              <option value="career">💼 Career</option>
              <option value="learning">🧠 Learning</option>
              <option value="personal">⚔️ Personal</option>
              <option value="creativity">🎨 Creativity</option>
            </select>
            <select value={newQuadrant ?? 'do'} onChange={e => setNewQuadrant(e.target.value as EisenhowerQuadrant)} className="neo-input font-mono">
              {QUADRANTS.map(q => (
                <option key={q.key} value={q.key}>{q.emoji} {q.label} — {q.subtitle}</option>
              ))}
            </select>
            <input
              type="number"
              value={newXP}
              onChange={e => setNewXP(Number(e.target.value))}
              min={5}
              className="neo-input font-mono"
              placeholder="XP Reward"
            />
            <input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="neo-input font-mono"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border-2 border-black rounded-lg font-bold hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" className="neo-button bg-success text-white">Add to Matrix</button>
          </div>
        </form>
      )}

      {/* 2x2 Grid */}
      <div id="eisenhower-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map(cfg => {
          const qTasks = getQuadrantTasks(cfg.key);
          return (
            <div
              key={cfg.key}
              className={`neo-card border-2 border-black flex flex-col gap-3 p-4 ${cfg.colorClass} min-h-[220px]`}
            >
              {/* Quadrant header */}
              <div className={`flex items-start justify-between p-3 rounded-lg border-2 ${cfg.headerClass}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cfg.emoji}</span>
                    <div>
                      <h3 className="font-black text-sm">{cfg.label}</h3>
                      <p className="text-[10px] font-mono text-gray-600 dark:text-gray-400">{cfg.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono mt-1 italic">{cfg.description}</p>
                </div>
                <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full border border-black ${cfg.badgeClass}`}>
                  {qTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex flex-col gap-2 flex-1">
                {qTasks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-black/20 rounded-lg py-6">
                    <p className="text-xs text-gray-400 font-mono text-center px-2">
                      No tasks here yet.<br />Assign tasks from the inbox below.
                    </p>
                  </div>
                ) : (
                  qTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onAssign={(q) => assignQuadrant(task.id, q)}
                      onDelete={() => deleteTask(task.id)}
                      onMoveToKanban={() => {
                        moveTask(task.id, 'todo');
                        navigate('/tasks');
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unassigned Inbox */}
      <div className="neo-card border-2 border-black p-5 bg-white dark:bg-surface">
        <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
          <div>
            <h3 className="font-black flex items-center gap-2">
              📥 Unassigned Inbox
              <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5 rounded">
                {unassigned.length}
              </span>
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">Tasks not yet prioritised — assign them to a quadrant.</p>
          </div>
        </div>

        {unassigned.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-sm font-black">All tasks are prioritised!</p>
            <p className="text-xs font-mono text-gray-400 mt-1">You're a master of focus.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unassigned.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                compact
                onAssign={(q) => assignQuadrant(task.id, q)}
                onDelete={() => deleteTask(task.id)}
                onMoveToKanban={() => navigate('/tasks')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="neo-card border-2 border-black p-4 bg-white dark:bg-surface">
        <h4 className="font-black text-sm mb-3">📖 Matrix Guide</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUADRANTS.map(q => (
            <div key={q.key} className={`p-3 rounded-lg border-2 border-black ${q.colorClass}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span>{q.emoji}</span>
                <span className="font-black text-xs">{q.label}</span>
              </div>
              <p className="text-[10px] font-mono text-gray-500 leading-relaxed">{q.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
