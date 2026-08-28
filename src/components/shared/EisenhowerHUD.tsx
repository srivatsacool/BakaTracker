import React from 'react';
import { PixelIcon, SystemLabel, TerminalText } from '../ui';

export interface EisenhowerHUDProps {
  totalAssigned: number;
  urgent: number;
  important: number;
  unassigned: number;
}

export const EisenhowerHUD: React.FC<EisenhowerHUDProps> = ({
  totalAssigned,
  urgent,
  important,
  unassigned,
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
          <TerminalText tone="primary">PRIORITY BOARD</TerminalText>
          <SystemLabel tone="muted">{totalAssigned} assigned · {unassigned} unassigned</SystemLabel>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <PixelIcon name="fire" size={12} color="var(--bt-danger)" />
          <SystemLabel tone="danger">{urgent} urgent</SystemLabel>
        </div>
        <div className="flex items-center gap-1.5">
          <PixelIcon name="star" size={12} color="var(--bt-primary-bright)" />
          <SystemLabel tone="primary">{important} important</SystemLabel>
        </div>
      </div>
    </div>
  );
};
