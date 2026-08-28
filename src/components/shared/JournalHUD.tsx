import React from 'react';
import { PixelIcon, PixelBadge, SystemLabel, TerminalText } from '../ui';

export interface JournalHUDProps {
  daysLogged: number;
  currentStreak: number;
  todayLogged: boolean;
}

export const JournalHUD: React.FC<JournalHUDProps> = ({
  daysLogged,
  currentStreak,
  todayLogged,
}) => {
  return (
    <div
      className="rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border"
      style={{
        background: 'linear-gradient(180deg, rgba(244,114,182,0.06) 0%, rgba(6,7,20,0.3) 100%)',
        borderColor: 'var(--bt-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <PixelIcon name="book" size={18} color="var(--bt-rose)" />
        <div>
          <TerminalText tone="primary">DAILY LOG</TerminalText>
          <SystemLabel tone="muted">{daysLogged} days logged</SystemLabel>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {currentStreak > 0 && (
          <div className="flex items-center gap-1.5">
            <PixelIcon name="fire" size={12} color="var(--bt-streak)" />
            <SystemLabel tone="warning">{currentStreak}d streak</SystemLabel>
          </div>
        )}
        {todayLogged ? (
          <PixelBadge tone="success">LOGGED</PixelBadge>
        ) : (
          <PixelBadge tone="default">NOT YET</PixelBadge>
        )}
      </div>
    </div>
  );
};
