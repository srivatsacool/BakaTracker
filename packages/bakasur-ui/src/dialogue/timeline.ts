/*
 * BAKASUR-UI — Original Bakasur work (Phase 9).
 *
 * Dialogue timeline: pure timing over the sequence, never the engine.
 * Three layers stay separate — scene timeline, Bakasur timeline,
 * dialogue timeline — and dialogue only ever asks the preset pipeline
 * for a resolved reaction. Deterministic: same sequence + same t
 * yields the same state; a choice line's schedule freezes at its
 * reveal end until a choice is applied.
 */

import { REVEAL_CPS, REVEAL_TAIL, REVEAL_WPS } from './speakers'
import type { DialogueLine, DialogueSequence, DialogueState } from './types'

/** Word/char counts precomputed per line so schedules are pure data. */
function charCount(line: DialogueLine): number {
  return [...line.text].length
}
function wordCount(line: DialogueLine): number {
  return line.text.trim() ? line.text.trim().split(/\s+/).length : 0
}

export function defaultReveal(line: DialogueLine): DialogueLine['reveal'] {
  if (line.reveal) return line.reveal
  return line.speaker === 'bakasur' ? 'chars' : 'instant'
}

/** Reveal duration under the line's mode (instant → 0). */
export function revealSeconds(line: DialogueLine, reduced: boolean): number {
  const mode = defaultReveal(line)
  if (reduced || mode === 'instant') return 0
  if (mode === 'chars') return charCount(line) / REVEAL_CPS
  return wordCount(line) / REVEAL_WPS
}

/** Visible seconds of one line: max(duration, reveal + tail). */
export function lineSeconds(line: DialogueLine, reduced: boolean): number {
  const natural = revealSeconds(line, reduced) + REVEAL_TAIL
  return Math.max(line.duration ?? 0, natural)
}

export interface ScheduledLine {
  line: DialogueLine
  start: number
  end: number
}

/**
 * Linear walk of `next` links (no branching scheduled here: choices
 * rewrite the walk by resuming at the chosen line). A cycle is reported
 * and cut at the repeat — never scheduled.
 */
export function scheduleSequence(
  seq: DialogueSequence,
  opts?: { reducedMotion?: boolean; resumeAt?: string | null; choices?: Record<string, string> }
): { schedule: ScheduledLine[]; total: number; cycle: boolean } {
  const reduced = opts?.reducedMotion ?? false
  const byId = new Map(seq.lines.map((l) => [l.id, l]))
  const start = opts?.resumeAt ?? seq.first
  const out: ScheduledLine[] = []
  let t = 0
  let id: string | null | undefined = start
  const seen = new Set<string>()
  let cycle = false
  while (id && out.length <= seq.lines.length) {
    if (seen.has(id)) {
      cycle = true
      break
    }
    seen.add(id)
    const line = byId.get(id)
    if (!line) break
    const chosen = line.choices?.length ? opts?.choices?.[line.id] : undefined
    const dur = lineSeconds(line, reduced)
    const gap = Math.max(0, line.delay ?? 0)
    out.push({ line, start: t + gap, end: t + gap + dur })
    t += gap + dur
    id = chosen ?? line.next ?? null
    if (chosen && !byId.has(chosen)) break
  }
  return { schedule: out, total: t, cycle }
}

/** Text visible at tIn under the reveal rule. Grapheme-ish (codepoint) chars. */
export function revealText(line: DialogueLine, tIn: number, reduced: boolean): string {
  const mode = defaultReveal(line)
  if (reduced || mode === 'instant' || tIn < 0) return tIn < 0 ? '' : line.text
  const dur = revealSeconds(line, false)
  if (tIn >= dur) return line.text
  const chars = [...line.text]
  if (mode === 'chars') {
    const n = Math.min(chars.length, Math.floor((tIn / dur) * chars.length) + (dur > 0 ? 0 : chars.length))
    return chars.slice(0, Math.max(0, n)).join('')
  }
  // words: reveal whole words at the word boundary
  const words = line.text.trim().split(/\s+/)
  const n = Math.min(words.length, Math.floor((tIn / dur) * words.length) + (dur > 0 ? 0 : words.length))
  return words.slice(0, Math.max(0, n)).join(' ')
}

/**
 * The dialogue state at scene-time t. Pure. `choiceAt` records applied
 * choices (lineId → next id). A choice line in full-display state
 * returns waitingChoice: playback stops there until the caller applies
 * a choice.
 */
export function dialogueStateAt(
  seq: DialogueSequence,
  t: number,
  opts?: { reducedMotion?: boolean; resumeAt?: string | null; choices?: Record<string, string> }
): DialogueState {
  const { schedule, total } = scheduleSequence(seq, opts)
  const reduced = opts?.reducedMotion ?? false
  const empty: DialogueState = {
    lineId: null,
    line: null,
    tIn: 0,
    revealed: '',
    full: false,
    waitingChoice: false,
    done: schedule.length === 0 || t >= total,
    total,
    reaction: null
  }
  if (!Number.isFinite(t) || t < 0) return empty
  const slot = schedule.find((s) => t >= s.start && t < s.end)
  if (!slot) {
    const last = schedule[schedule.length - 1]
    if (last && t >= total) {
      return { ...empty, lineId: last.line.id, line: last.line, full: true, revealed: last.line.text, total }
    }
    return empty
  }
  const tIn = t - slot.start
  const revealed = revealText(slot.line, tIn, reduced)
  const full = tIn >= revealSeconds(slot.line, reduced)
  const waitingChoice = full && (slot.line.choices?.length ?? 0) > 0
  return {
    lineId: slot.line.id,
    line: slot.line,
    tIn,
    revealed,
    full,
    waitingChoice,
    done: false,
    total,
    reaction: slot.line.reaction ?? null
  }
}

/** First time the playhead can resume past a waiting choice line (skip target). */
export function endOfLine(schedule: ScheduledLine[], lineId: string): number {
  return schedule.find((s) => s.line.id === lineId)?.end ?? 0
}
