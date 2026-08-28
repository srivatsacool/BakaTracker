import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * AsciiBox — box-drawing terminal frame for system/status surfaces.
 *
 * Per DESIGN.md §7: ASCII is a system language. Good: framed boxes,
 * ┌─┐ borders. Bad: giant ASCII art, decorative noise. This component makes
 * the framed-box pattern reusable and readable — no fake terminal behavior.
 */
export interface AsciiBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  /** title rendered in the top rule, e.g. "DAILY QUESTS" */
  title?: string;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const toneColor: Record<string, string> = {
  default: 'var(--bt-text-muted)',
  primary: 'var(--bt-primary-bright)',
  success: 'var(--bt-success)',
  warning: 'var(--bt-warning)',
  danger: 'var(--bt-danger)',
};

export const AsciiBox = React.forwardRef<HTMLDivElement, AsciiBoxProps>(
  ({ title, tone = 'default', className, style, children, ...props }, ref) => {
    const color = toneColor[tone];
    return (
      <div
        ref={ref}
        className={cn('font-mono text-xs', className)}
        style={{ color: 'var(--bt-text-dim)', ...style }}
        {...props}
      >
        <div className="flex items-center gap-2 whitespace-pre" style={{ color }}>
          <span aria-hidden>┌─</span>
          {title && <span className="uppercase tracking-widest">{title}</span>}
          <span aria-hidden className="flex-1 border-t" style={{ borderColor: 'var(--bt-border-soft)' }} />
          <span aria-hidden>─┐</span>
        </div>
        <div className="px-3 py-2">{children}</div>
        <div className="flex items-center gap-2 whitespace-pre" style={{ color }}>
          <span aria-hidden>└─</span>
          <span aria-hidden className="flex-1 border-t" style={{ borderColor: 'var(--bt-border-soft)' }} />
          <span aria-hidden>─┘</span>
        </div>
      </div>
    );
  },
);
AsciiBox.displayName = 'AsciiBox';
