import React from 'react';
import { PixelIcon, PixelBadge, SystemLabel, TerminalText } from '../ui';

/**
 * QuestBoardHUD — compact RPG header for the Tasks quest board.
 * Shows quest counts, XP available, and board status.
 * All values from props (real store data) — nothing fabricated.
 */
export interface QuestBoardHUDProps {
  activeQuests: number;
  completedQuests: number;
  totalXpAvailable: number;
  todayCount: number;
}

export const QuestBoardHUD: React.FC<QuestBoardHUDProps> = ({
  activeQuests,
  completedQuests,
  totalXpAvailable,
  todayCount,
}) => {
  return (
    <div
      className="rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border"
      style={{
        background: 'linear-gradient(180deg, rgba(139,92,246,0.06) 0%, rgba(6,7,20,0.3) 100%)',
        borderColor: 'var(--bt-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <PixelIcon name="grid" size={18} color="var(--bt-primary)" />
        <div>
          <TerminalText tone="primary">QUEST BOARD</TerminalText>
          <SystemLabel tone="muted">{activeQuests} active · {completedQuests} cleared</SystemLabel>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <PixelIcon name="zap" size={12} color="var(--bt-xp)" />
          <SystemLabel tone="primary">{totalXpAvailable} XP available</SystemLabel>
        </div>
        {todayCount > 0 && (
          <PixelBadge tone="warning">{todayCount} starred</PixelBadge>
        )}
      </div>
    </div>
  );
};
