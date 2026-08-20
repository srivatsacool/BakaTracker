import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * EmptyState — the named "no data yet" surface (was `.attract-state`).
 * Renders as an instrument waiting for its first observation, never a gray
 * void. Thin presentation primitive; `action` may hold a Button or similar.
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ title, description, action, icon, className }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
    {icon && <div className="text-[var(--obs-paper-muted)]" aria-hidden="true">{icon}</div>}
    <span className="flex items-center gap-1.5" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--obs-aurora)]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--obs-aurora)]" style={{ opacity: 0.5 }} />
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--obs-aurora)]" style={{ opacity: 0.25 }} />
    </span>
    <h3 className="font-display text-sm font-medium text-[var(--obs-paper)]">{title}</h3>
    {description && <p className="max-w-sm text-xs text-[var(--obs-paper-muted)]">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

/** AttractState / CabinetSurface — legacy aliases kept for compatibility. */
export const AttractState = EmptyState;
