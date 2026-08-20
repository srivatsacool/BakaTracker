import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * GlassPane — the shared Darkglass surface (was the raw `.cabinet` classes).
 * Encapsulates the Night-Observatory surface: a frosted glass pane with an
 * optional marquee header (LED + title) and a body. Mirrors the old
 * `GlassPane`/`CabinetSurface` API so feature pages can migrate onto it.
 *
 * `tone` sets the instrument LED + title accent; `state` renders a named phase
 * (never color alone): off / attract / playing / high-score / ooo.
 */
export interface GlassPaneProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  state?: 'off' | 'attract' | 'playing' | 'highscore' | 'ooo';
  tone?: 'aurora' | 'coral' | 'cobalt' | 'rose' | 'teal' | 'amber' | 'paper';
  paneTitle?: string;
  led?: React.ReactNode;
}

const toneMap: Record<string, string> = {
  aurora: 'var(--obs-aurora)',
  coral: 'var(--obs-coral)',
  cobalt: 'var(--obs-cobalt)',
  rose: 'var(--obs-rose)',
  teal: 'var(--obs-teal)',
  amber: 'var(--obs-amber)',
  paper: 'var(--obs-paper-dim)',
};

const stateGlow: Record<string, string> = {
  off: 'none',
  attract: 'var(--led-glow)',
  playing: 'var(--aurora-glow)',
  highscore: 'var(--aurora-glow)',
  ooo: 'var(--led-glow)',
};

export const GlassPane = React.forwardRef<HTMLDivElement, GlassPaneProps>(
  ({ as = 'div', state = 'playing', tone = 'paper', paneTitle, led, className, children, style, ...props }, ref) => {
    const Component = as as 'div';
    return (
      <Component
        ref={ref}
        className={cn(
          'relative flex flex-col overflow-hidden rounded-lg border border-[var(--glass-hairline)] bg-[var(--glass-pane)] shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]',
          className
        )}
        style={{
          ...style,
          '--marquee-color': toneMap[tone],
          boxShadow: stateGlow[state] !== 'none' ? `${stateGlow[state]}, var(--glass-shadow)` : 'var(--glass-shadow)',
        } as React.CSSProperties}
        {...props}
      >
        {paneTitle && (
          <div className="flex items-center gap-2 border-b border-[var(--glass-hairline)] px-3 py-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: toneMap[tone], boxShadow: 'var(--led-glow)', ['--led-color' as string]: toneMap[tone] }}
              aria-hidden="true"
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--obs-paper-dim)]">
              {paneTitle}
            </span>
            {led && <span className="ml-auto">{led}</span>}
          </div>
        )}
        <div className="flex-1">{children}</div>
      </Component>
    );
  }
);
GlassPane.displayName = 'GlassPane';

/** CabinetSurface — legacy alias for the arcade-era name. */
export const CabinetSurface = GlassPane;
