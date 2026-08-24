import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * GlassPane — the Night-Observatory cabinet surface.
 *
 * FAITHFUL WRAPPER: renders the existing `.cabinet`/`.cabinet--{state}`
 * grammar from index.css (the real shared surface language), so adopting it
 * produces byte-identical visuals to the raw markup the pages used before.
 * Preserves the visual hierarchy: `cabinet` (primary functional instrument)
 * vs `glass-pane` (secondary) vs `attract-state` (empty) — see EmptyState.
 *
 * `tone` sets `--marquee-color` (the LED + title accent); `state` selects the
 * named phase class (off/attract/playing/highscore/ooo). PaneHeader renders
 * the marquee title band when `paneTitle` is provided.
 */
export interface GlassPaneProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article' | 'form';
  state?: 'off' | 'attract' | 'playing' | 'highscore' | 'ooo';
  tone?: 'aurora' | 'coral' | 'cobalt' | 'rose' | 'teal' | 'amber' | 'paper' | 'green' | 'magenta';
  paneTitle?: string;
  /** extra node placed in the marquee title's right slot (e.g. a count) */
  titleRight?: React.ReactNode;
  /** force size overrides passed to the inner screen (e.g. '!p-5') */
  screenClassName?: string;
}

const toneVar: Record<string, string> = {
  aurora: 'var(--arcade-gold)',
  coral: 'var(--arcade-red)',
  cobalt: 'var(--arcade-cobalt)',
  rose: 'var(--arcade-magenta)',
  teal: 'var(--arcade-green)',
  green: 'var(--arcade-green)',
  magenta: 'var(--arcade-magenta)',
  amber: 'var(--arcade-orange)',
  paper: 'var(--arcade-paper-dim)',
};

const stateCls: Record<string, string> = {
  off: 'cabinet--off',
  attract: 'cabinet--attract',
  playing: 'cabinet--playing',
  highscore: 'cabinet--highscore',
  ooo: 'cabinet--ooo',
};

export const GlassPane = React.forwardRef<HTMLDivElement, GlassPaneProps>(
  (
    { as = 'section', state = 'off', tone = 'aurora', paneTitle, titleRight, screenClassName, className, style, children, ...props },
    ref
  ) => {
    const Component = as as 'section';
    return (
      <Component
        ref={ref}
        className={cn('cabinet', stateCls[state], className)}
        style={{ '--marquee-color': toneVar[tone], ...style } as React.CSSProperties}
        {...props}
      >
        {paneTitle && (
          <div className="cabinet-marquee">
            <span className="cabinet-led" aria-hidden="true" />
            <span className="cabinet-marquee-title">{paneTitle}</span>
            {titleRight && <span className="ml-auto">{titleRight}</span>}
          </div>
        )}
        <div className={cn('cabinet-screen', screenClassName)}>{children}</div>
      </Component>
    );
  }
);
GlassPane.displayName = 'GlassPane';

/** CabinetSurface — legacy alias for the arcade-era name. */
export const CabinetSurface = GlassPane;
