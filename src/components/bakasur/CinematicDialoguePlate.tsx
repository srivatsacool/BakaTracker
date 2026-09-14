/*
 * BAKATRACKER — Cinematic Dialogue Plate Component (Phase 11).
 *
 * Replaces the obsolete paper/comic speech bubble with Phase 9/10 cinematic
 * dialogue presentation: translucent dark void background, subtle violet glow,
 * clean typography, and unobtrusive placement.
 */

import React from 'react'

export interface CinematicDialoguePlateProps {
  text: string
  speaker?: string
  source?: string
  className?: string
  style?: React.CSSProperties
}

export const CinematicDialoguePlate: React.FC<CinematicDialoguePlateProps> = ({
  text,
  speaker = 'Bakasur',
  source,
  className = '',
  style
}) => {
  return (
    <div
      role="note"
      aria-label={`${speaker} says: ${text}`}
      className={`cine-plate-root relative rounded-xl px-4 py-3 border border-solid text-sm leading-relaxed ${className}`}
      style={{
        background: 'rgba(11, 8, 20, 0.88)',
        borderColor: 'rgba(157, 123, 255, 0.22)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 0 12px rgba(157, 123, 255, 0.08)',
        backdropFilter: 'blur(8px)',
        color: '#ece6fb',
        ...style
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1 text-[11px] font-medium tracking-wide" style={{ color: '#b3a8d6' }}>
        <span>{speaker}</span>
        {source && <span className="opacity-70 text-[10px]">{source}</span>}
      </div>
      <p className="m-0 font-normal">{text}</p>
    </div>
  )
}
