import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * SystemLabel — compact system/readout label (IBM Plex Mono voice).
 * Used for metadata rows: "XP +50", "STREAK 12", "LEVEL 7". Per DESIGN.md §4
 * system metadata uses the mono voice; this is the canonical label primitive.
 */
export interface SystemLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** optional uppercase key rendered before the value, e.g. "XP" */
  k?: string;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';
}

const toneColor: Record<string, string> = {
  default: 'var(--bt-text-dim)',
  primary: 'var(--bt-primary-bright)',
  success: 'var(--bt-success)',
  warning: 'var(--bt-warning)',
  danger: 'var(--bt-danger)',
  muted: 'var(--bt-text-muted)',
};

export const SystemLabel = React.forwardRef<HTMLSpanElement, SystemLabelProps>(
  ({ k, tone = 'default', className, style, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider leading-none', className)}
        style={{ color: toneColor[tone], ...style }}
        {...props}
      >
        {k && <span className="opacity-70">{k}</span>}
        {children}
      </span>
    );
  },
);
SystemLabel.displayName = 'SystemLabel';
