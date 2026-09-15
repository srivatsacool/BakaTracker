/*
 * BAKASUR-UI — Original Bakasur work (Phase 4).
 *
 * The 18-face Bakasur catalogue. DATA ONLY — no logic, no engine imports
 * beyond types. Authored values (not measured, not renamed upstream rows):
 * the faces are narrower and more lidded than upstream's by default
 * (mysterious deadpan base), asymmetry carries the Bakasur-native moods
 * (curious/suspicious/confused/mischievous/deadpan), and every tilt obeys
 * the upstream tilt-visibility rule (locked by test, same thresholds).
 *
 * Eye index 0 is the inner eye, 1 the outer eye (engine convention).
 */
import type { EyeCfg } from '../../engine/states'
import type { BakasurExpression } from './types'

/** w/h/open capsule; tilt in degrees, + = crown leans right. */
const eye = (
  w: number,
  h: number,
  tilt = 0,
  open = 1
): EyeCfg => ({ w, h, tilt, open })

/** Mirrored-tilt pair (convergent/divergent crowns: anger, sadness...). */
const pair = (
  w: number,
  h: number,
  tilt = 0,
  open = 1
): [EyeCfg, EyeCfg] => [
  eye(w, h, tilt, open),
  eye(w, h, -tilt, open)
]

export const BAKASUR_CATALOGUE: BakasurExpression[] = [
  {
    bakasurId: 'neutral',
    aliasId: 'neutre',
    gaze: { yaw: 0, pitch: 0, roll: 0 },
    split: 15.5,
    eyes: pair(0.28, 0.58, 0),
    meta: { intensity: 0.1, mood: 'flat', followSafe: true, blurb: 'Default resting presence: relaxed, prominent, upright alert capsule eyes.' }
  },
  {
    bakasurId: 'attentive',
    aliasId: 'attentif',
    gaze: { yaw: 4, pitch: 6, roll: 0 },
    split: 16,
    eyes: pair(0.30, 0.62),
    meta: { intensity: 0.35, mood: 'bright', followSafe: true, blurb: 'Notices something: slightly more open, gaze lifted.' }
  },
  {
    bakasurId: 'curious',
    aliasId: 'curieux',
    gaze: { yaw: 14, pitch: -6, roll: -12 },
    split: 16,
    eyes: [eye(0.28, 0.58, -6), eye(0.23, 0.48, -6)],
    meta: { intensity: 0.5, mood: 'inquiring', followSafe: false, blurb: 'Investigating: mismatched eyes, head canted, gaze slid aside.' }
  },
  {
    bakasurId: 'suspicious',
    aliasId: 'mefiant',
    gaze: { yaw: -16, pitch: 4, roll: -4 },
    split: 15.5,
    eyes: [eye(0.26, 0.52, 10), eye(0.22, 0.34, 10)],
    meta: { intensity: 0.55, mood: 'wary', followSafe: false, blurb: 'Judging/questioning: one eye narrowed, sidelong, restrained.' }
  },
  {
    bakasurId: 'confused',
    aliasId: 'confus',
    gaze: { yaw: -12, pitch: 2, roll: 7 },
    split: 16,
    eyes: [eye(0.24, 0.54, -16), eye(0.34, 0.20, 12)],
    meta: { intensity: 0.5, mood: 'lost', followSafe: false, blurb: 'Does not understand: mismatched size and tilt, unsteady gaze.' }
  },
  {
    bakasurId: 'surprised',
    aliasId: 'surpris',
    gaze: { yaw: 3, pitch: -4, roll: 0 },
    split: 19,
    eyes: pair(0.44, 0.62),
    meta: { intensity: 0.8, mood: 'startled', followSafe: true, blurb: 'Sudden discovery: widened, wider-set, big capsules.' }
  },
  {
    bakasurId: 'excited',
    aliasId: 'excite',
    gaze: { yaw: 6, pitch: -12, roll: 0 },
    split: 19.5,
    eyes: pair(0.40, 0.64, -12),
    meta: { intensity: 0.85, mood: 'electric', followSafe: true, blurb: 'Positive energy: wide, tilted, lifted.' }
  },
  {
    bakasurId: 'happy',
    aliasId: 'heureux',
    gaze: { yaw: 5, pitch: 8, roll: 0 },
    split: 17,
    eyes: pair(0.32, 0.22, 12),
    meta: { intensity: 0.5, mood: 'warm', followSafe: true, blurb: 'Subtle positive: soft narrowed arcs, convergent crowns.' }
  },
  {
    bakasurId: 'laughing',
    aliasId: 'hilare',
    gaze: { yaw: 4, pitch: 12, roll: 0 },
    split: 18,
    eyes: pair(0.36, 0.18, 18),
    meta: { intensity: 0.8, mood: 'joyful', followSafe: true, blurb: 'Stronger positive: flatter arcs, higher gaze.' }
  },
  {
    bakasurId: 'annoyed',
    aliasId: 'colere',
    gaze: { yaw: 2, pitch: 6, roll: 0 },
    split: 16.5,
    eyes: pair(0.36, 0.18, 24),
    meta: { intensity: 0.6, mood: 'irritated', followSafe: true, blurb: 'Restrained irritation: narrowed, hard convergent tilt.' }
  },
  {
    bakasurId: 'angry',
    aliasId: 'colere',
    gaze: { yaw: 3, pitch: 7, roll: 0 },
    split: 17,
    eyes: pair(0.36, 0.18, 30),
    meta: { intensity: 0.9, mood: 'furious', followSafe: true, blurb: 'Strong negative: tight slits, steep convergent crowns.' }
  },
  {
    bakasurId: 'sad',
    aliasId: 'triste',
    gaze: { yaw: 3, pitch: -12, roll: 0 },
    split: 16,
    eyes: pair(0.26, 0.50, -26),
    meta: { intensity: 0.5, mood: 'low', followSafe: true, blurb: 'Subdued: divergent crowns, gaze dropped.' }
  },
  {
    bakasurId: 'scared',
    aliasId: 'effraye',
    gaze: { yaw: 2, pitch: -18, roll: 0 },
    split: 20.5,
    eyes: pair(0.42, 0.64),
    meta: { intensity: 0.9, mood: 'alarmed', followSafe: true, blurb: 'Danger: widest set, roundest, gaze down.' }
  },
  {
    bakasurId: 'proud',
    aliasId: 'fier',
    gaze: { yaw: 5, pitch: 15, roll: 0 },
    split: 17,
    eyes: pair(0.32, 0.22, 16),
    meta: { intensity: 0.6, mood: 'smug', followSafe: true, blurb: 'Self-satisfied: lifted arcs, chin-up gaze.' }
  },
  {
    bakasurId: 'unimpressed',
    aliasId: 'blase',
    gaze: { yaw: -20, pitch: 2, roll: 0 },
    split: 16,
    eyes: pair(0.32, 0.18),
    meta: { intensity: 0.45, mood: 'dismissive', followSafe: true, blurb: 'Deadpan judgment: flat slits sliding off to the side.' }
  },
  {
    bakasurId: 'sleepy',
    aliasId: 'somnolent',
    gaze: { yaw: 6, pitch: -8, roll: -3 },
    split: 16,
    eyes: pair(0.26, 0.50, 0, 0.45),
    meta: { intensity: 0.2, mood: 'drowsy', followSafe: false, blurb: 'Low energy: half-lidded via openness, gaze sunk.' }
  },
  {
    bakasurId: 'mischievous',
    aliasId: 'mefiant',
    gaze: { yaw: -14, pitch: 2, roll: -5 },
    split: 16,
    eyes: [eye(0.28, 0.52, -10), eye(0.32, 0.22, 10)],
    meta: { intensity: 0.65, mood: 'scheming', followSafe: false, blurb: 'Plotting: uneven openness, sidelong, deliberate.' }
  },
  {
    bakasurId: 'deadpan',
    aliasId: 'blase',
    gaze: { yaw: 0, pitch: 0, roll: 0 },
    split: 15.5,
    eyes: pair(0.30, 0.20),
    meta: { intensity: 0.25, mood: 'flat', followSafe: true, blurb: 'Level stare: flat narrow slits, dead level gaze.' }
  }
]
