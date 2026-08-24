import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium font-mono transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-[var(--glass-hairline)] bg-[var(--obs-glass-10)] text-[var(--obs-paper-dim)]',
        aurora: 'border-[var(--obs-aurora)]/40 bg-[var(--obs-aurora)]/15 text-[var(--obs-aurora-bright)]',
        teal: 'border-[var(--obs-teal)]/40 bg-[var(--obs-teal)]/15 text-[var(--obs-teal)]',
        coral: 'border-[var(--obs-coral)]/40 bg-[var(--obs-coral)]/15 text-[var(--obs-coral)]',
        amber: 'border-[var(--obs-amber)]/40 bg-[var(--obs-amber)]/15 text-[var(--obs-amber)]',
        rose: 'border-[var(--obs-rose)]/40 bg-[var(--obs-rose)]/15 text-[var(--obs-rose)]',
        cobalt: 'border-[var(--obs-cobalt)]/40 bg-[var(--obs-cobalt)]/15 text-[var(--obs-cobalt)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// eslint-disable-next-line react-refresh/only-export-components -- shadcn/ui pattern: variant helper co-located with component
export { Badge, badgeVariants };
