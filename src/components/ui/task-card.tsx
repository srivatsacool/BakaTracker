import * as React from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

const areaColor: Record<string, string> = {
  health: 'var(--obs-teal)',
  career: 'var(--obs-cobalt)',
  learning: 'var(--obs-coral)',
  personal: 'var(--obs-amber)',
  creativity: 'var(--obs-rose)',
};

/**
 * TaskCard — shared presentation primitive for a single task.
 *
 * THIN ONLY: it consumes the existing `Task` model and renders it. All
 * behavior arrives via callbacks (onComplete/onDelete/onMove/onOpen ...). It
 * introduces NO task-creation/mutation/state logic of its own — callers wire
 * the store actions. This keeps the "existing behavior → shared TaskCard →
 * different presentation props" relationship and never the reverse.
 */
export interface TaskCardProps {
  task: Task;
  /** extra badge / action chips (e.g. a Today star) rendered in the meta row */
  meta?: React.ReactNode;
  /** actions rendered top-right (deferred-visible like the current design) */
  actions?: React.ReactNode;
  compact?: boolean;
  accent?: 'area' | 'aurora' | 'teal' | 'coral';
  onClick?: () => void;
}

export const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, meta, actions, compact = false, accent = 'area', onClick, ...props }, ref) => {
    const accentColor =
      accent === 'area'
        ? areaColor[task.area] ?? 'var(--obs-aurora-bright)'
        : accent === 'teal'
          ? 'var(--obs-teal)'
          : accent === 'coral'
            ? 'var(--obs-coral)'
            : 'var(--obs-aurora)';

    return (
      <div
        ref={ref}
        onClick={onClick}
        {...props}
        className={cn(
          'group/card relative flex flex-col gap-2 rounded-[10px] border p-3 shadow-none transition hover:scale-[1.01]',
          onClick && 'cursor-pointer',
          'border-[rgba(242,242,242,0.1)] bg-[rgba(242,242,242,0.04)]'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn('m-0 font-bold leading-snug', compact ? 'text-xs' : 'text-sm')}
            style={{ color: 'var(--obs-paper)' }}
          >
            {task.title}
          </h4>
          {actions && (
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
              {actions}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span
            className="font-mono text-[9px] font-bold rounded px-1.5 py-0.5"
            style={{ color: accentColor, borderColor: `${accentColor}44`, border: `1px solid ${accentColor}44`, background: `${accentColor}12` }}
          >
            {task.area}
          </span>
          <span className="font-mono text-[9px] font-bold rounded px-1.5 py-0.5" style={{ color: 'var(--obs-aurora-bright)', border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(139,92,246,0.1)' }}>
            +{task.xp} XP
          </span>
          {task.due_date && (
            <span className="font-mono text-[9px] rounded px-1.5 py-0.5" style={{ color: 'var(--obs-paper-dim)', border: '1px solid rgba(242,242,242,0.12)' }}>
              {task.due_date}
            </span>
          )}
          {meta}
        </div>
      </div>
    );
  }
);
TaskCard.displayName = 'TaskCard';

/** Default icon action set used by pages that adopt the shared TaskCard. */
export const TaskCardIconActions = {
  Open: (onOpen: () => void) => (
    <button type="button" onClick={onOpen} title="Open" aria-label="Open"
      className="cursor-pointer rounded p-1 hover:bg-white/10"
      style={{ border: '1px solid var(--obs-glass-15)' }}>
      <ExternalLink className="h-3 w-3" />
    </button>
  ),
  Delete: (onDelete: () => void) => (
    <button type="button" onClick={onDelete} title="Delete task" aria-label="Delete task"
      className="cursor-pointer rounded p-1 hover:bg-white/10 hover:text-[var(--obs-coral)]"
      style={{ border: '1px solid var(--obs-glass-15)' }}>
      <Trash2 className="h-3 w-3" />
    </button>
  ),
};
