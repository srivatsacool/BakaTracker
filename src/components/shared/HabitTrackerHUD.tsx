import React from 'react';
import { PixelIcon, PixelBadge, SystemLabel, TerminalText } from '../ui';

/**
 * HabitTrackerHUD — compact RPG header for the Habits pixel tracker.
 * All values from props (real store data) — nothing fabricated.
 */
export interface HabitTrackerHUDProps {
  totalHabits: number;
  completedToday: number;
  activeStreaks: number;
  totalXpToday: number;
}

export const HabitTrackerHUD: React.FC<HabitTrackerHUDProps> = ({
  totalHabits,
  completedToday,
  activeStreaks,
  totalXpToday,
}) => {
  return (
    <div
      className="rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border"
      style={{
        background: 'linear-gradient(180deg, rgba(52,211,153,0.06) 0%, rgba(6,7,20,0.3) 100%)',
        borderColor: 'var(--bt-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <PixelIcon name="fire" size={18} color="var(--bt-success)" />
        <div>
          <TerminalText tone="primary">HABIT TRACKER</TerminalText>
          <SystemLabel tone="muted">{totalHabits} habits · {completedToday} completed today</SystemLabel>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {activeStreaks > 0 && (
          <div className="flex items-center gap-1.5">
            <PixelIcon name="fire" size={12} color="var(--bt-streak)" />
            <SystemLabel tone="warning">{activeStreaks} active streaks</SystemLabel>
          </div>
        )}
        {totalXpToday > 0 && (
          <PixelBadge tone="xp">+{totalXpToday} XP today</PixelBadge>
        )}
      </div>
    </div>
  );
};
