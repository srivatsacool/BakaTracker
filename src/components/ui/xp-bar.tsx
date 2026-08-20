import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * XPBar — a compact XP/progress bar with a glowing fill. Thin presentation
 * primitive that consolidates the ~6 duplicated inline progress bars.
 * Deterministic from a 0..100 value; no business logic.
 *
 * For faithful adoption of existing gradient bars, pass `indicatorStyle`
 * (e.g. `background: 'linear-gradient(...)'`, `boxShadow`) — otherwise it
 * defaults to a solid tone fill with a matching glow.
 */
export interface XPBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0..100
  max?: number;
  tone?: 'aurora' | 'teal' | 'coral' | 'amber';
  size?: 'sm' | 'md';
  /** override the inner fill (used to preserve existing gradient bars) */
  indicatorStyle?: React.CSSProperties;
  /** @deprecated semantics preserved: for tests/tooling only */
  ariaLabel?: string;
}

const toneFill: Record<string, string> = {
  aurora: 'var(--obs-aurora)',
  teal: 'var(--obs-teal)',
  coral: 'var(--obs-coral)',
  amber: 'var(--obs-amber)',
};

export const XPBar = React.forwardRef<HTMLDivElement, XPBarProps>(
  ({ value, max = 100, tone = 'aurora', size = 'md', indicatorStyle, style, className, ariaLabel, ...props }, ref) => {
    const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
    const color = toneFill[tone];
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className={cn(
          'w-full overflow-hidden rounded-full bg-[var(--obs-glass-10)]',
          size === 'sm' ? 'h-1' : 'h-1.5',
          className
        )}
        style={style}
        {...props}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={
            indicatorStyle ?? {
              width: `${pct}%`,
              background: color,
              boxShadow: `0 0 12px ${color}`,
            }
          }
        />
      </div>
    );
  }
);
XPBar.displayName = 'XPBar';
