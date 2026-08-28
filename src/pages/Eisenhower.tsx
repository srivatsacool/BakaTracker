import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import type { TaskArea, EisenhowerQuadrant } from '../types';
import { GlassPane, PixelIcon, SystemLabel } from '../components/ui';
import { MatrixQuadrant } from '../components/shared/MatrixQuadrant';
import { EisenhowerHUD } from '../components/shared/EisenhowerHUD';

type QuadrantKey = 'do' | 'schedule' | 'delegate' | 'delete';

const QUADRANTS: {
  key: QuadrantKey;
  label: string;
  subtitle: string;
  icon: string;
  accent: string;
  description: string;
  tone: 'aurora' | 'cobalt' | 'teal' | 'green' | 'coral' | 'amber' | 'magenta' | 'paper';
  emptyMessage: string;
}[] = [
  { key: 'do', label: 'DO FIRST', subtitle: 'Urgent + Important', icon: 'fire', accent: 'var(--bt-danger)', description: 'Crises, pressing deadlines, urgent health issues. Do these today.', tone: 'coral', emptyMessage: 'No urgent quests' },
  { key: 'schedule', label: 'SCHEDULE', subtitle: 'Important, Not Urgent', icon: 'calendar', accent: 'var(--bt-info)', description: 'Long-term goals, learning, planning. Block time on your calendar.', tone: 'cobalt', emptyMessage: 'No planned quests' },
  { key: 'delegate', label: 'DELEGATE', subtitle: 'Urgent, Not Important', icon: 'users', accent: 'var(--bt-xp)', description: 'Routine tasks that need doing but don\'t need you specifically.', tone: 'amber', emptyMessage: 'No support quests' },
  { key: 'delete', label: 'ELIMINATE', subtitle: 'Not Urgent, Not Important', icon: 'trash', accent: 'var(--bt-text-muted)', description: 'Distractions and busywork. Delete or ignore these.', tone: 'paper', emptyMessage: 'Board clear' },
];

/**
 * Eisenhower — the tactical priority board. Sort work by urgency × importance:
 * Do First / Schedule / Delegate / Eliminate, plus the unassigned inbox.
 */
export const Eisenhower: React.FC = () => {
  const { tasks, assignQuadrant, deleteTask } = useStore(useShallow(s => ({
    tasks: s.tasks,
    assignQuadrant: s.assignQuadrant,
    deleteTask: s.deleteTask,
  })));
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const [title, setTitle] = useState('');
  const [area, setArea] = useState<TaskArea>('personal');
  const [xp, setXp] = useState(10);

  const getQuadrantTasks = (q: QuadrantKey) => tasks.filter(t => t.quadrant === q);
  const unassigned = tasks.filter(t => t.quadrant === null);
  const matrixEmpty = QUADRANTS.every(q => getQuadrantTasks(q.key).length === 0);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const { addTask } = useStore.getState();
    addTask(title, '', area, Number(xp) || 10, false);
    setTitle(''); setArea('personal'); setXp(10);
    setShowAddForm(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  // HUD stats
  const totalAssigned = tasks.filter(t => t.quadrant !== null).length;
  const urgent = tasks.filter(t => t.quadrant === 'do' || t.quadrant === 'delete').length;
  const important = tasks.filter(t => t.quadrant === 'do' || t.quadrant === 'schedule').length;

  const quadrantMeta = QUADRANTS.map(q => ({ key: q.key, label: q.label, icon: q.icon }));

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* HUD */}
      <EisenhowerHUD totalAssigned={totalAssigned} urgent={urgent} important={important} unassigned={unassigned.length} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10">
        <div>
          <h2 className="marquee-title text-2xl m-0" style={{ color: 'var(--bt-text)' }}>
            <span style={{ color: 'var(--bt-text)' }}>EISENHOWER </span>
            <span style={{ color: 'var(--bt-text-muted)' }}>MATRIX</span>
          </h2>
          <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--bt-text-muted)' }}>
            Sort work by urgency and importance when everything feels loud.
          </p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="insert-coin !text-xs w-full md:w-auto justify-center">
          <PixelIcon name="plus" size={14} className="mr-1" />
          <span>NEW QUEST</span>
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <GlassPane as="form" onSubmit={handleAddTask} state="playing" tone="amber"
          paneTitle="ADD TO INBOX" screenClassName="!p-4 grid grid-cols-1 md:grid-cols-3 gap-3"
          className="animate-fade-in z-10">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--bt-text-muted)' }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Call the dentist" className="arcade-input" maxLength={200} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--bt-text-muted)' }}>Area</label>
            <select value={area} onChange={e => setArea(e.target.value as TaskArea)} className="arcade-input font-mono">
              <option value="health">Health</option>
              <option value="career">Career</option>
              <option value="learning">Learning</option>
              <option value="personal">Personal</option>
              <option value="creativity">Creativity</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] font-bold uppercase" style={{ color: 'var(--bt-text-muted)' }}>XP</label>
            <input type="number" value={xp} onChange={e => setXp(Number(e.target.value))} min={0} max={1000} className="arcade-input font-mono" />
          </div>
          <div className="md:col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost !text-xs">Cancel</button>
            <button type="submit" disabled={!title.trim()} className="insert-coin !py-2 !px-4 !text-xs"><span className="coin-slot" aria-hidden="true" /> Add to inbox</button>
          </div>
        </GlassPane>
      )}

      {justAdded && (
        <SystemLabel tone="success" className="animate-fade-in z-10">Added — assign it to a quadrant below.</SystemLabel>
      )}

      {/* Empty-matrix celebration */}
      {matrixEmpty && (
        <GlassPane state={unassigned.length === 0 ? 'attract' : 'off'} tone="aurora"
          paneTitle={unassigned.length === 0 ? 'ALL BAYS CLEAR' : 'NOTHING SORTED YET'}
          screenClassName="!p-4" className="z-10">
          <p className="m-0 font-mono text-[10px] leading-relaxed" style={{ color: 'var(--bt-text-muted)' }}>
            {unassigned.length === 0
              ? 'A quiet matrix — no quests waiting, nothing loud. When something arrives, it lands in the inbox below.'
              : `The grid is empty but the inbox holds ${unassigned.length} — assign each one a quadrant to sort the noise.`}
          </p>
        </GlassPane>
      )}

      {/* The 2×2 grid */}
      <div id="eisenhower-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4 z-10">
        {QUADRANTS.map(q => (
          <MatrixQuadrant
            key={q.key}
            label={q.label}
            subtitle={q.subtitle}
            icon={q.icon}
            accent={q.accent}
            description={q.description}
            tasks={getQuadrantTasks(q.key)}
            onAssign={(taskId, quadrant) => assignQuadrant(taskId, quadrant as EisenhowerQuadrant)}
            onDelete={(taskId) => deleteTask(taskId)}
            onNavigate={() => navigate('/tasks')}
            quadrantKey={q.key}
            allQuadrants={quadrantMeta}
            emptyMessage={q.emptyMessage}
            tone={q.tone}
          />
        ))}
      </div>

      {/* Inbox — unassigned */}
      <GlassPane state="attract" tone="aurora" paneTitle="INBOX · UNASSIGNED"
        titleRight={<SystemLabel tone="primary">{unassigned.length}</SystemLabel>}
        screenClassName="!p-4" className="z-10">
        {unassigned.length === 0 ? (
          <SystemLabel tone="muted">Nothing waiting — every quest has a quadrant.</SystemLabel>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unassigned.map(task => {
              const areaIcons: Record<string, string> = { health: 'fire', career: 'briefcase', learning: 'book', personal: 'sword', creativity: 'brush', default: 'goal' };
              const areaTones: Record<string, string> = { health: 'success', career: 'info', learning: 'primary', personal: 'warning', creativity: 'rose', default: 'default' };
              const iconName = areaIcons[task.area] || areaIcons.default;
              const tone = areaTones[task.area] || areaTones.default;
              return (
                <div key={task.id} className="group p-2.5 rounded-lg flex flex-col gap-1.5 border transition-all duration-150 hover:bg-white/[0.03]"
                  style={{ background: 'rgba(242,242,242,0.025)', borderColor: 'var(--bt-border-soft)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <PixelIcon name={iconName as never} size={12} color={`var(--bt-${tone === 'default' ? 'text-muted' : tone})`} className="shrink-0 opacity-60" />
                      <p className="m-0 text-xs font-bold truncate" style={{ color: 'var(--bt-text)' }}>{task.title}</p>
                    </div>
                    <button onClick={() => deleteTask(task.id)} title="Delete task" className="icon-button icon-button-small hover:!text-danger opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Delete ${task.title}`}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: `var(--bt-${tone})`, borderColor: `var(--bt-${tone})`, background: `var(--bt-${tone})`, opacity: 0.15 }}>{task.area}</span>
                    <SystemLabel tone="primary" className="!text-[8px]">+{task.xp}</SystemLabel>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {QUADRANTS.map(q => (
                      <button key={q.key} type="button" onClick={() => assignQuadrant(task.id, q.key as EisenhowerQuadrant)}
                        className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded cursor-pointer border transition hover:scale-105"
                        style={{ color: 'var(--bt-text-muted)', borderColor: 'var(--bt-border-soft)', background: 'rgba(242,242,242,0.03)' }}
                        aria-label={`Move ${task.title} to ${q.label}`}>
                        → {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassPane>
    </div>
  );
};
