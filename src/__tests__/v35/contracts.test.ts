/*
 * BAKATRACKER V3.5 — contract tests for the new foundations:
 * habit preset registry, demo-world determinism/isolation, canonical
 * walkthrough, BakaSur preference clamps, message registry.
 */
import { describe, it, expect } from 'vitest'
import {
  HABIT_PRESETS, PRESET_BY_ID, presetValueCounts, formatPresetValue,
  decodeReading, decodeWorkout, encodeReading, encodeWorkout,
  WATER_RANGE, SLEEP_RANGE, WORKOUT_MAX_MINUTES, WORKOUT_BODY_PARTS, MOOD_FACES,
} from '../../lib/habitPresets'
import {
  buildDemoWorld, isDemoRowString, DEMO_ID_PREFIX, stripDemoEvents,
} from '../../services/demoWorld'
import {
  walkthroughScopeForUser, WALKTHROUGH_STEPS, WALKTHROUGH_SCOPE_DEMO,
} from '../../lib/walkthrough'
import {
  DEFAULT_PREFERENCES, heroSizeFor, railSizeFor,
  BAKASUR_COLOR_HEXES, BAKASUR_BODY_BASE,
} from '../../lib/baksurPreferences'
import { REACTION_VISUAL } from '../../components/shell/baksurReactions'
import {
  DEMO_MESSAGES, OFFLINE_MESSAGES, baksurLine, hasScriptedLine,
} from '../../lib/baksurMessages'

/* ───── habit presets: immutability + semantics ───── */
describe('habit preset registry', () => {
  it('exactly the five canonical presets, frozen', () => {
    expect(HABIT_PRESETS.map(p => p.id)).toEqual(['mood', 'water', 'sleep', 'reading', 'workout'])
    expect(Object.isFrozen(HABIT_PRESETS)).toBe(true)
    for (const p of HABIT_PRESETS) expect(Object.isFrozen(p)).toBe(true)
  })

  it('every preset id resolves through the lookup map', () => {
    for (const p of HABIT_PRESETS) expect(PRESET_BY_ID.get(p.id)).toBe(p)
  })

  it('mood: five faces only', () => {
    expect(MOOD_FACES).toHaveLength(5)
    expect(presetValueCounts('mood', '😄')).toBe(true)
    expect(presetValueCounts('mood', '')).toBe(false)
  })

  it('water: liters within range; zero clears', () => {
    expect(WATER_RANGE.unit).toBe('L')
    expect(WATER_RANGE.max).toBeGreaterThanOrEqual(5)
    expect(presetValueCounts('numeric', 1.5)).toBe(true)
    expect(presetValueCounts('numeric', 0)).toBe(false)
  })

  it('sleep: half-hour granularity up to 12h', () => {
    expect(SLEEP_RANGE.max).toBe(12)
    expect(SLEEP_RANGE.step).toBeLessThanOrEqual(0.5)
  })

  it('reading: mode-aware encoding round-trips', () => {
    expect(decodeReading(encodeReading({ mode: 'pages', amount: 42 }))).toEqual({ mode: 'pages', amount: 42 })
    expect(decodeReading(encodeReading({ mode: 'minutes', amount: 25 }))).toEqual({ mode: 'minutes', amount: 25 })
    expect(decodeReading('garbage')).toBeNull()
    expect(decodeReading(7)).toBeNull()
    expect(presetValueCounts('reading', 'p:12')).toBe(true)
    expect(presetValueCounts('reading', 'p:0')).toBe(false)
  })

  it('workout: body part + duration, clamped at 180m', () => {
    expect(WORKOUT_MAX_MINUTES).toBe(180)
    expect(decodeWorkout(encodeWorkout('back', 45))).toEqual({ part: 'back', minutes: 45 })
    expect(decodeWorkout(encodeWorkout('legs', 999))).toEqual({ part: 'legs', minutes: 180 })
    expect(decodeWorkout('w:nonexistent:10')).toBeNull()
    expect(WORKOUT_BODY_PARTS.map(p => p.id))
      .toEqual(['back', 'chest', 'shoulders', 'legs', 'arms', 'home'])
  })

  it('formatPresetValue renders human summaries', () => {
    expect(formatPresetValue('workout', 'w:legs:60')).toContain('60')
    expect(formatPresetValue('reading', 'p:12')).toContain('12')
    expect(formatPresetValue('reading', 'm:45')).toContain('45')
  })
})

/* ───── demo world: deterministic + isolated ───── */
describe('demo world', () => {
  const NOW = Date.UTC(2026, 7, 29, 12)

  it('is deterministic for a fixed clock', () => {
    expect(JSON.stringify(buildDemoWorld(NOW))).toEqual(JSON.stringify(buildDemoWorld(NOW)))
  })

  it('every row is demo-prefixed and detectable', () => {
    const w = buildDemoWorld(NOW)
    const all = [...w.habits, ...w.habitLogs, ...w.tasks, ...w.journal, ...w.events]
    expect(all.length).toBeGreaterThan(60)
    for (const row of all) expect(isDemoRowString(row.id)).toBe(true)
    expect(isDemoRowString('personal-task-1')).toBe(false)
    expect(DEMO_ID_PREFIX).toBe('demo-v35-')
  })

  it('carries the variety the brief demands', () => {
    const w = buildDemoWorld(NOW)
    expect(w.habits.filter(h => h.preset)).toHaveLength(5)
    expect(w.tasks.some(t => t.status === 'done')).toBe(true)
    expect(w.tasks.some(t => t.status !== 'done')).toBe(true)
    expect(w.tasks.some(t => t.today)).toBe(true)
    expect(w.journal.length).toBeGreaterThanOrEqual(5)
    expect(w.events.length).toBeGreaterThan(10)
    // every preset type represented among demo habits
    expect(new Set(w.habits.filter(h => h.preset).map(h => h.type)))
      .toEqual(new Set(['mood', 'numeric', 'reading', 'workout']))
  })

  it('logs reference real demo habits and streaks exist', () => {
    const w = buildDemoWorld(NOW)
    const byId = new Map(w.habits.map(h => [h.id, h]))
    for (const log of w.habitLogs) expect(byId.has(log.habit_id)).toBe(true)
    const days = new Map<string, Set<string>>()
    for (const l of w.habitLogs) {
      if (!days.has(l.habit_id)) days.set(l.habit_id, new Set())
      days.get(l.habit_id)!.add(l.date)
    }
    expect(Math.max(...[...days.values()].map(s => s.size))).toBeGreaterThanOrEqual(7)
  })

  it('stripDemoEvents keeps personal rows, removes demo rows', () => {
    const w = buildDemoWorld(NOW)
    const personal = [{ ...w.events[0], id: 'evt_real', entity_id: 'task_real' }]
    expect(stripDemoEvents([...w.events, ...personal])).toEqual(personal)
  })
})

/* ───── walkthrough: one canonical state machine ───── */
describe('walkthrough', () => {
  it('12 ordered steps, unique ids', () => {
    expect(WALKTHROUGH_STEPS).toHaveLength(12)
    expect(WALKTHROUGH_STEPS[0].id).toBe('welcome')
    expect(new Set(WALKTHROUGH_STEPS.map(s => s.id)).size).toBe(12)
  })

  it('every step carries copy', () => {
    for (const s of WALKTHROUGH_STEPS) {
      expect(s.title.length).toBeGreaterThan(0)
      expect(s.body.length).toBeGreaterThan(0)
    }
  })

  it('no user → demo scope; a user → personal scope', () => {
    expect(walkthroughScopeForUser(null)).toBe(WALKTHROUGH_SCOPE_DEMO)
    expect(walkthroughScopeForUser({ id: 'u1' } as never)).not.toBe(WALKTHROUGH_SCOPE_DEMO)
  })
})

/* ───── V3.5 identity: dark body + mood-light, mischievous face ───── */
describe('baksur identity contract', () => {
  it('body stays one dark charcoal across every color preset', () => {
    for (const [id, c] of Object.entries(BAKASUR_COLOR_HEXES)) {
      expect(c.body, id).toBe(BAKASUR_BODY_BASE)
    }
  })

  it('each preset contributes a DISTINCT mood tint (the visible change)', () => {
    const moods = Object.values(BAKASUR_COLOR_HEXES).map(c => c.mood)
    expect(new Set(moods).size).toBe(moods.length)
    for (const m of moods) expect(m).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('mood tints stay in the dark-glass-safe luminance band (no pastels)', () => {
    for (const [id, { mood }] of Object.entries(BAKASUR_COLOR_HEXES)) {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(mood.slice(i, i + 2), 16))
      const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255
      expect(lum, id).toBeGreaterThanOrEqual(0.25)  // visible silhouette
      expect(lum, id).toBeLessThanOrEqual(0.85)     // never a bright blob
    }
  })

  it('reaction vocabulary unchanged: approved states + expressions only', () => {
    for (const [signal, v] of Object.entries(REACTION_VISUAL)) {
      expect(['IDLE', 'THINKING', 'HAPPY', 'ALERT', 'SLEEP', 'CELEBRATE'], signal).toContain(v.state)
      expect(['neutre', 'heureux', 'attentif'], signal).toContain(v.expression)
    }
  })
})

/* ───── baksur preferences: clamps + defaults ───── */
describe('baksur preferences', () => {
  it('defaults are the safe graphite/normal/full/standard', () => {
    expect(DEFAULT_PREFERENCES).toEqual({ color: 'graphite', presence: 'normal', motion: 'full', scale: 'standard', proactiveFrequency: '30s' })
  })

  it('hero size is clamped per viewport tier, never below touch minimum', () => {
    expect(heroSizeFor('large', 1440)).toBeLessThanOrEqual(184)
    expect(heroSizeFor('large', 390)).toBeLessThanOrEqual(120)
    expect(heroSizeFor('small', 390)).toBeGreaterThanOrEqual(44)
  })

  it("hidden presence removes the rail character; normal is ~3x the old 24px header", () => {
    expect(railSizeFor('standard', 'hidden')).toBe(0)
    expect(railSizeFor('standard', 'normal')).toBeGreaterThanOrEqual(64)
  })
})

/* ───── message registry: deterministic, never LLM ───── */
describe('baksur message registry', () => {
  it('same (env, intent, counter) always yields the same line', () => {
    for (const intent of ['entering_demo', 'quest_done', 'habit_done', 'journal_done'] as const) {
      expect(baksurLine('demo', intent, 0)).toBe(baksurLine('demo', intent, 0))
      expect(baksurLine('demo', intent, 0).length).toBeGreaterThan(1)
    }
  })

  it('the visitor greeting names the maker', () => {
    expect(DEMO_MESSAGES.greeting.join(' ').toLowerCase()).toContain('build.srivatsa')
    expect(OFFLINE_MESSAGES.greeting.length).toBeGreaterThan(0)
  })

  it('demo and offline answer differently', () => {
    expect(baksurLine('demo', 'entering_demo', 0)).not.toBe(baksurLine('offline', 'entering_demo', 0))
  })

  it('unknown intents fall back without throwing', () => {
    // by design: a table with a fallback answers everything deterministically
    expect(hasScriptedLine('demo', 'no_such_intent' as never)).toBe(true)
    expect(baksurLine('demo', 'no_such_intent' as never, 0).length).toBeGreaterThan(0)
  })
})
