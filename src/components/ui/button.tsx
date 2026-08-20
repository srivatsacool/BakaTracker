import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--obs-aurora)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--obs-aurora)] text-[#f4f2ff] shadow-[var(--aurora-glow)] hover:bg-[var(--obs-aurora-deep)]',
        secondary:
          'bg-[var(--obs-glass-10)] text-[var(--obs-paper)] border border-[var(--glass-hairline)] hover:bg-[var(--obs-glass-15)]',
        outline:
          'border border-[var(--glass-hairline)] bg-transparent text-[var(--obs-paper)] hover:bg-[var(--obs-glass-8)]',
        ghost: 'text-[var(--obs-paper-dim)] hover:bg-[var(--obs-glass-8)] hover:text-[var(--obs-paper)]',
        link: 'text-[var(--obs-aurora-bright)] underline-offset-4 hover:underline',
        danger:
          'bg-[var(--obs-coral)]/15 text-[var(--obs-coral)] border border-[var(--obs-coral)]/30 hover:bg-[var(--obs-coral)]/25',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
