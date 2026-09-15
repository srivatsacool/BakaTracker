/*
 * BAKASUR-UI — Original Bakasur work (Phase 7).
 *
 * Lab state tests (node, no DOM): working construction, inspector honesty,
 * immutable history, import/export, filtering, thumbnails and the playback
 * driver. The component only wires these; the logic is proven here.
 */
import { describe, expect, it } from 'vitest'
import { BAKASUR_PRESETS } from '../bakasur/presets/catalogue'
import { LabPlayback } from './playback'
import {
  blankWorking,
  commitHistory,
  createHistory,
  filterEntries,
  inspectWorking,
  labEntries,
  parseUserPresetJson,
  parseUserPresetList,
  redoHistory,
  resolveWorking,
  serializeUserPreset,
  thumbSvg,
  undoHistory,
  userPresetId,
  validateWorking,
  workingFromPersonality,
  workingFromPreset,
  workingToInput,
  type LabUserPreset,
  type LabWorking
} from './labState'

const SNAPSHOT = JSON.stringify(BAKASUR_PRESETS)

function customWorking(): LabWorking {
  const w = blankWorking()
  w.animation = 'orbit'
  w.faceMode = 'set'
  w.expression = 'excited'
  w.theme = 'ember-violet'
  return w
}

describe('lab working model', () => {
  it('blank working is valid and resolves to idle', () => {
    const w = blankWorking()
    expect(validateWorking(w).ok).toBe(true)
    expect(resolveWorking(w).animation).toBe('idle')
  })

  it('all 24 presets + 8 personalities load as valid workings', () => {
    for (const id of Object.keys(BAKASUR_PRESETS)) {
      const w = workingFromPreset(id)!
      expect(validateWorking(w).ok, id).toBe(true)
    }
    for (const id of ['calm', 'curious', 'suspicious', 'chaotic', 'smug', 'sleepy', 'excited', 'unimpressed']) {
      expect(workingFromPersonality(id), id).toBeDefined()
    }
    expect(workingFromPreset('nope')).toBeUndefined()
    expect(workingFromPersonality('nope')).toBeUndefined()
  })

  it('working round-trips through input without loss', () => {
    const w = customWorking()
    const back = workingToInput(w)
    expect(back.animation).toBe('orbit')
    expect(back.expression).toBe('excited')
    expect(back.theme).toBe('ember-violet')
    expect(validateWorking(w).ok).toBe(true)
  })

  it('never mutates the static catalogue', () => {
    const w = workingFromPreset('bakasur-thinking')!
    w.animation = 'burst'
    w.name = 'Mangled'
    expect(JSON.stringify(BAKASUR_PRESETS)).toBe(SNAPSHOT)
  })
})

describe('lab inspector', () => {
  it('reports selected vs resolved per axis', () => {
    const { rows, resolved } = inspectWorking(customWorking())
    expect(resolved.animation).toBe('orbit')
    const anim = rows.find((r) => r.axis === 'animation')!
    expect(anim.selected).toBe('orbit')
    expect(anim.resolved).toBe('orbit')
    expect(anim.status).toBe('same')
  })

  it('flags a face override on a fixed-face vehicle as ignored, with reason', () => {
    const w = blankWorking()
    w.animation = 'notify'
    w.faceMode = 'set'
    w.expression = 'happy'
    const { rows } = inspectWorking(w)
    const face = rows.find((r) => r.axis === 'expression')!
    expect(face.status).toBe('ignored')
    expect(face.reason).toContain('fixed face')
    expect(validateWorking(w).ok).toBe(false)
  })

  it('auto face on a fixed-face vehicle is not flagged', () => {
    const w = blankWorking()
    w.animation = 'notify'
    const { rows } = inspectWorking(w)
    expect(rows.find((r) => r.axis === 'expression')!.status).toBe('same')
    expect(validateWorking(w).ok).toBe(true)
  })
})

describe('lab history', () => {
  it('commits, undoes and redoes working states', () => {
    let h = createHistory(blankWorking())
    const changed = { ...h.present, animation: 'orbit' }
    h = commitHistory(h, changed)
    expect(h.present.animation).toBe('orbit')
    h = undoHistory(h)
    expect(h.present.animation).toBe('idle')
    h = redoHistory(h)
    expect(h.present.animation).toBe('orbit')
  })

  it('ignores identical commits and clears the future on branch', () => {
    let h = createHistory(blankWorking())
    h = commitHistory(h, { ...h.present })
    expect(h.past).toHaveLength(0)
    h = commitHistory(h, { ...h.present, animation: 'orbit' })
    h = undoHistory(h)
    h = commitHistory(h, { ...h.present, animation: 'sleep' })
    expect(h.future).toHaveLength(0)
    expect(h.present.animation).toBe('sleep')
  })

  it('undo/redo at the ends are no-ops', () => {
    const h = createHistory(blankWorking())
    expect(undoHistory(h)).toBe(h)
    expect(redoHistory(h)).toBe(h)
  })

  it('caps the past at 50', () => {
    let h = createHistory(blankWorking())
    for (let i = 0; i < 60; i++) h = commitHistory(h, { ...h.present, name: `v${i}` })
    expect(h.past).toHaveLength(50)
  })
})

describe('lab import/export', () => {
  const saved: LabUserPreset = {
    id: 'user-test-1',
    name: 'Test',
    description: 'd',
    tags: ['x'],
    input: { animation: 'idle', expression: 'curious', theme: 'moonlit' }
  }

  it('serializes a user preset as JSON data', () => {
    const text = serializeUserPreset(saved)
    expect(JSON.parse(text)).toEqual({ ...saved })
    expect(text).not.toMatch(/function/)
  })

  it('accepts a valid single preset and a raw input', () => {
    const r = parseUserPresetJson(serializeUserPreset(saved))
    expect(r.ok).toBe(true)
    expect(r.preset?.name).toBe('Test')
    const raw = parseUserPresetJson('{"animation": "orbit", "theme": "ember-violet"}')
    expect(raw.ok).toBe(true)
  })

  it('rejects malformed input with structured reasons', () => {
    expect(parseUserPresetJson('not json').ok).toBe(false)
    expect(parseUserPresetJson('{"name": "x"}').issues.join(' ')).toContain('animation')
    expect(parseUserPresetJson('{"animation": "rainbow"}').ok).toBe(false)
    expect(parseUserPresetJson('{"animation": "notify", "expression": "happy"}').ok).toBe(false)
  })

  it('parses lists, reporting per-entry errors', () => {
    const list = parseUserPresetList(
      JSON.stringify([{ animation: 'idle', name: 'A' }, { animation: 'nope' }, { name: 'C' }])
    )
    expect(list.ok).toBe(false)
    expect(list.presets).toHaveLength(1)
    expect(list.issues).toHaveLength(2)
  })

  it('generates unique human-readable ids', () => {
    const existing: LabUserPreset[] = [{ ...saved, id: 'user-test-1' }]
    const id = userPresetId('Test', existing)
    expect(id).toContain('test')
    expect(id).not.toBe('user-test-1')
  })
})

describe('lab filtering', () => {
  const entries = labEntries()

  it('covers 24 presets + 8 personalities', () => {
    expect(entries.filter((e) => e.kind === 'preset')).toHaveLength(24)
    expect(entries.filter((e) => e.kind === 'personality')).toHaveLength(8)
  })

  it('filters by query, group, theme and animation', () => {
    expect(filterEntries(entries, { query: 'sleepy', group: 'all', theme: '', animation: '' }).map((e) => e.id))
      .toContain('bakasur-sleepy')
    expect(filterEntries(entries, { query: '', group: 'system', theme: '', animation: '' })).toHaveLength(3)
    expect(
      filterEntries(entries, { query: '', group: 'all', theme: 'ember-violet', animation: '' }).length
    ).toBeGreaterThan(0)
    expect(
      filterEntries(entries, { query: '', group: 'all', theme: '', animation: 'orbit' }).map((e) => e.id)
    ).toContain('bakasur-orbit')
    expect(filterEntries(entries, { query: 'zzz-no-match', group: 'all', theme: '', animation: '' })).toHaveLength(0)
  })
})

describe('lab thumbnails', () => {
  it('renders deterministic SVG through the real renderer', () => {
    const a = thumbSvg({ animation: 'orbit', theme: 'moonlit' }, 56, 't1')
    const b = thumbSvg({ animation: 'orbit', theme: 'moonlit' }, 56, 't1')
    expect(a).toBe(b)
    expect(a).toContain('<svg')
    expect(a).not.toMatch(/NaN|Infinity/)
    expect(a).toContain('#cfc2ff')
  })
})

describe('lab playback driver', () => {
  it('accumulates time, pauses, seeks and reports the end', () => {
    const p = new LabPlayback()
    p.play(1000, 0)
    expect(p.tick(1500, 10)).toEqual({ elapsed: 0.5, ended: false })
    p.pause(1500)
    expect(p.tick(9000, 10).elapsed).toBe(0.5)
    expect(p.isPlaying).toBe(false)
    p.seek(9.5, 9000)
    p.play(9000)
    const end = p.tick(9600, 10)
    expect(end.ended).toBe(true)
    expect(end.elapsed).toBe(10)
    p.reset()
    expect(p.time).toBe(0)
  })

  it('never goes negative and clamps tiny durations', () => {
    const p = new LabPlayback()
    p.play(1000, -5)
    expect(p.time).toBe(0)
    p.seek(-3)
    expect(p.tick(1100, 0).elapsed).toBeGreaterThanOrEqual(0)
  })
})
