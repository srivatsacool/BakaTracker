import React from 'react';
import { PixelIcon, SystemLabel } from '../ui';

export interface StatBarProps {
  name: string;
  icon: string;
  value: number;
  maxValue?: number;
  barColor: string;
  delta?: number | null;
}

export const StatBar: React.FC<StatBarProps> = ({
  name,
  icon,
  value,
  maxValue = 200,
  barColor,
  delta,
}) => {
  const pct = Math.min(100, (value / maxValue) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PixelIcon name={icon as never} size={12} color={barColor} />
          <SystemLabel tone="default">{name}</SystemLabel>
        </div>
        <div className="flex items-center gap-1.5">
          <SystemLabel tone="primary">{value}</SystemLabel>
          {delta !== null && delta !== undefined && delta !== 0 && (
            <span
              className="font-mono text-[9px]"
              style={{ color: delta > 0 ? 'var(--bt-success)' : 'var(--bt-danger)' }}
              title={delta >= 0 ? `+${delta} vs last week` : `${delta} vs last week`}
            >
              {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
            </span>
          )}
        </div>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(233,230,242,0.06)', border: '1px solid rgba(233,230,242,0.1)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: barColor,
            boxShadow: `0 0 8px ${barColor}`,
          }}
        />
      </div>
    </div>
  );
};
