import React from 'react';
import { CinematicDialoguePlate } from '../bakasur/CinematicDialoguePlate';

interface Props {
  text: string;
  tail?: 'left' | 'right';
  className?: string;
}

/**
 * SpeechBubble — Obsolete comic bubble replaced with Phase 9/10 Cinematic Dialogue Plate.
 * Restrained translucent void plate with subtle violet illumination and clean typography.
 */
export const SpeechBubble: React.FC<Props> = ({ text, className = '' }) => (
  <CinematicDialoguePlate text={text} className={className} />
);

