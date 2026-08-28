import React from 'react';
import { PixelIcon, PixelBadge, SystemLabel, TerminalText } from '../ui';

export interface NotesHUDProps {
  notebookCount: number;
  noteCount: number;
  archivedCount: number;
}

export const NotesHUD: React.FC<NotesHUDProps> = ({
  notebookCount,
  noteCount,
  archivedCount,
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
        <PixelIcon name="notebook" size={18} color="var(--bt-rose)" />
        <div>
          <TerminalText tone="primary">KNOWLEDGE INVENTORY</TerminalText>
          <SystemLabel tone="muted">{notebookCount} notebooks · {noteCount} notes</SystemLabel>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {archivedCount > 0 && (
          <PixelBadge tone="default">{archivedCount} archived</PixelBadge>
        )}
      </div>
    </div>
  );
};
