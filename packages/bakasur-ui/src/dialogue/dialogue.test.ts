/*
 * BAKASUR-UI — Original Bakasur work (Phase 9).
 *
 * Dialogue system tests (node, no DOM): catalogue integrity, validation
 * of every reference axis, deterministic timing/reveal, reaction
 * resolution through the preset pipeline, personality nudges, rules,
 * the explicit state table, choices and serialization. The law: same
 * sequence + same t = same state.
 */
import { describe, expect, it } from 'vitest'
import { BAKASUR_EXPRESSION_BY_ID } from '../bakasur/expressions/index'
import { applyPersonality, cueToResolved, DEFAULT_RULES, findRule, nextState, type InteractionRule } from './reactions'
import { getDialogueSequence, listDialogueSequences } from './sequences'
import { isSpeakerId, isStyleId } from './speakers'
import {
  dialogueStateAt,
  revealSeconds,
  revealText,
  scheduleSequence
} from './timeline'
import { validateDialogueSequence } from './validate'
import type { DialogueSequence, ReactionCue } from './types'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

describe('dialogue catalogue', () => {
  it('holds the 5 specified sequences, all valid and distinct', () => {
    for (const id of ['bakasur-greeting', 'bakasur-curious', 'bakasur-suspicious', 'bakasur-challenge', 'bakasur-success']) {
      expect(getDialogueSequence(id).id, id).toBe(id)
    }
    for (const s of listDialogueSequences()) {
      expect(validateDialogueSequence(s).ok, s.id).toBe(true)
    }
    expect(new Set(listDialogueSequences().map((s) => s.personality)).size).toBeGreaterThanOrEqual(4)
  })

  it('pure functions never mutate the static catalogue', () => {
    const before = JSON.stringify(listDialogueSequences())
    for (const s of listDialogueSequences()) {
      scheduleSequence(s)
      dialogueStateAt(s, 1.5)
      validateDialogueSequence(s)
      cueToResolved(s.lines[0]!.reaction ?? { expression: 'curious' }, 'bakasur')
    }
    expect(JSON.stringify(listDialogueSequences())).toBe(before)
  })

  it('unknown ids degrade to greeting', () => {
    expect(getDialogueSequence('nope' as never).id).toBe('bakasur-greeting')
  })
})

describe('dialogue validation', () => {
  it('reports structured issues per axis', () => {
    const s = clone(getDialogueSequence('bakasur-greeting'))
    s.lines[0]!.speaker = 'glados' as never
    s.lines[1]!.reaction = { preset: 'nope' as never, expression: 'vague' as never, animation: 'nope' as never, theme: 'rainbow' as never, intensity: 9 }
    s.lines[2]!.next = 'ghost'
    s.first = 'ghost'
    s.personality = 'gremlin' as never
    const v = validateDialogueSequence(s)
    expect(v.ok).toBe(false)
    const codes = v.issues.map((i) => i.code)
    for (const c of ['unknown-speaker', 'unknown-preset', 'unknown-expression', 'unknown-animation', 'unknown-theme', 'bad-intensity', 'unknown-next', 'unknown-first', 'unknown-personality']) {
      expect(codes, c).toContain(c)
    }
  })

  it('rejects choice-less malformed data and duplicate ids', () => {
    const s = clone(getDialogueSequence('bakasur-greeting'))
    s.lines.push({ id: 'g1', text: 'dup', speaker: 'bakasur' })
    const v = validateDialogueSequence(s)
    expect(v.issues.map((i) => i.code)).toContain('duplicate-id')
    s.lines.pop()
    s.lines[0]!.choices = [{ id: 'a', label: '', next: '' }]
    expect(validateDialogueSequence(s).issues.map((i) => i.code)).toContain('bad-choice-label')
    s.lines[0]!.choices = [{ id: '', label: 'x', next: 'ghost' }]
    expect(validateDialogueSequence(s).issues.map((i) => i.code)).toContain('bad-choice-id')
  })

  it('flags next-link cycles as an impossible timeline', () => {
    const s: DialogueSequence = {
      id: 'x', name: 'x', description: '', first: 'a',
      lines: [
        { id: 'a', text: 'A', speaker: 'bakasur', next: 'b' },
        { id: 'b', text: 'B', speaker: 'bakasur', next: 'a' }
      ]
    }
    expect(validateDialogueSequence(s).issues.map((i) => i.code)).toContain('cycle')
  })
})

describe('dialogue timeline', () => {
  it('schedules lines sequentially with delays', () => {
    const s = getDialogueSequence('bakasur-greeting')
    const { schedule, total } = scheduleSequence(s)
    expect(schedule).toHaveLength(3)
    expect(schedule[0]!.start).toBe(0)
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i]!.start).toBeGreaterThanOrEqual(schedule[i - 1]!.end)
    }
    expect(total).toBeGreaterThan(schedule[schedule.length - 1]!.end - 0.001)
  })

  it('state is deterministic per (seq, t)', () => {
    const s = clone(getDialogueSequence('bakasur-curious'))
    for (const t of [0, 0.5, 2, 4.5, 9]) {
      expect(JSON.stringify(dialogueStateAt(s, t))).toBe(JSON.stringify(dialogueStateAt(s, t)))
    }
  })

  it('chars reveal grows with time and completes', () => {
    const line = getDialogueSequence('bakasur-curious').lines[1]!
    const dur = revealSeconds(line, false)
    expect(revealText(line, 0, false)).toBe('')
    expect(revealText(line, dur, false)).toBe(line.text)
    expect(revealText(line, dur / 2, false).length).toBeLessThan(line.text.length)
    expect(revealText(line, -0.01, true)).toBe('')
    expect(revealText(line, 0, true)).toBe(line.text)
  })

  it('a choice line waits; applied choices reroute and un-wait', () => {
    const s = getDialogueSequence('bakasur-challenge')
    const { schedule } = scheduleSequence(s)
    const h2 = schedule.find((x) => x.line.id === 'h2')!
    const st = dialogueStateAt(s, h2.end - 0.05)
    expect(st.waitingChoice).toBe(true)
    expect(st.line?.choices?.length).toBeGreaterThan(0)
    const after = dialogueStateAt(s, h2.end + 0.2, { choices: { h2: 'h3a' } })
    expect(after.line?.id).toBe('h3a')
    expect(after.waitingChoice).toBe(false)
  })

  it('done holds at the end, empty before nothing', () => {
    const s = getDialogueSequence('bakasur-greeting')
    const { total } = scheduleSequence(s)
    expect(dialogueStateAt(s, total + 1).done).toBe(true)
    expect(dialogueStateAt(s, NaN).done).toBe(false)
    expect(dialogueStateAt(s, -1).lineId).toBeNull()
  })
})

describe('reaction resolution', () => {
  it('cues resolve through the existing preset pipeline', () => {
    const r = cueToResolved({ expression: 'proud', animation: 'egg', intensity: 0.5 }, 'bakasur')
    expect(r.animation).toBe('egg')
    expect(r.expression).toBe('proud')
    expect(r.treatment.glow).toBeCloseTo(1.4, 10)
    const viaPreset = cueToResolved({ preset: 'bakasur-alert' }, 'bakasur')
    expect(viaPreset.animation).toBe('alert')
  })

  it('personality nudges swap faces and reweight intensity, deterministically', () => {
    const cue: ReactionCue = { expression: 'neutral', animation: 'idle', intensity: 0.3 }
    expect(applyPersonality(cue, 'curious')?.expression).toBe('curious')
    expect(applyPersonality(cue, 'suspicious')?.expression).toBe('suspicious')
    const boosted = applyPersonality(cue, 'chaotic')
    expect(boosted?.intensity).toBeCloseTo(0.45, 10)
    expect(applyPersonality(cue, 'gremlin')).toEqual(cue)
    expect(applyPersonality(null, 'curious')).toBeNull()
  })
})

describe('interaction rules + state machine', () => {
  it('defaults map events to valid cue references', () => {
    for (const rule of DEFAULT_RULES) {
      const { expression, animation, preset, intensity } = rule.reaction
      if (expression !== undefined) expect(BAKASUR_EXPRESSION_BY_ID.has(expression), expression).toBe(true)
      if (animation !== undefined) expect(() => cueToResolved(rule.reaction, 'bakasur')).not.toThrow()
      if (preset !== undefined) expect(preset.startsWith('bakasur-')).toBe(true)
      if (intensity !== undefined) expect(intensity).toBeGreaterThanOrEqual(0)
    }
  })

  it('findRule respects the state guard', () => {
    const custom: InteractionRule[] = [{ event: 'click', when: { waiting: true }, reaction: { expression: 'annoyed' as never } }]
    expect(findRule(custom, 'click', 'idle')).toBeUndefined()
    expect(findRule(custom, 'click', 'waiting')).toBe(custom[0])
  })

  it('transitions are explicit; unknown signals hold the state', () => {
    expect(nextState('idle', 'pointerenter')).toBe('hover')
    expect(nextState('hover', 'pointerleave')).toBe('idle')
    expect(nextState('speaking', 'choice')).toBe('waiting')
    expect(nextState('waiting', 'choice:pick')).toBe('reacting')
    expect(nextState('reacting', 'react:end')).toBe('idle')
    expect(nextState('idle', 'keyboard')).toBe('idle')
    expect(nextState('completed', 'pointerenter')).toBe('completed')
  })
})

describe('dialogue serialization', () => {
  it('sequences round-trip with identical states', () => {
    for (const s of listDialogueSequences()) {
      const back = clone(s)
      expect(validateDialogueSequence(back).ok, s.id).toBe(true)
      expect(JSON.stringify(dialogueStateAt(back, 1.25))).toBe(JSON.stringify(dialogueStateAt(s, 1.25)))
    }
  })

  it('contains no functions and no unknown speakers/styles leak through guards', () => {
    expect(JSON.stringify(listDialogueSequences())).not.toMatch(/function/)
    expect(isSpeakerId('bakasur')).toBe(true)
    expect(isSpeakerId('saul')).toBe(false)
    expect(isStyleId('thought')).toBe(true)
    expect(isStyleId('bubble')).toBe(false)
  })

  it('reduced motion reveals instantly but keeps the schedule', () => {
    const s = clone(getDialogueSequence('bakasur-greeting'))
    const full = dialogueStateAt(s, 0.01, { reducedMotion: true })
    expect(full.revealed).toBe(full.line?.text)
    const { schedule } = scheduleSequence(s, { reducedMotion: true })
    expect(schedule.length).toBe(3)
  })
})
