import React from 'react';
import { PixelIcon, PixelBadge, SystemLabel, TerminalText, XPBar } from '../ui';

/**
 * DailyStatus — compact RPG command-center HUD for the Today page.
 * Shows LVL, XP progress, quests completed, and daily score.
 * All values come from props (real store data) — nothing fabricated.
 */
export interface DailyStatusProps {
  level: number;
  xp: number;
  xpPerLevel: number;
  dailyScore: number;
  questsDone: number;
  questsTotal: number;
  habitsDone: number;
  habitsTotal: number;
}

export const DailyStatus: React.FC<DailyStatusProps> = ({
  level,
  xp,
  xpPerLevel,
  dailyScore,
  questsDone,
  questsTotal,
  habitsDone,
  habitsTotal,
}) => {
  const xpProgress = Math.min(100, Math.max(0, (xp / Math.max(1, xpPerLevel)) * 100));
  const scoreTone = dailyScore >= 80 ? 'success' : dailyScore >= 40 ? 'primary' : 'danger';

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 border"
      style={{
        background: 'linear-gradient(180deg, rgba(233,230,242,0.04) 0%, rgba(6,7,20,0.4) 100%)',
        borderColor: 'var(--bt-border)',
      }}
    >
      {/* Top row: Level + Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PixelIcon name="crown" size={16} color="var(--bt-xp)" />
          <SystemLabel k="LVL" tone="primary">{level}</SystemLabel>
        </div>
        <div className="flex items-center gap-2">
          <SystemLabel k="SCORE" tone={scoreTone}>{dailyScore}%</SystemLabel>
          <PixelBadge tone={scoreTone}>{dailyScore >= 80 ? 'CLEAR' : dailyScore >= 40 ? 'ACTIVE' : 'LOW'}</PixelBadge>
        </div>
      </div>

      {/* XP Bar */}
      <div className="flex items-center gap-2">
        <XPBar
          value={xpProgress}
          max={100}
          tone="aurora"
          size="sm"
          ariaLabel="Level progress"
          className="flex-1"
        />
        <TerminalText tone="muted" className="!text-[10px]">
          {xp}/{xpPerLevel}
        </TerminalText>
      </div>

      {/* Bottom stats row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <PixelIcon name="checkbox" size={12} color="var(--bt-info)" />
          <SystemLabel tone="default">{questsDone}/{questsTotal}</SystemLabel>
        </div>
        <div className="flex items-center gap-1.5">
          <PixelIcon name="fire" size={12} color="var(--bt-success)" />
          <SystemLabel tone="default">{habitsDone}/{habitsTotal}</SystemLabel>
        </div>
      </div>
    </div>
  );
};
