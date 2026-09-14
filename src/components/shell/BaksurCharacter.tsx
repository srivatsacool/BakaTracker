/*
 * BAKATRACKER — Baksur Character Adapter
 *
 * Renders the canonical Flamehorn character with rich volumetric depth,
 * luminous capsule eyes, and gaze tracking when direction is 'flamehorn' (default),
 * or falls back to BakasurBotAdapter for legacy silhouettes.
 */

import React from 'react'
import { BakasurBotAdapter } from '../bakasur/BakasurBotAdapter'
import { FlamehornCharacter, type FlamehornMood } from '../bakasur/FlamehornCharacter'
import { mapProductStateToLook } from '../bakasur/stateMapping'
import type { BaksurDirection, BaksurState } from './baksurShared'

export interface BaksurCharacterProps {
  direction?: BaksurDirection
  state: BaksurState
  size?: number
  frozenAt?: number
  bodyColor?: string
  moodColor?: string
  eyeColor?: string
  restExpression?: string | null
  followPointer?: boolean
  decorative?: boolean
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

function mapBaksurStateToFlamehorn(state: BaksurState): FlamehornMood {
  switch (state) {
    case 'THINKING':
      return 'thinking'
    case 'HAPPY':
      return 'happy'
    case 'ALERT':
      return 'alert'
    case 'SLEEP':
      return 'sleep'
    case 'CELEBRATE':
      return 'celebrate'
    case 'IDLE':
    default:
      return 'idle'
  }
}

export function BaksurCharacter({
  direction = 'flamehorn',
  state,
  size = 48,
  frozenAt,
  moodColor,
  restExpression = null,
  followPointer = false,
  decorative = false,
  ariaLabel = 'Bakasur, your companion',
  className,
  style
}: BaksurCharacterProps) {
  // Use canonical Flamehorn character for 'flamehorn' direction
  if (direction === 'flamehorn') {
    const flameMood = mapBaksurStateToFlamehorn(state)
    return (
      <FlamehornCharacter
        state={flameMood}
        size={size}
        moodColor={moodColor || '#8B5CF6'}
        frozenAt={frozenAt}
        followPointer={followPointer}
        interactive={!decorative}
        decorative={decorative}
        ariaLabel={ariaLabel}
        className={className}
        style={style}
      />
    )
  }

  // Legacy or alternate silhouettes delegate to BakasurBotAdapter
  const look = mapProductStateToLook(state, restExpression)

  return (
    <BakasurBotAdapter
      state={look.intent}
      expression={look.expression}
      size={size}
      frozenAt={frozenAt}
      follow={followPointer}
      label={decorative ? undefined : ariaLabel}
      className={className}
      style={style}
    />
  )
}
