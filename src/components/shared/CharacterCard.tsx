import React from 'react';
import { PixelIcon, PixelBadge, SystemLabel, TerminalText, XPBar } from '../ui';

export interface CharacterCardProps {
  level: number;
  xp: number;
  xpPerLevel: number;
  title: string;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  level,
  xp,
  xpPerLevel,
  title,
}) => {
  const xpProgress = Math.min(100, Math.max(0, (xp / Math.max(1, xpPerLevel)) * 100));
  const xpToNext = Math.max(0, xpPerLevel - xp);

  return (
    <div
      className="rounded-xl p-6 flex flex-col items-center gap-4 border"
      style={{
        background: 'linear-gradient(180deg, rgba(233,230,242,0.04) 0%, rgba(6,7,20,0.4) 100%)',
        borderColor: 'var(--bt-border-strong)',
        boxShadow: '0 0 24px rgba(139,92,246,0.12), inset 0 1px 0 rgba(233,230,242,0.06)',
      }}
    >
      {/* Character avatar area */}
      <div className="relative">
        <div
          className="w-20 h-20 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(232,180,90,0.15) 0%, rgba(232,180,90,0.05) 100%)',
            border: '2px solid rgba(232,180,90,0.25)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <PixelIcon name="robot" size={36} color="var(--bt-primary-bright)" />
        </div>
        <PixelBadge tone="primary" className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          LVL {level}
        </PixelBadge>
      </div>

      {/* Character info */}
      <div className="text-center">
        <TerminalText tone="primary" className="!text-xl">BAKA</TerminalText>
        <SystemLabel tone="muted">{title}</SystemLabel>
      </div>

      {/* XP Bar */}
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <SystemLabel tone="muted">XP</SystemLabel>
          <SystemLabel tone="primary">{xp} / {xpPerLevel}</SystemLabel>
        </div>
        <XPBar
          value={xpProgress}
          max={100}
          tone="aurora"
          size="sm"
          ariaLabel="Level progress"
        />
        <SystemLabel tone="muted" className="!text-[8px]">{xpToNext} to next level</SystemLabel>
      </div>
    </div>
  );
};
