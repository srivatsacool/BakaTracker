import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PaneHeader — the Night-Observatory instrument header: an LED + mono title
 * band above a pane body. Thin presentation only; consolidates the
 * `cabinet-marquee` block that was hand-written in ~8 files.
 * `tone` picks the LED/accents; `RightSlot` renders any trailing control.
 */
export interface PaneHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  tone?: 'aurora' | 'coral' | 'cobalt' | 'rose' | 'teal' | 'amber' | 'paper';
  right?: React.ReactNode;
  led?: boolean;
}

const toneColor: Record<string, string> = {
  aurora: 'var(--obs-aurora)',
  coral: 'var(--obs-coral)',
  cobalt: 'var(--obs-cobalt)',
  rose: 'var(--obs-rose)',
  teal: 'var(--obs-teal)',
  amber: 'var(--obs-amber)',
  paper: 'var(--obs-paper-dim)',
};

export const PaneHeader = React.forwardRef<HTMLDivElement, PaneHeaderProps>(
  ({ title, tone = 'aurora', right, led = true, className, ...props }, ref) => {
    const color = toneColor[tone];
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2 border-b border-[var(--glass-hairline)] px-3 py-1.5',
          className
        )}
        {...props}
      >
        {led && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: color, boxShadow: 'var(--led-glow)', ['--led-color' as string]: color }}
            aria-hidden="true"
          />
        )}
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--obs-paper-dim)]">
          {title}
        </span>
        {right && <span className="ml-auto flex items-center gap-1.5">{right}</span>}
      </div>
    );
  }
);
PaneHeader.displayName = 'PaneHeader';
