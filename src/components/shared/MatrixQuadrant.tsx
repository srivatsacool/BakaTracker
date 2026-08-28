import React from 'react';
import { PixelIcon, PixelBadge, SystemLabel, GlassPane } from '../ui';
import type { Task } from '../../types';

const AREA_ICONS: Record<string, string> = {
  health: 'fire', career: 'briefcase', learning: 'book', personal: 'sword', creativity: 'brush', default: 'goal',
};
const AREA_TONES: Record<string, string> = {
  health: 'success', career: 'info', learning: 'primary', personal: 'warning', creativity: 'rose', default: 'default',
};

export interface MatrixQuadrantProps {
  label: string;
  subtitle: string;
  icon: string;
  accent: string;
  description: string;
  tasks: Task[];
  onAssign: (taskId: string, quadrant: string) => void;
  onDelete: (taskId: string) => void;
  onNavigate: (taskId: string) => void;
  quadrantKey: string;
  allQuadrants: { key: string; label: string; icon: string }[];
  emptyMessage: string;
  tone?: 'aurora' | 'cobalt' | 'teal' | 'green' | 'coral' | 'amber' | 'magenta' | 'paper';
}

export const MatrixQuadrant: React.FC<MatrixQuadrantProps> = ({
  label, subtitle, icon, accent, description, tasks, onAssign, onDelete, onNavigate, quadrantKey, allQuadrants, emptyMessage, tone = 'aurora',
}) => {
  return (
    <GlassPane
      state="off"
      tone={tone}
      style={{ '--marquee-color': accent } as React.CSSProperties}
      paneTitle={label}
      titleRight={<SystemLabel tone="primary">{tasks.length}</SystemLabel>}
      screenClassName="!p-3 min-h-[140px] flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 mb-1">
        <PixelIcon name={icon as never} size={14} color={accent} />
        <SystemLabel tone="muted">{subtitle}</SystemLabel>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <PixelIcon name={icon as never} size={18} color="var(--bt-text-disabled)" />
          <SystemLabel tone="muted">{emptyMessage}</SystemLabel>
        </div>
      ) : (
        tasks.map(task => {
          const iconName = AREA_ICONS[task.area] || AREA_ICONS.default;
          const tone = AREA_TONES[task.area] || AREA_TONES.default;
          return (
            <div
              key={task.id}
              className="group p-2.5 rounded-lg flex flex-col gap-1.5 border transition-all duration-150 hover:bg-white/[0.03]"
              style={{ background: 'rgba(242,242,242,0.025)', borderColor: 'var(--bt-border-soft)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <PixelIcon name={iconName as never} size={12} color={`var(--bt-${tone === 'default' ? 'text-muted' : tone})`} className="shrink-0 opacity-60" />
                  <p className="m-0 text-xs font-bold truncate" style={{ color: 'var(--bt-text)' }}>{task.title}</p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => onNavigate(task.id)} title="Open in Tasks" className="icon-button icon-button-small" aria-label={`Open ${task.title} in Tasks`}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </button>
                  <button onClick={() => onDelete(task.id)} title="Delete task" className="icon-button icon-button-small hover:!text-danger" aria-label={`Delete ${task.title}`}>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <PixelBadge tone={tone as never} className="!text-[7px]">{task.area}</PixelBadge>
                <SystemLabel tone="primary" className="!text-[8px]">+{task.xp}</SystemLabel>
                {task.due_date && <SystemLabel tone="muted" className="!text-[8px]">{task.due_date}</SystemLabel>}
              </div>
              {/* Accessible move menu */}
              <div className="flex flex-wrap gap-1 mt-1">
                {allQuadrants.filter(q => q.key !== quadrantKey).map(q => (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => onAssign(task.id, q.key)}
                    className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded cursor-pointer border transition hover:scale-105"
                    style={{ color: 'var(--bt-text-muted)', borderColor: 'var(--bt-border-soft)', background: 'rgba(242,242,242,0.03)' }}
                    aria-label={`Move ${task.title} to ${q.label}`}
                  >
                    → {q.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}
      <p className="m-0 font-mono text-[8px] leading-relaxed mt-auto" style={{ color: 'var(--bt-text-disabled)' }}>{description}</p>
    </GlassPane>
  );
};
