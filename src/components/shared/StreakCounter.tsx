import React from 'react';
import { PixelIcon, SystemLabel } from '../ui';

/**
 * StreakCounter — compact RPG streak display.
 * Receives calculated values as props (no store access).
 */
export interface StreakCounterProps {
  current: number;
  best: number;
  className?: string;
}

export const StreakCounter: React.FC<StreakCounterProps> = ({ current, best, className }) => {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div className="flex items-center gap-1">
        <PixelIcon name="fire" size={14} color={current > 0 ? 'var(--bt-streak)' : 'var(--bt-text-disabled)'} />
        <SystemLabel tone={current >= 7 ? 'warning' : current > 0 ? 'primary' : 'muted'}>
          {current}d
        </SystemLabel>
      </div>
      {best > 0 && (
        <SystemLabel tone="muted" className="!text-[8px]">best {best}</SystemLabel>
      )}
    </div>
  );
};
