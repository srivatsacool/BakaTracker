import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * XPBar — a compact XP/progress bar with the aurora fill glow. Thin
 * presentation primitive that consolidates the ~6 duplicated inline progress
 * bars (Today daily-score + habits + level, ContextBar, Layout, XP note).
 * Deterministic from a 0..100 value; no business logic.
 */
export interface XPBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0..100
  max?: number;
  tone?: 'aurora' | 'teal' | 'coral' | 'amber';
  size?: 'sm' | 'md';
}

const toneFill: Record<string, string> = {
  aurora: 'var(--obs-aurora)',
  teal: 'var(--obs-teal)',
  coral: 'var(--obs-coral)',
  amber: 'var(--obs-amber)',
};

export const XPBar = React.forwardRef<HTMLDivElement, XPBarProps>(
  ({ value, max = 100, tone = 'aurora', size = 'md', className, ...props }, ref) => {
    const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
    const color = toneFill[tone];
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          'w-full overflow-hidden rounded-full bg-[var(--obs-glass-10)]',
          size === 'sm' ? 'h-1' : 'h-1.5',
          className
        )}
        {...props}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 12px ${color}`,
          }}
        />
      </div>
    );
  }
);
XPBar.displayName = 'XPBar';
