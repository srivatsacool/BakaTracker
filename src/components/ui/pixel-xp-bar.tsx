import * as React from 'react';
import { cn } from '@/lib/utils';
import { XPBar, type XPBarProps } from './xp-bar';

/**
 * PixelXPBar — RPG/pixel variant of the canonical XPBar.
 *
 * PRESERVES the existing XPBar (smooth glowing fill) and adds an optional
 * 8-bit segmented overlay for RPG surfaces (Journey/Today/Tasks later phases).
 * Per DESIGN.md §6: pixel corners sparingly; this uses discrete segment ticks
 * at low opacity so the bar reads as "XP cells" without visual noise.
 *
 * Phase 1 only establishes the component; pages adopt it in later phases.
 */
export interface PixelXPBarProps extends XPBarProps {
  /** number of discrete XP cells to render as segment ticks (default 20) */
  segments?: number;
  /** show the pixel segment overlay (default true) */
  segmented?: boolean;
}

export const PixelXPBar = React.forwardRef<HTMLDivElement, PixelXPBarProps>(
  ({ segments = 20, segmented = true, className, ...props }, ref) => {
    return (
      <div className={cn('relative', className)}>
        <XPBar ref={ref} {...props} />
        {segmented && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex justify-between px-[1px]"
            style={{ mixBlendMode: 'overlay' }}
          >
            {Array.from({ length: segments - 1 }).map((_, i) => (
              <span
                key={i}
                className="w-px self-stretch"
                style={{ background: 'rgba(6, 7, 20, 0.55)' }}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
PixelXPBar.displayName = 'PixelXPBar';
