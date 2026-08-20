import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-[var(--glass-hairline)] bg-[var(--obs-glass-7)] px-3 py-1 text-sm text-[var(--obs-paper)] shadow-sm transition-colors placeholder:text-[var(--obs-paper-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--obs-aurora)] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
