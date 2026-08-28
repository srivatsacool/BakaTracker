import React from 'react';
import { CheckSquare, Square, ChevronLeft, ChevronRight, Star, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { PixelIcon, PixelBadge, SystemLabel } from '../ui';
import type { Task } from '../../types';

/**
 * QuestCard — the canonical task presentation for both Today and Tasks.
 * Wraps task completion + shift-status logic in a BakaTracker RPG
 * personality surface. Pure presentation — no store access.
 *
 * Phase 3: basic checklist mode (Today)
 * Phase 4: extended mode with star, due date, delete, notes (Tasks)
 */

/** Map task area → pixelarticons name for personality identity. */
const AREA_ICONS: Record<string, string> = {
  health: 'fire',
  career: 'briefcase',
  learning: 'book',
  personal: 'sword',
  creativity: 'brush',
  default: 'goal',
};

const AREA_TONES: Record<string, string> = {
  health: 'success',
  career: 'info',
  learning: 'primary',
  personal: 'warning',
  creativity: 'rose',
  default: 'default',
};

export interface QuestCardProps {
  task: Task;
  isCompleted: boolean;
  onComplete: (e: React.MouseEvent | null) => void;
  onShiftLeft?: (e: React.MouseEvent) => void;
  onShiftRight?: (e: React.MouseEvent) => void;
  showShiftLeft?: boolean;
  showShiftRight?: boolean;
  /** compact mode for the main checklist (no shift buttons) */
  checklist?: boolean;
  /** Tasks page: show star, due date, delete, notes */
  extended?: boolean;
  onToggleToday?: () => void;
  onDelete?: () => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({
  task,
  isCompleted,
  onComplete,
  onShiftLeft,
  onShiftRight,
  showShiftLeft = false,
  showShiftRight = false,
  checklist = false,
  extended = false,
  onToggleToday,
  onDelete,
}) => {
  const iconName = AREA_ICONS[task.area] || AREA_ICONS.default;
  const tone = AREA_TONES[task.area] || AREA_TONES.default;

  return (
    <div
      onClick={(e) => onComplete(e)}
      role="button"
      tabIndex={0}
      aria-pressed={isCompleted}
      aria-label={`${task.title} — ${isCompleted ? 'mark as to do' : 'complete quest'}`}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onComplete(null);
      }}
      className={`group p-3 rounded-lg flex flex-col gap-2 cursor-pointer select-none transition-all duration-200 border ${
        isCompleted
          ? 'opacity-55'
          : 'hover:bg-white/[0.04]'
      }`}
      style={{
        background: isCompleted ? 'rgba(61,220,132,0.04)' : 'rgba(242,242,242,0.025)',
        borderColor: isCompleted ? 'rgba(61,220,132,0.25)' : 'var(--bt-border-soft)',
      }}
    >
      {/* Row 1: checkbox + title + star (if extended) */}
      <div className="flex items-center gap-3">
        {/* Completion checkbox (lucide — utility, allowed) */}
        <div className="shrink-0 transition-transform group-hover:scale-110">
          {isCompleted ? (
            <CheckSquare className="w-4 h-4" style={{ color: 'var(--bt-success)' }} aria-hidden="true" />
          ) : (
            <Square className="w-4 h-4" style={{ color: 'var(--bt-text-disabled)' }} aria-hidden="true" />
          )}
        </div>

        {/* Task identity (personality icon + title) */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!isCompleted && (
            <PixelIcon name={iconName as never} size={14} color={`var(--bt-${tone === 'default' ? 'text-muted' : tone})`} className="shrink-0 opacity-70" />
          )}
          <p className={`m-0 text-sm font-bold truncate ${isCompleted ? 'line-through' : ''}`}
             style={{ color: isCompleted ? 'var(--bt-text-muted)' : 'var(--bt-text)' }}>
            {task.title}
          </p>
        </div>

        {/* Star (extended mode) */}
        {extended && onToggleToday && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleToday(); }}
            className="icon-button icon-button-small shrink-0"
            style={{ color: task.today ? 'var(--bt-xp)' : 'var(--bt-text-disabled)' }}
            aria-label={task.today ? `Unstar ${task.title}` : `Star ${task.title} for today`}
            title={task.today ? 'Starred for Today' : 'Star for Today'}
          >
            <Star className="w-3 h-3" fill={task.today ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Row 2 (extended): notes preview */}
      {extended && task.notes && (
        <p className="m-0 text-[10px] leading-relaxed pl-7 line-clamp-2" style={{ color: 'var(--bt-text-muted)' }}>
          {task.notes}
        </p>
      )}

      {/* Row 3: metadata + actions */}
      <div className="flex items-center justify-between pl-7">
        <div className="flex items-center gap-2">
          <PixelBadge tone={tone as never} className="!text-[8px]">{task.area}</PixelBadge>
          <SystemLabel tone="primary">+{task.xp} XP</SystemLabel>
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" style={{ color: 'var(--bt-text-muted)' }} aria-hidden="true" />
              <SystemLabel tone="muted">{task.due_date}</SystemLabel>
            </div>
          )}
          {isCompleted && task.completed_at && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--bt-success)' }} aria-hidden="true" />
              <SystemLabel tone="muted">{new Date(task.completed_at).toLocaleDateString()}</SystemLabel>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          {!checklist && (
            <>
              {showShiftLeft && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onShiftLeft?.(e); }}
                  className="icon-button icon-button-small opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Move ${task.title} left`}
                >
                  <ChevronLeft className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
              {showShiftRight && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onShiftRight?.(e); }}
                  className="icon-button icon-button-small opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Move ${task.title} right`}
                >
                  <ChevronRight className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </>
          )}
          {extended && onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="icon-button icon-button-small opacity-0 group-hover:opacity-100 transition-opacity hover:!text-danger"
              aria-label={`Delete ${task.title}`}
            >
              <Trash2 className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
