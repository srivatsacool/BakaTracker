/*
 * BAKATRACKER — Bakasur Dialogue Component
 *
 * Cinematic dialogue speech plate hovering near Bakasur.
 * Replaces the conventional dashboard card with an integrated character voice:
 * dark obsidian glass, violet beacon indicator, soft glow, and organic entrance.
 */

import React from 'react';

export interface BakasurDialogueProps {
  message: string;
  visible: boolean;
  scene?: string;
  variant?: 'hero' | 'spatial' | 'ambient';
  speaker?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const BakasurDialogue: React.FC<BakasurDialogueProps> = ({
  message,
  visible,
  scene = 'threshold',
  variant = 'hero',
  speaker = 'BAKASUR',
  className = '',
  style,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${speaker}: ${message}`}
      data-scene={scene}
      data-variant={variant}
      className={`bakasur-dialogue-plate ${visible ? 'is-visible' : 'is-hidden'} ${className}`}
      style={style}
    >
      <div className="bakasur-dialogue-header">
        <span className="bakasur-dialogue-beacon" aria-hidden="true" />
        <span className="bakasur-dialogue-speaker">{speaker}</span>
      </div>
      <p className="bakasur-dialogue-body">{message}</p>
      <div className="bakasur-dialogue-anchor" aria-hidden="true" />
    </div>
  );
};

export default BakasurDialogue;
