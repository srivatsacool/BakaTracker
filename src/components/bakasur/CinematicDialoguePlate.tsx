/*
 * BAKATRACKER — Cinematic Dialogue Plate Component (Phase 11 & Redesign).
 *
 * Replaces the obsolete paper/comic speech bubble with an integrated spatial HUD plate:
 * translucent dark obsidian background, subtle violet illumination,
 * crisp typography, and disciplined placement.
 */

import React from 'react';

export interface CinematicDialoguePlateProps {
  text: string;
  speaker?: string;
  source?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const CinematicDialoguePlate: React.FC<CinematicDialoguePlateProps> = ({
  text,
  speaker = 'Bakasur',
  source,
  className = '',
  style,
}) => {
  return (
    <div
      role="status"
      aria-label={`${speaker}: ${text}`}
      className={`cine-plate-root ${className}`}
      style={style}
    >
      <div className="cine-plate-header">
        <div className="flex items-center gap-2">
          <span className="cine-plate-dot" aria-hidden="true" />
          <span className="cine-plate-speaker">{speaker}</span>
        </div>
        {source && <span className="cine-plate-source">{source}</span>}
      </div>
      <p className="cine-plate-text">{text}</p>
    </div>
  );
};
