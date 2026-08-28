import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * AsciiDivider — restrained section divider using box-drawing rule.
 * Per DESIGN.md §7: decorative but minimal, never competes with content.
 */
export interface AsciiDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  tone?: 'default' | 'primary';
}

export const AsciiDivider = React.forwardRef<HTMLDivElement, AsciiDividerProps>(
  ({ label, tone = 'default', className, style, ...props }, ref) => {
    const color = tone === 'primary' ? 'var(--bt-primary)' : 'var(--bt-border-soft)';
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest', className)}
        style={{ color: tone === 'primary' ? 'var(--bt-primary-bright)' : 'var(--bt-text-muted)', ...style }}
        role="separator"
        aria-label={label ?? 'section divider'}
        {...props}
      >
        <span aria-hidden className="flex-1 border-t" style={{ borderColor: color }} />
        {label && <span>{label}</span>}
        <span aria-hidden className="flex-1 border-t" style={{ borderColor: color }} />
      </div>
    );
  },
);
AsciiDivider.displayName = 'AsciiDivider';
