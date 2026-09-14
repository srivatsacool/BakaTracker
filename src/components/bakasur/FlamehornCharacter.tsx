/*
 * BAKATRACKER — Canonical Flamehorn Character Component (bakasur-ui Adapter)
 *
 * Backed directly by bakasur-ui (BakasurBot).
 * Renders the canonical Flamehorn profile, expressions, lighting, and animations
 * using the single source of truth in bakasur-ui.
 */

import React from 'react'
import { BakasurBotAdapter } from './BakasurBotAdapter'
import { FLAMEHORN_RADII } from 'bakasur-ui'

export type FlamehornMood = 'idle' | 'thinking' | 'celebrate' | 'alert' | 'sleep' | 'happy'

export interface FlamehornCharacterProps {
  state?: FlamehornMood | 'IDLE' | 'THINKING' | 'CELEBRATE' | 'ALERT' | 'SLEEP' | 'HAPPY'
  size?: number
  moodColor?: string
  preset?: string
  tactileTexture?: number
  coreDepth?: number
  specularSheen?: number
  eyeGlow?: number
  socketDepth?: number
  followPointer?: boolean
  interactive?: boolean
  showGroundShadow?: boolean
  frozenAt?: number
  decorative?: boolean
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
  onSvgReady?: (svgString: string) => void
}

export { FLAMEHORN_RADII }

const MOOD_TO_INTENT: Record<string, { intent: string; expression?: string }> = {
  idle: { intent: 'idle', expression: 'neutral' },
  thinking: { intent: 'thinking', expression: 'curious' },
  celebrate: { intent: 'burst', expression: 'excited' },
  alert: { intent: 'alert', expression: 'surprised' },
  sleep: { intent: 'sleep', expression: 'sleepy' },
  happy: { intent: 'idle', expression: 'happy' }
}

export const FlamehornCharacter: React.FC<FlamehornCharacterProps> = ({
  state = 'idle',
  size = 160,
  moodColor,
  preset,
  followPointer = true,
  frozenAt,
  decorative = false,
  ariaLabel = 'Bakasur Flamehorn',
  className,
  style
}) => {
  const normalizedKey = String(state).toLowerCase()
  const mapping = MOOD_TO_INTENT[normalizedKey] ?? { intent: normalizedKey }

  return (
    <BakasurBotAdapter
      state={mapping.intent}
      expression={mapping.expression}
      preset={preset}
      size={size}
      colour={moodColor}
      follow={followPointer}
      frozenAt={frozenAt}
      label={decorative ? undefined : ariaLabel}
      className={className}
      style={style}
    />
  )
}
