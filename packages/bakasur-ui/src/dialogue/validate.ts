/*
 * BAKASUR-UI — Original Bakasur work (Phase 9).
 *
 * Sequence validation. References are checked against the existing
 * catalogues (expression/animation/preset/theme/speaker/style/personality)
 * and timing/choices/next-links structurally. Returns structured issues;
 * user-authored mistakes are never exceptions.
 */

import { BAKASUR_ANIMATIONS } from '../bakasur/animations'
import { BAKASUR_EXPRESSION_BY_ID } from '../bakasur/expressions/index'
import { getBakasurPreset, getBakasurPersonality } from '../bakasur/presets/catalogue'
import { isBakasurThemeId } from '../bakasur/presets/colours'
import { isSpeakerId, isStyleId } from './speakers'
import type {
  DialogueIssue,
  DialogueLine,
  DialogueSequence,
  DialogueValidation,
  ReactionCue
} from './types'

const INTENTS = new Set(BAKASUR_ANIMATIONS.map((a) => a.intent))
const ANCHORS = new Set(['above', 'below', 'left', 'right', 'center', 'custom'])
const ENTRANCES = new Set(['fade', 'rise', 'none'])
const REVEALS = new Set(['instant', 'fade', 'chars', 'words'])

function num(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function validateReactionCue(cue: ReactionCue | undefined | null, field: string): DialogueIssue[] {
  if (cue == null) return []
  const out: DialogueIssue[] = []
  const push = (code: string, message: string): void => {
    out.push({ field, code, message })
  }
  if (cue.preset !== undefined && !getBakasurPreset(cue.preset)) push('unknown-preset', `Unknown preset "${cue.preset}".`)
  if (cue.expression !== undefined && !BAKASUR_EXPRESSION_BY_ID.has(cue.expression)) push('unknown-expression', `Unknown expression "${cue.expression}".`)
  if (cue.animation !== undefined && !INTENTS.has(cue.animation)) push('unknown-animation', `Unknown animation "${cue.animation}".`)
  if (cue.theme !== undefined && !isBakasurThemeId(cue.theme)) push('unknown-theme', `Unknown theme "${cue.theme}".`)
  if (cue.intensity !== undefined && (!num(cue.intensity) || cue.intensity < 0 || cue.intensity > 1)) push('bad-intensity', 'intensity must be 0..1.')
  if (cue.duration !== undefined && (!num(cue.duration) || cue.duration < 0)) push('bad-duration', 'duration must be a finite number >= 0.')
  if (cue.gaze !== undefined) {
    const { yaw, pitch, mix } = cue.gaze
    if (!num(yaw) || !num(pitch) || !num(mix) || mix < 0 || mix > 1) push('bad-gaze', 'gaze needs finite yaw/pitch and mix 0..1.')
  }
  return out
}

export function validateDialogueLine(line: DialogueLine, _seqId: string): DialogueIssue[] {
  const issues: DialogueIssue[] = []
  const push = (field: string, code: string, message: string): void => {
    issues.push({ field, code, message })
  }
  const at = `lines.${line.id || '?'}`
  if (!line.id || typeof line.id !== 'string') push(at, 'bad-id', 'Each line needs a non-empty id.')
  if (typeof line.text !== 'string' || !line.text) push(at, 'bad-text', 'Each line needs non-empty text.')
  if (!isSpeakerId(line.speaker)) push(at, 'unknown-speaker', `Unknown speaker "${String(line.speaker)}".`)
  for (const i of validateReactionCue(line.reaction, at)) issues.push(i)
  if (line.delay !== undefined && (!num(line.delay) || line.delay < 0)) push(at, 'bad-delay', 'delay must be finite >= 0.')
  if (line.duration !== undefined && (!num(line.duration) || line.duration <= 0)) push(at, 'bad-duration', 'duration must be finite > 0 when set.')
  if (line.reveal !== undefined && !REVEALS.has(line.reveal)) push(at, 'bad-reveal', `reveal must be one of ${[...REVEALS].join(', ')}.`)
  if (line.position !== undefined && !ANCHORS.has(line.position)) push(at, 'bad-position', 'position must be above/below/left/right/center/custom.')
  if (line.position === 'custom') {
    if (!line.custom || !num(line.custom.x) || !num(line.custom.y) || line.custom.x < 0 || line.custom.x > 1 || line.custom.y < 0 || line.custom.y > 1) {
      push(at, 'bad-custom', 'custom position needs normalized x/y in 0..1.')
    }
  }
  if (line.style !== undefined && !isStyleId(line.style)) push(at, 'unknown-style', `Unknown presentation style "${line.style}".`)
  if (line.entrance !== undefined && !ENTRANCES.has(line.entrance)) push(at, 'bad-entrance', 'entrance must be fade, rise or none.')
  const choiceIds = new Set<string>()
  for (const c of line.choices ?? []) {
    if (!c.id || choiceIds.has(c.id)) push(at, 'bad-choice-id', `Duplicate or empty choice id "${c.id}".`)
    choiceIds.add(c.id)
    if (!c.label) push(at, 'bad-choice-label', `Choice "${c.id}" needs a label.`)
    if (!c.next) push(at, 'bad-choice-next', `Choice "${c.id}" needs a next line id.`)
    for (const i of validateReactionCue(c.reaction, `${at}#${c.id}`)) issues.push(i)
  }
  return issues
}

export function validateDialogueSequence(seq: unknown): DialogueValidation {
  const issues: DialogueIssue[] = []
  const push = (field: string, code: string, message: string): void => {
    issues.push({ field, code, message })
  }
  if (typeof seq !== 'object' || seq === null) {
    return { ok: false, issues: [{ field: 'sequence', code: 'not-object', message: 'Sequence must be an object.' }] }
  }
  const s = seq as DialogueSequence
  if (!s.id) push('id', 'bad-id', 'Sequence needs an id.')
  if (!s.name) push('name', 'bad-name', 'Sequence needs a name.')
  if (!Array.isArray(s.lines) || s.lines.length === 0) {
    push('lines', 'empty', 'Sequence needs at least one line.')
    return { ok: false, issues }
  }
  const ids = new Set<string>()
  for (const line of s.lines) {
    for (const i of validateDialogueLine(line, s.id)) issues.push(i)
    if (ids.has(line.id)) push(`lines.${line.id}`, 'duplicate-id', `Line id "${line.id}" repeats.`)
    ids.add(line.id)
  }
  if (!ids.has(s.first)) push('first', 'unknown-first', `first "${String(s.first)}" is not a line id.`)
  for (const line of s.lines) {
    if (line.next && !ids.has(line.next)) push(`lines.${line.id}`, 'unknown-next', `next "${line.next}" is not a line id.`)
    for (const c of line.choices ?? []) {
      if (c.next && !ids.has(c.next)) push(`lines.${line.id}#${c.id}`, 'unknown-choice-next', `choice next "${c.next}" is not a line id.`)
    }
  }
  if (s.personality !== undefined && !getBakasurPersonality(s.personality)) push('personality', 'unknown-personality', `Unknown personality "${s.personality}".`)
  // A line that follows a choice must be reachable; an impossible
  // schedule = a cycle without any choice breaking it (validator walks).
  if (issues.length === 0) {
    const seen = new Set<string>()
    let id: string | null | undefined = s.first
    while (id) {
      if (seen.has(id)) {
        push('timeline', 'cycle', `next links loop at "${id}".`)
        break
      }
      seen.add(id)
      const line = s.lines.find((l) => l.id === id)
      id = line?.choices?.length ? null : (line?.next ?? null)
    }
  }
  return { ok: issues.length === 0, issues }
}
