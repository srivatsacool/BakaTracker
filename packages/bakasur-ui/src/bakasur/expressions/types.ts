/*
 * BAKASUR-UI — Original Bakasur work (Phase 4).
 *
 * Bakasur expression types. A Bakasur expression IS engine-shaped data
 * (gaze/split/eyes use the exact upstream contracts) plus a Bakasur-native
 * identity and light personality metadata. No behaviour, no logic.
 */
import type { ExpressionId } from '../../engine/expressions'
import type { HeadGaze } from '../../engine/face'
import type { EyeCfg } from '../../engine/states'

/** The 18 Bakasur-native face ids (16 vocabulary + mischievous + deadpan). */
export type BakasurExpressionId =
  | 'neutral'
  | 'attentive'
  | 'curious'
  | 'suspicious'
  | 'confused'
  | 'surprised'
  | 'excited'
  | 'happy'
  | 'laughing'
  | 'annoyed'
  | 'angry'
  | 'sad'
  | 'scared'
  | 'proud'
  | 'unimpressed'
  | 'sleepy'
  | 'mischievous'
  | 'deadpan'

export interface BakasurExpressionMeta {
  /** 0..1 dramatic weight (drives future timing/priority, never geometry). */
  intensity: number
  /** Dialogue-mood tag for the Phase 9 layer. */
  mood: string
  /** True when gaze.roll is 0 (see upstream gaze rule: roll + follow jumps). */
  followSafe: boolean
  /** One-line design intent, for reviewers of the contact sheet. */
  blurb: string
}

export interface BakasurExpression {
  bakasurId: BakasurExpressionId
  /**
   * Nearest upstream geometric family. Satisfies the BotExpression contract
   * (engine blend labels) and documents provenance. Duplicates are
   * intentional: the alias is a family, not an identity.
   */
  aliasId: ExpressionId
  gaze: HeadGaze
  split: number
  eyes: [EyeCfg, EyeCfg]
  meta: BakasurExpressionMeta
}
