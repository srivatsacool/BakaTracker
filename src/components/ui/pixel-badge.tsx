import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PixelBadge — compact RPG/status metadata chip. Composes on top of the
 * existing badge grammar (font-mono, hairline border, tinted fill) but adds
 * the 8-bit personality layer via the --bt-* token vocabulary.
 *
 * Per DESIGN.md §7 ASCII rules: status labels, XP, level, streaks, achievements
 * are legitimate pixel/mono surfaces. Body copy is NOT.
 */
export type PixelBadgeTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'rose'
  | 'xp';

const toneClasses: Record<PixelBadgeTone, string> = {
  default: 'border-[var(--bt-border)] bg-[var(--obs-glass-10)] text-[var(--bt-text-dim)]',
  primary: 'border-[var(--bt-primary)]/40 bg-[var(--bt-primary)]/15 text-[var(--bt-primary-bright)]',
  success: 'border-[var(--bt-success)]/40 bg-[var(--bt-success)]/15 text-[var(--bt-success)]',
  warning: 'border-[var(--bt-warning)]/40 bg-[var(--bt-warning)]/15 text-[var(--bt-warning)]',
  danger: 'border-[var(--bt-danger)]/40 bg-[var(--bt-danger)]/15 text-[var(--bt-danger)]',
  info: 'border-[var(--bt-info)]/40 bg-[var(--bt-info)]/15 text-[var(--bt-info)]',
  rose: 'border-[var(--bt-rose)]/40 bg-[var(--bt-rose)]/15 text-[var(--bt-rose)]',
  xp: 'border-[var(--bt-xp)]/40 bg-[var(--bt-xp)]/15 text-[var(--bt-xp-bright)]',
};

export interface PixelBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PixelBadgeTone;
  /** small leading icon (pixel or lucide) */
  icon?: React.ReactNode;
}

export const PixelBadge = React.forwardRef<HTMLSpanElement, PixelBadgeProps>(
  ({ tone = 'default', icon, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider leading-none',
          toneClasses[tone],
          className,
        )}
        {...props}
      >
        {icon}
        {children}
      </span>
    );
  },
);
PixelBadge.displayName = 'PixelBadge';
