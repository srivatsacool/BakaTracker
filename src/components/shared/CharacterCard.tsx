import React from 'react';
import { BaksurCharacter } from '../shell/BaksurCharacter';
import { BAKASUR_COLOR_HEXES } from '../../lib/baksurPreferences';
import { PixelBadge, SystemLabel, TerminalText, XPBar } from '../ui';

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
  const color = BAKASUR_COLOR_HEXES.violet;

  return (
    <div
      className="rounded-xl p-6 flex flex-col items-center gap-4 border"
      style={{
        background: 'linear-gradient(180deg, rgba(233,230,242,0.04) 0%, rgba(6,7,20,0.4) 100%)',
        borderColor: 'var(--bt-border-strong)',
        boxShadow: '0 0 24px rgba(139,92,246,0.12), inset 0 1px 0 rgba(233,230,242,0.06)',
      }}
    >
      {/* BakaSur character — the real SVG, large and centered */}
      <div className="relative">
        <div
          className="rounded-2xl flex items-center justify-center overflow-hidden"
          style={{
            width: 140,
            height: 140,
            background: 'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.12) 0%, rgba(6,7,20,0.6) 70%)',
            border: '2px solid rgba(139,92,246,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(139,92,246,0.1)',
          }}
        >
          <BaksurCharacter
            direction="flamehorn"
            state="IDLE"
            size={120}
            bodyColor={color.body}
            moodColor={color.mood}
            restExpression="mefiant"
            decorative
          />
        </div>
        <PixelBadge tone="primary" className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          LVL {level}
        </PixelBadge>
      </div>

      {/* Character info */}
      <div className="text-center">
        <TerminalText tone="primary" className="!text-xl">BAKASUR</TerminalText>
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
