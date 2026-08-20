import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PaneHeader — the Night-Observatory instrument marquee band.
 * FAITHFUL WRAPPER over the `.cabinet-marquee` grammar from index.css, so it
 * renders byte-identically to the raw markup. Use inside a GlassPane (or any
 * cabinet surface) to emit the LED + title + optional right slot.
 */
export interface PaneHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  right?: React.ReactNode;
  titleClassName?: string;
}

export const PaneHeader = React.forwardRef<HTMLDivElement, PaneHeaderProps>(
  ({ title, right, titleClassName, className, ...props }, ref) => (
    <div ref={ref} className={cn('cabinet-marquee', className)} {...props}>
      <span className="cabinet-led" aria-hidden="true" />
      <span className={cn('cabinet-marquee-title', titleClassName)}>{title}</span>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  )
);
PaneHeader.displayName = 'PaneHeader';
