/*
 * BAKATRACKER — Bakasur UI State & Reaction Adapter (Phase 11).
 *
 * Pure mapping layer: translates BakaTracker domain states and signals into
 * Bakasur UI intents, presets, expressions, themes, and scenes.
 *
 * Deterministic fallback logic: unknown product states map cleanly to 'idle'.
 */

import type { BaksurState } from '../shell/baksurShared'
import type { BaksurSignal } from '../shell/baksurReactions'

export interface ResolvedBakasurLook {
  intent: string
  preset: string
  expression: string | null
  colour?: string
  treatment?: Record<string, unknown>
}

/**
 * Maps legacy/product BaksurState → Bakasur UI intent & expression.
 */
export function mapProductStateToLook(
  state: BaksurState,
  restExpr?: string | null
): ResolvedBakasurLook {
  const customExpr = restExpr && restExpr !== 'neutre' ? restExpr : null

  switch (state) {
    case 'IDLE':
      return { intent: 'idle', preset: 'bakasur-idle', expression: customExpr }
    case 'HAPPY':
      return { intent: 'happy', preset: 'bakasur-happy', expression: customExpr ?? 'happy' }
    case 'THINKING':
      return { intent: 'thinking', preset: 'bakasur-thinking', expression: customExpr ?? 'curious' }
    case 'ALERT':
      return { intent: 'suspicious', preset: 'bakasur-suspicious', expression: customExpr ?? 'annoyed' }
    case 'SLEEP':
      return { intent: 'idle', preset: 'bakasur-idle', expression: 'sleepy' }
    case 'CELEBRATE':
      return { intent: 'burst', preset: 'bakasur-burst', expression: customExpr ?? 'excited' }
    default:
      return { intent: 'idle', preset: 'bakasur-idle', expression: null }
  }
}

/**
 * Maps product event signals → Bakasur UI preset & expression.
 */
export function mapSignalToLook(signal: BaksurSignal): ResolvedBakasurLook {
  switch (signal) {
    case 'JOURNAL_LOGGED':
      return { intent: 'proud', preset: 'bakasur-proud', expression: 'happy' }
    case 'QUEST_COMPLETED':
      return { intent: 'happy', preset: 'bakasur-happy', expression: 'happy' }
    case 'HABIT_COMPLETED':
      return { intent: 'happy', preset: 'bakasur-happy', expression: 'happy' }
    case 'STREAK_MILESTONE':
      return { intent: 'burst', preset: 'bakasur-burst', expression: 'excited' }
    case 'LEVEL_UP':
      return { intent: 'burst', preset: 'bakasur-burst', expression: 'excited' }
    case 'USER_OPENED_BAKSUR':
      return { intent: 'curious', preset: 'bakasur-curious', expression: 'curious' }
    default:
      return { intent: 'idle', preset: 'bakasur-idle', expression: null }
  }
}

/**
 * Maps product intent strings from AI assistant / proactive system to Bakasur UI.
 */
export function mapAssistantIntentToPreset(intent: string): string {
  switch (intent?.toLowerCase()) {
    case 'excited':
    case 'happy':
      return 'bakasur-excited'
    case 'thinking':
    case 'focus':
      return 'bakasur-thinking'
    case 'suspicious':
    case 'annoyed':
    case 'alert':
      return 'bakasur-suspicious'
    case 'burst':
    case 'celebrate':
      return 'bakasur-burst'
    case 'curious':
      return 'bakasur-curious'
    case 'observing':
      return 'bakasur-observing'
    default:
      return 'bakasur-idle'
  }
}
