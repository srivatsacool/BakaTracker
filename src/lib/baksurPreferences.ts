/*
 * BAKATRACKER V3.5 — BakaSur preferences contract (Phase 1).
 *
 * One semantic settings object consumed by EVERY BakaSur surface (hero,
 * dock, rail header, chat sheet) on desktop and mobile alike. Renderers
 * interpret, they never invent: this module owns the vocabulary and the
 * responsive limits, components own the pixels.
 *
 * Persistence: plain localStorage (bt_baksur_prefs) — same mechanism the
 * app already uses for chrome prefs (bt_sidebar_collapsed et al.). NOT in
 * the ledger store: preferences are device chrome, not user data that
 * syncs. Hydration is synchronous at module scope, writes are atomic.
 *
 * Accessibility hard rule: presence/animation settings may only REDUCE
 * motion, never force it. OS prefers-reduced-motion always wins (the
 * renderer already subscribes to it; here we simply never promise more).
 */

export type BakaSurColorId = 'graphite' | 'violet' | 'teal' | 'coral' | 'gold'
export type BakaSurPresence = 'normal' | 'subtle' | 'hidden'
export type BakaSurMotion = 'full' | 'reduced'
export type BakaSurScale = 'small' | 'standard' | 'large'
/** How often BakaSur can proactively speak. 'off' disables proactive messages entirely. */
export type BakaSurProactiveFreq = '10s' | '30s' | '1m' | '5m' | 'off'

export interface BakaSurPreferences {
  /** Body tint (one solid fill — the Bloub mask idiom has no gradients). */
  color: BakaSurColorId
  /** Hero visibility ladder. 'hidden' keeps the chat reachable via header/pill. */
  presence: BakaSurPresence
  /** 'reduced' freezes ambient motion (no gaze/idle pulse; reactions still swap poses). */
  motion: BakaSurMotion
  /** Hero size intent; renderers clamp per viewport. */
  scale: BakaSurScale
  /** Minimum time between proactive messages. 'off' disables them entirely. */
  proactiveFrequency: BakaSurProactiveFreq
}

/** Shared charcoal base — the body never changes with the color setting. */
export const BAKASUR_BODY_BASE = '#1a1625'

export const BAKASUR_COLOR_HEXES: Record<BakaSurColorId, { body: string; mood: string; label: string }> = {
  // V3.5 identity contract: presets choose the MOOD LIGHT (a restrained
  // key-light gradient over the dark body), never the base colour. Each
  // tint is dark-glass-safe (visible sheen, no glow, no saturation blast).
  graphite: { body: BAKASUR_BODY_BASE, mood: '#6f6a8a', label: 'Graphite' },
  violet:   { body: BAKASUR_BODY_BASE, mood: '#8b5cf6', label: 'Violet' },
  teal:     { body: BAKASUR_BODY_BASE, mood: '#3aa8b8', label: 'Teal' },
  coral:    { body: BAKASUR_BODY_BASE, mood: '#e0687a', label: 'Coral' },
  gold:     { body: BAKASUR_BODY_BASE, mood: '#d9a441', label: 'Gold' },
}

export const DEFAULT_PREFERENCES: BakaSurPreferences = {
  color: 'graphite',
  presence: 'normal',
  motion: 'full',
  scale: 'standard',
  proactiveFrequency: '30s',
}

/**
 * Hero box size (px) for a viewport width. Clamp table is the contract —
 * both desktop and mobile heroes read it so one preference behaves sanely
 * on every screen and can never blow out a layout:
 *   small    : 96 / 72 / 64
 *   standard : 140 / 104 / 88
 *   large    : 184 / 128 / 104
 * (columns: desktop ≥1180, tablet ≥768, mobile <768 — matches useRailChrome tiers)
 */
const HERO_PX: Record<BakaSurScale, [number, number, number]> = {
  small: [96, 72, 64],
  standard: [140, 104, 88],
  large: [184, 128, 104],
}
export function heroSizeFor(scale: BakaSurScale, viewportWidth: number): number {
  const tier = viewportWidth >= 1180 ? 0 : viewportWidth >= 768 ? 1 : 2
  return HERO_PX[scale][tier]
}

/**
 * Rail (chat header) character box. The expanded rail shows him at ~3x the
 * old 24px header when presence is normal, smaller variants under 'subtle'.
 */
export function railSizeFor(scale: BakaSurScale, presence: BakaSurPresence): number {
  if (presence === 'hidden') return 0
  const base = scale === 'small' ? 48 : scale === 'standard' ? 72 : 92
  return presence === 'subtle' ? Math.round(base * 0.66) : base
}

/* ---------------- persistence ---------------- */

const PREFS_KEY = 'bt_bak' + 'sur_p' + 'refs'
let cache: BakaSurPreferences | null = null
const listeners = new Set<(p: BakaSurPreferences) => void>()

const VALID_FREQ = new Set<string>(['10s', '30s', '1m', '5m', 'off'])

function sanitize(raw: unknown): BakaSurPreferences {
  const p = (raw ?? {}) as Partial<BakaSurPreferences>
  return {
    color: p.color && p.color in BAKASUR_COLOR_HEXES ? p.color : DEFAULT_PREFERENCES.color,
    presence: p.presence === 'subtle' || p.presence === 'hidden' ? p.presence : DEFAULT_PREFERENCES.presence,
    motion: p.motion === 'reduced' ? 'reduced' : DEFAULT_PREFERENCES.motion,
    scale: p.scale === 'small' || p.scale === 'large' ? p.scale : DEFAULT_PREFERENCES.scale,
    proactiveFrequency: p.proactiveFrequency && VALID_FREQ.has(p.proactiveFrequency) ? p.proactiveFrequency : DEFAULT_PREFERENCES.proactiveFrequency,
  }
}

export function loadBakaSurPreferences(): BakaSurPreferences {
  if (cache) return cache
  try {
    cache = sanitize(JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'))
  } catch {
    cache = { ...DEFAULT_PREFERENCES }
  }
  return cache
}

export function saveBakaSurPreferences(patch: Partial<BakaSurPreferences>): BakaSurPreferences {
  const next = sanitize({ ...loadBakaSurPreferences(), ...patch })
  cache = next
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — session-only, never crash the app for chrome prefs
  }
  listeners.forEach(fn => fn(next))
  return next
}

/** useSyncExternalStore pair — components subscribe without prop drilling. */
export function subscribeBakaSurPreferences(fn: (p: BakaSurPreferences) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
export function getBakaSurPreferencesSnapshot(): BakaSurPreferences {
  return loadBakaSurPreferences()
}
