/*
 * BAKATRACKER — Baksur Character Adapter
 *
 * Directs all Baksur character rendering to the single source of truth:
 * BakasurBot in bakasur-ui via BakasurBotAdapter.
 * Automatically renders the canonical Flamehorn profile, expressions,
 * and animations natively via bakasur-ui.
 */

import React from 'react'
import { BakasurBotAdapter } from '../bakasur/BakasurBotAdapter'
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

export function BaksurCharacter({
  state,
  size = 48,
  frozenAt = 0,
  moodColor,
  restExpression = 'neutral',
  followPointer: _followPointer = false,
  decorative = false,
  ariaLabel = 'Bakasur, your companion',
  className,
  style
}: BaksurCharacterProps) {
  const look = mapProductStateToLook(state, restExpression)

  return (
    <BakasurBotAdapter
      state={look.intent}
      expression={look.expression}
      colour={moodColor}
      size={size}
      frozenAt={frozenAt !== undefined ? frozenAt : 0}
      follow={false}
      label={decorative ? undefined : ariaLabel}
      className={className}
      style={style}
    />
  )
}
