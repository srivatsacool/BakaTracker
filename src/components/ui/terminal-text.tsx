import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * TerminalText — VT323 terminal treatment for short system copy (BakaSur
 * voice, status lines, ASCII prompts). Per DESIGN.md §4: VT323 only for
 * terminal/system copy and short labels — never long body text.
 */
export interface TerminalTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  /** render a leading ">" prompt (terminal style) */
  prompt?: boolean;
}

const toneColor: Record<string, string> = {
  default: 'var(--bt-text-dim)',
  primary: 'var(--bt-primary-bright)',
  success: 'var(--bt-success)',
  warning: 'var(--bt-warning)',
  danger: 'var(--bt-danger)',
  muted: 'var(--bt-text-muted)',
};

export const TerminalText = React.forwardRef<HTMLSpanElement, TerminalTextProps>(
  ({ tone = 'default', prompt, className, style, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('font-[var(--font-vt323)] text-lg leading-tight', className)}
        style={{ color: toneColor[tone], letterSpacing: '0.02em', ...style }}
        {...props}
      >
        {prompt && <span aria-hidden className="opacity-70">{'› '}</span>}
        {children}
      </span>
    );
  },
);
TerminalText.displayName = 'TerminalText';
