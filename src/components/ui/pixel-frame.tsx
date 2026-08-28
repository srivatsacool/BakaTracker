import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PixelFrame — subtle 8-bit bordered frame that works with existing glass
 * surfaces. Per DESIGN.md §6 pixel rules: low-opacity, never noisy, no
 * faux-anti-aliased corners. Uses the canonical --bt-pixel-border token.
 *
 * Thin presentation wrapper only — no business logic.
 */
export interface PixelFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  /** stronger violet pixel edge for emphasis surfaces */
  strong?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer';
}

export const PixelFrame = React.forwardRef<HTMLDivElement, PixelFrameProps>(
  ({ strong, as: Tag = 'div', className, style, children, ...props }, ref) => {
    return (
      <Tag
        ref={ref}
        className={cn(
          'relative rounded-[10px]',
          strong ? 'border-2' : 'border',
          className,
        )}
        style={{
          borderColor: strong ? 'rgba(139, 92, 246, 0.35)' : 'var(--obs-glass-12)',
          boxShadow: strong
            ? '0 0 18px rgba(139, 92, 246, 0.22), inset 0 1px 0 rgba(233, 230, 242, 0.08)'
            : 'inset 0 1px 0 rgba(233, 230, 242, 0.06)',
          ...style,
        }}
        {...props}
      >
        {children}
      </Tag>
    );
  },
);
PixelFrame.displayName = 'PixelFrame';
