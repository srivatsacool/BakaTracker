import { cn } from '@/lib/utils';

/**
 * F11Tooltip — shared glass tooltip used inside the Recharts journey charts.
 * Thin presentation; renders a frosted glass card with the chart row payload.
 * (Consolidates the inline Journey `F11Tooltip`.)
 */
export interface F11TooltipRowProps {
  color?: string;
  name?: string | number;
  value?: string | number;
}

export interface F11TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    color?: string;
    name?: string | number;
    value?: string | number;
    payload?: { color?: string; name?: string | number; value?: string | number };
  }> | null;
  className?: string;
}

export const F11Tooltip = ({ active, label, payload, className }: F11TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.map((p, i) => {
    const row = p.payload ?? p;
    return (
      <div key={i} className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-[var(--obs-paper-dim)]">
          {row.color && <span className="h-2 w-2 rounded-sm" style={{ background: row.color }} />}
          {row.name}
        </span>
        <span className="font-mono text-[var(--obs-paper)]">{row.value}</span>
      </div>
    );
  });
  return (
    <div
      className={cn(
        'min-w-[140px] rounded-md border border-[var(--glass-hairline)] bg-[rgba(6,7,20,0.92)] px-3 py-2 text-xs shadow-[var(--glass-shadow)] backdrop-blur-md',
        className
      )}
    >
      {label !== undefined && label !== '' && (
        <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--obs-paper-muted)]">{label}</div>
      )}
      <div className="flex flex-col gap-1">{rows}</div>
    </div>
  );
};
