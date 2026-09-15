/*
 * BAKASUR-UI — Original Bakasur work (Phase 7).
 *
 * Lab state core: the working preset, immutable history, user-preset
 * persistence, JSON import/export and catalogue filtering. Pure functions
 * only — no Vue, no DOM, no clock — so the whole authoring model is
 * unit-testable in node. The component (`BakasurLab.vue`) only wires these
 * to controls and the real runtime preview.
 */

import { BotEngine } from '../engine/engine'
import { STATE_BY_ID } from '../engine/states'
import { POSES } from '../engine/states'
import {
  getBakasurPersonality,
  getBakasurPreset,
  listBakasurPersonalities,
  listBakasurPresets,
  personalityInput
} from '../bakasur/presets/catalogue'
import { DEFAULT_BAKASUR_THEME_ID } from '../bakasur/presets/colours'
import type {
  BakasurPresetInput,
  BakasurTimeline,
  BakasurValidationResult,
  ResolvedBakasurPreset
} from '../bakasur/presets/types'
import { applyResolvedPreset, resolveBakasurPreset, validateBakasurPreset } from '../bakasur/presets/validate'
import { renderBakasurSvg } from '../bakasur/render'
import { resolveBakasurTheme } from '../bakasur/presets/colours'
import { ecris, lis } from '../ui/stockage'

/** Face selector: intent default, explicit face, or resting pose. */
export type LabFaceMode = 'auto' | 'set' | 'none'

/** Gaze-bias selector: inherit, release, or custom values. */
export type LabLookMode = 'intent' | 'release' | 'custom'

export interface LabTreatmentSel {
  dim: number
  glow: number
  lookMode: LabLookMode
  yaw: number
  pitch: number
  mix: number
}

/**
 * The working preset: everything the Lab edits, JSON-serializable.
 * `sourceId` names the built-in it branched from (null once modified or
 * custom); built-ins themselves are never mutated.
 */
export interface LabWorking {
  sourceId: string | null
  name: string
  description: string
  tags: string[]
  animation: string
  faceMode: LabFaceMode
  expression: string
  shape: string
  theme: string
  treatment: LabTreatmentSel
  /** Raw user timing; null = the default single beat. */
  timeline: BakasurTimeline | null
}

/** A saved user preset: metadata + validated input, JSON-serializable. */
export interface LabUserPreset {
  id: string
  name: string
  description: string
  tags: string[]
  input: BakasurPresetInput
}

export type LabGroup = 'core' | 'reaction' | 'system' | 'cinematic' | 'personality' | 'user'

/* ---------------------------------------------------------- construction */

export function blankWorking(): LabWorking {
  const def = getBakasurPreset('bakasur-idle')!
  return workingFromInput(
    {
      animation: def.animation,
      expression: def.expression,
      shape: def.shape,
      theme: def.theme,
      treatment: def.treatment,
      timeline: def.timeline
        ? { ...def.timeline, steps: def.timeline.steps?.map((s) => ({ ...s })) }
        : undefined
    },
    { sourceId: def.id, name: def.name, description: def.description, tags: [...(def.tags ?? [])] }
  )
}

export function workingFromPreset(id: string): LabWorking | undefined {
  const def = getBakasurPreset(id)
  if (!def) return undefined
  return workingFromInput(
    {
      animation: def.animation,
      expression: def.expression,
      shape: def.shape,
      theme: def.theme,
      treatment: def.treatment,
      timeline: def.timeline
        ? { ...def.timeline, steps: def.timeline.steps?.map((s) => ({ ...s })) }
        : undefined
    },
    { sourceId: def.id, name: def.name, description: def.description, tags: [...(def.tags ?? [])] }
  )
}

export function workingFromPersonality(id: string): LabWorking | undefined {
  const p = getBakasurPersonality(id)
  if (!p) return undefined
  const input = personalityInput(p)
  return workingFromInput(input, {
    sourceId: `personality:${p.id}`,
    name: p.name,
    description: p.description,
    tags: [...(p.tags ?? [])]
  })
}

export function workingFromInput(
  input: BakasurPresetInput,
  meta?: { sourceId?: string | null; name?: string; description?: string; tags?: string[] }
): LabWorking {
  const resolved = resolveBakasurPreset(input)
  return {
    sourceId: meta?.sourceId ?? null,
    name: meta?.name ?? 'Custom',
    description: meta?.description ?? '',
    tags: meta?.tags ?? [],
    animation: input.animation,
    faceMode: input.expression === null ? 'none' : input.expression !== undefined ? 'set' : 'auto',
    expression: typeof input.expression === 'string' ? input.expression : resolved.expression ?? 'neutral',
    shape: input.shape ?? resolved.shape,
    theme: input.theme ?? resolved.theme,
    treatment: {
      dim: input.treatment?.dim ?? resolved.treatment.dim,
      glow: input.treatment?.glow ?? resolved.treatment.glow,
      lookMode: input.treatment?.look === undefined ? 'intent' : input.treatment.look === null ? 'release' : 'custom',
      yaw: input.treatment?.look?.yaw ?? resolved.look?.yaw ?? 0,
      pitch: input.treatment?.look?.pitch ?? resolved.look?.pitch ?? 0,
      mix: input.treatment?.look?.mix ?? resolved.look?.mix ?? 1
    },
    timeline: input.timeline
      ? { ...input.timeline, steps: input.timeline.steps?.map((s) => ({ ...s })) }
      : null
  }
}

export function workingFromUserPreset(p: LabUserPreset): LabWorking {
  return workingFromInput(p.input, {
    sourceId: null,
    name: p.name,
    description: p.description,
    tags: [...p.tags]
  })
}

/* ------------------------------------------------------------- pipeline */

export function workingToInput(w: LabWorking): BakasurPresetInput {
  return {
    animation: w.animation,
    expression: w.faceMode === 'auto' ? undefined : w.faceMode === 'none' ? null : w.expression,
    shape: w.shape,
    theme: w.theme,
    treatment: {
      dim: w.treatment.dim,
      glow: w.treatment.glow,
      look:
        w.treatment.lookMode === 'intent'
          ? undefined
          : w.treatment.lookMode === 'release'
            ? null
            : { yaw: w.treatment.yaw, pitch: w.treatment.pitch, mix: w.treatment.mix }
    },
    timeline: w.timeline
      ? { ...w.timeline, steps: w.timeline.steps?.map((s) => ({ ...s })) }
      : undefined
  }
}

export function validateWorking(w: LabWorking): BakasurValidationResult {
  return validateBakasurPreset(workingToInput(w))
}

export function resolveWorking(w: LabWorking): ResolvedBakasurPreset {
  return resolveBakasurPreset(workingToInput(w))
}

/* ------------------------------------------------------------- inspector */

export type InspectorStatus = 'same' | 'applied' | 'ignored' | 'fallback'

export interface InspectorRow {
  axis: 'animation' | 'expression' | 'shape' | 'theme' | 'treatment' | 'timeline'
  selected: string
  resolved: string
  status: InspectorStatus
  reason?: string
}

/**
 * Selected vs resolved, per axis. The expression row is the one that can
 * LIE by omission: on a fixed-face vehicle the engine ignores the face, so
 * the row says so explicitly instead of pretending the override is active.
 */
export function inspectWorking(w: LabWorking): { rows: InspectorRow[]; resolved: ResolvedBakasurPreset } {
  const resolved = resolveWorking(w)
  const honours = STATE_BY_ID.get(resolved.vehicle)?.baseFace ?? false
  const rows: InspectorRow[] = [
    {
      axis: 'animation',
      selected: w.animation,
      resolved: resolved.animation,
      status: w.animation === resolved.animation ? 'same' : 'fallback',
      reason:
        w.animation === resolved.animation
          ? undefined
          : `Unknown intent, degraded to "${resolved.animation}".`
    },
    {
      axis: 'expression',
      selected: w.faceMode === 'auto' ? 'auto (intent face)' : w.faceMode === 'none' ? 'none (resting)' : w.expression,
      resolved: resolved.expression ?? 'none (resting)',
      status:
        !honours && w.faceMode === 'set'
          ? 'ignored'
          : w.faceMode === 'auto'
            ? 'same'
            : 'applied',
      reason:
        !honours && w.faceMode === 'set'
          ? `Vehicle "${resolved.vehicle}" carries a fixed face; the override has no visible effect.`
          : undefined
    },
    {
      axis: 'shape',
      selected: w.shape,
      resolved: resolved.shape,
      status: w.shape === resolved.shape ? 'same' : 'fallback',
      reason: w.shape === resolved.shape ? undefined : 'Unknown shape, degraded to the intent shape.'
    },
    {
      axis: 'theme',
      selected: w.theme,
      resolved: resolved.theme,
      status: w.theme === resolved.theme ? 'same' : 'fallback',
      reason:
        w.theme === resolved.theme
          ? undefined
          : `Unknown theme, degraded to "${DEFAULT_BAKASUR_THEME_ID}".`
    },
    {
      axis: 'treatment',
      selected: `dim ${w.treatment.dim}, glow ${w.treatment.glow}, gaze ${w.treatment.lookMode}`,
      resolved: `dim ${resolved.treatment.dim}, glow ${resolved.treatment.glow}, gaze ${resolved.look ? `bias ${resolved.look.yaw}/${resolved.look.pitch}` : 'released'}`,
      status: 'applied'
    },
    {
      axis: 'timeline',
      selected:
        w.timeline?.steps?.map((s) => `${s.intent} ${s.duration}s`).join(' → ') ?? 'default single beat',
      resolved: `${resolved.timeline.steps.length} step(s), ${resolved.timeline.totalDuration.toFixed(2)} s total, ×${resolved.timeline.repeat} ${resolved.timeline.direction}`,
      status: 'applied'
    }
  ]
  return { rows, resolved }
}

/* --------------------------------------------------------------- history */

/** Immutable undo/redo over serializable working states. Cap 50. */
export interface LabHistory {
  past: LabWorking[]
  present: LabWorking
  future: LabWorking[]
}

const HISTORY_CAP = 50

export function createHistory(initial: LabWorking): LabHistory {
  return { past: [], present: initial, future: [] }
}

/** Commit only when something actually changed (deep compare via JSON). */
export function commitHistory(h: LabHistory, next: LabWorking): LabHistory {
  if (JSON.stringify(next) === JSON.stringify(h.present)) return h
  const past = [...h.past, h.present].slice(-HISTORY_CAP)
  return { past, present: next, future: [] }
}

export function undoHistory(h: LabHistory): LabHistory {
  const prev = h.past[h.past.length - 1]
  if (!prev) return h
  return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] }
}

export function redoHistory(h: LabHistory): LabHistory {
  const next = h.future[0]
  if (!next) return h
  return { past: [...h.past, h.present].slice(-HISTORY_CAP), present: next, future: h.future.slice(1) }
}

/* ----------------------------------------------------------- persistence */

export function loadUserPresets(): LabUserPreset[] {
  const raw = lis('lab-presets')
  if (!raw) return []
  const parsed = parseUserPresetList(raw)
  return parsed.ok ? parsed.presets : []
}

export function saveUserPresets(list: LabUserPreset[]): void {
  ecris('lab-presets', JSON.stringify(list))
}

/** Unique, human-readable, serializable id (counter suffix, no clock). */
export function userPresetId(name: string, existing: LabUserPreset[]): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'custom'
  let n = existing.length + 1
  let id = `user-${slug}-${n}`
  while (existing.some((p) => p.id === id)) {
    n++
    id = `user-${slug}-${n}`
  }
  return id
}

/* -------------------------------------------------------- import / export */

export interface ParsedUserPreset {
  ok: boolean
  preset?: LabUserPreset
  issues: string[]
}

export interface ParsedUserPresetList {
  ok: boolean
  presets: LabUserPreset[]
  issues: string[]
}

function checkInputShape(input: unknown): input is BakasurPresetInput {
  return typeof input === 'object' && input !== null && typeof (input as { animation: unknown }).animation === 'string'
}

/**
 * Parse + validate imported JSON. Accepts a single preset object or an
 * array. Data only: unknown fields are ignored, functions cannot survive
 * JSON, malformed input is rejected with structured reasons.
 */
export function parseUserPresetJson(text: string): ParsedUserPreset {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, issues: ['Not valid JSON.'] }
  }
  if (Array.isArray(data)) {
    const list = parseUserPresetList(text)
    if (!list.ok || list.presets.length !== 1) {
      return { ok: false, issues: list.issues.length ? list.issues : ['Expected a single preset object.'] }
    }
    return { ok: true, preset: list.presets[0], issues: [] }
  }
  return checkPresetObject(data)
}

export function parseUserPresetList(text: string): ParsedUserPresetList {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, presets: [], issues: ['Not valid JSON.'] }
  }
  const arr = Array.isArray(data) ? data : [data]
  const presets: LabUserPreset[] = []
  const issues: string[] = []
  arr.forEach((entry, i) => {
    const r = checkPresetObject(entry)
    if (r.ok && r.preset) presets.push(r.preset)
    else issues.push(`Entry ${i}: ${r.issues.join(' ')}`)
  })
  return { ok: issues.length === 0, presets, issues }
}

function checkPresetObject(data: unknown): ParsedUserPreset {
  if (typeof data !== 'object' || data === null) return { ok: false, issues: ['Expected a preset object.'] }
  const o = data as Record<string, unknown>
  // Two shapes: a saved LabUserPreset ({ name, input }) or a raw preset input.
  const inputRaw = checkInputShape(o) ? o : o['input']
  if (!checkInputShape(inputRaw)) {
    return { ok: false, issues: ['Missing "animation" (string). A preset needs at least an animation intent.'] }
  }
  const v = validateBakasurPreset(inputRaw as BakasurPresetInput)
  if (!v.ok) {
    return { ok: false, issues: v.issues.map((i) => `${i.field}: ${i.message}`) }
  }
  const name = typeof o['name'] === 'string' && o['name'] ? o['name'] : 'Imported'
  const description = typeof o['description'] === 'string' ? o['description'] : ''
  const tags = Array.isArray(o['tags']) ? o['tags'].filter((t): t is string => typeof t === 'string') : []
  return {
    ok: true,
    issues: [],
    preset: {
      id: typeof o['id'] === 'string' && o['id'] ? o['id'] : `user-import-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
      name,
      description,
      tags,
      input: JSON.parse(JSON.stringify(inputRaw)) as BakasurPresetInput
    }
  }
}

export function serializeUserPreset(p: LabUserPreset): string {
  return JSON.stringify(p, null, 2)
}

/* ------------------------------------------------------------- filtering */

export interface LabFilter {
  query: string
  group: LabGroup | 'all'
  theme: string
  animation: string
}

export const EMPTY_FILTER: LabFilter = { query: '', group: 'all', theme: '', animation: '' }

export interface LabEntry {
  kind: 'preset' | 'personality'
  id: string
  name: string
  description: string
  group: Exclude<LabGroup, 'user'>
  mood: string
  tags: string[]
  theme: string
  animation: string
}

function entryOfPreset(id: string): LabEntry | undefined {
  const def = getBakasurPreset(id)
  if (!def) return undefined
  const tags = [...(def.tags ?? [])]
  const group: LabEntry['group'] =
    tags.includes('reaction') ? 'reaction'
    : tags.includes('system') ? 'system'
    : tags.includes('cinematic') ? 'cinematic'
    : 'core'
  return {
    kind: 'preset',
    id: def.id,
    name: def.name,
    description: def.description,
    group,
    mood: def.mood ?? '',
    tags,
    theme: def.theme ?? DEFAULT_BAKASUR_THEME_ID,
    animation: def.animation
  }
}

export function labEntries(): LabEntry[] {
  const presets = listBakasurPresets()
    .map((d) => entryOfPreset(d.id))
    .filter((e): e is LabEntry => e !== undefined)
  const personalities = listBakasurPersonalities().map((p) => ({
    kind: 'personality' as const,
    id: `personality:${p.id}`,
    name: p.name,
    description: p.description,
    group: 'personality' as const,
    mood: '',
    tags: [...(p.tags ?? [])],
    theme: p.theme,
    animation: p.animation
  }))
  return [...presets, ...personalities]
}

export function filterEntries(entries: LabEntry[], f: LabFilter): LabEntry[] {
  const q = f.query.trim().toLowerCase()
  return entries.filter((e) => {
    if (f.group !== 'all' && e.group !== f.group) return false
    if (f.theme && e.theme !== f.theme) return false
    if (f.animation && e.animation !== f.animation) return false
    if (!q) return true
    return [e.name, e.description, e.mood, e.id, ...e.tags].join(' ').toLowerCase().includes(q)
  })
}

/* ------------------------------------------------------------- thumbnails */

/**
 * Deterministic frozen thumbnail through the REAL renderer: resolve the
 * input, sample the settled vehicle, render standalone SVG. No fake art.
 */
export function thumbSvg(input: BakasurPresetInput, size: number, uid: string, at?: number): string {
  const resolved = resolveBakasurPreset(input)
  const e = new BotEngine(100, 'idle', null, null)
  applyResolvedPreset(e, resolved, 0)
  const t = at ?? (resolved.vehicle === 'swirl' ? 0.5 : Math.max(POSES[resolved.vehicle] ?? 1.2, 1.2))
  return renderBakasurSvg(e.sample(t), {
    size,
    uid,
    treatment: resolved.treatment,
    colours: resolveBakasurTheme(resolved.theme)
  })
}
