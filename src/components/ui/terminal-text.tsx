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
        className={cn('font-[var(--font-vt323)] text-xl leading-tight inline-flex items-baseline gap-2', className)}
        style={{ color: toneColor[tone], letterSpacing: '0.04em', ...style }}
        {...props}
      >
        {/* V3.5 header contract: exactly ONE meaningful marker — a violet
            block caret — never a duplicated '>>'. Call sites pass bare text. */}
        {prompt && <span aria-hidden className="self-center" style={{ color: 'var(--bt-primary)', fontSize: '0.9em', textShadow: '0 0 10px rgba(139,92,246,0.45)' }}>{'▶'}</span>}
        <span className="font-bold">{children}</span>
      </span>
    );
  },
);
TerminalText.displayName = 'TerminalText';
