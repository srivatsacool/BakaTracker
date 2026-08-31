/*
 * BAKATRACKER V3.5 — BakaSur Presence (Phase 2)
 *
 * ONE living character instance for the whole application. He lives in a
 * fixed-position layer and continuously lerps between two anchors:
 *
 *   HERO   — bottom-right of the viewport (desktop) / above the bottom nav
 *            (mobile). Large, clickable, ambient: idle + gaze + reactions.
 *   RAIL   — the slot the open chat rail reserves in its sticky header
 *            (≈3× the old 24px header glyph). Registered via context.
 *
 * Because the engine, rAF loop, reaction watcher and reaction hold all
 * live HERE (not in the rail), opening/closing the chat never remounts him:
 * no teleport, no animation reset, no state desync — he walks into the
 * panel and back out.
 *
 * Layering contract (documented in index.css V3.5 block):
 *   content z-10 · overlays/cards z-20..29 · dialogs z-[900] / sheets z-50
 *   · hero z-40 (below dialogs, above content) · flying-into-rail z-[65]
 *   (mobile sheet is z-60 — he lands visually inside its header slot).
 *
 * Presence settings: 'hidden' removes the hero entirely; the rail (and its
 * header character) is still reachable through ContextBar's toggle — BakaSur
 * is never the only way into any functionality.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { BakaSurPresenceCtx, type BakaSurPresenceApi } from './bakaSurPresenceContext'
import { useBakaSurPrefs } from './bakaSurPresenceContext'
import { BaksurCharacter } from './BaksurCharacter'
import { REACTION_VISUAL, useBaksurDockReaction } from './baksurReactions'
import {
  BAKASUR_COLOR_HEXES, heroSizeFor,
} from '../../lib/baksurPreferences'
import type { BaksurState } from './baksurShared'
import { useBakaSurProactive, type BakaSurEnvironment } from '../../hooks/useBakaSurProactive'

/* ---------------- viewport tracking ---------------- */

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setVp({ w: window.innerWidth, h: window.innerHeight }))
    }
    window.addEventListener('resize', onResize, { passive: true })
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
  }, [])
  return vp
}

/* ---------------- reduced-motion (OS) ---------------- */

const reducedMq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
function subscribeReduced(onChange: () => void) {
  reducedMq?.addEventListener('change', onChange)
  return () => reducedMq?.removeEventListener('change', onChange)
}
function getReduced() { return reducedMq?.matches ?? false }

/* ---------------- the presence ---------------- */

interface Target { x: number; y: number; s: number }

export interface BakaSurPresenceProps {
  collapsed: boolean
  onToggle: () => void
  /** Editor route (canvas owns the viewport): no hero while collapsed —
   *  opening still lands him in the rail slot. */
  editorRoute?: boolean
  /** The chat rail itself — rendered INSIDE the provider so it can register
   *  its header slot and report busy state to the single living character. */
  children?: React.ReactNode
}

export function BakaSurPresence({ collapsed, onToggle, editorRoute = false, children }: BakaSurPresenceProps) {
  const prefs = useBakaSurPrefs()
  const osReduced = useSyncExternalStore(subscribeReduced, getReduced, () => false)
  const vp = useViewport()
  const isMobile = vp.w < 768

  const flyToRail = !collapsed
  // Reaction engine + USER_OPENED edge live here (moved from the old dock).
  const { active: signal, noteOpened } = useBaksurDockReaction()
  const wasCollapsed = useRef(collapsed)
  useEffect(() => {
    if (wasCollapsed.current && !collapsed) noteOpened()
    wasCollapsed.current = collapsed
  }, [collapsed, noteOpened])
  const reaction = signal ? REACTION_VISUAL[signal] : null

  // Rail reports busy (THINKING), and the header slot element to fly into.
  const [busy, setBusy] = useState(false)
  const slotRef = useRef<HTMLElement | null>(null)
  const [, forceSlotWatch] = useState(0)
  const registerSlot = useCallback((el: HTMLElement | null) => {
    slotRef.current = el
    forceSlotWatch(n => n + 1) // re-measure on the next frame
  }, [])
  const reportBusy = useCallback((b: boolean) => setBusy(b), [])

  // Interaction ladder: hover/focus shifts his resting face.
  const [hovered, setHovered] = useState(false)

  const api = useMemo<Omit<BakaSurPresenceApi, 'proactive'>>(
    () => ({ registerSlot, reportBusy, isChatOpen: !collapsed }),
    [registerSlot, reportBusy, collapsed],
  )

  const color = BAKASUR_COLOR_HEXES[prefs.color] ?? BAKASUR_COLOR_HEXES.graphite
  const heroS = heroSizeFor(prefs.scale, vp.w)
  // 'hidden' removes the HERO; the rail header always carries him when open.
  const presenceHidden = prefs.presence === 'hidden' && collapsed
  const heroVisible = !collapsed || (!presenceHidden && !editorRoute)

  /* ---- position machine: one rAF lerp between hero slot and rail slot ---- */
  const boxRef = useRef<HTMLDivElement | null>(null)
  const pos = useRef<Target | null>(null)
  const rafRef = useRef(0)
  const snapNext = useRef(true) // first frame lands at target (no fly-in on load)

  useEffect(() => {
    const instant = osReduced || prefs.motion === 'reduced'

    const measureHero = (): Target => {
      // Mobile: above the bottom nav (84px + safe area), right margin 14.
      // Desktop: bottom-right corner with generous breathing room.
      const bottom = isMobile ? 92 + 14 : 28
      return { x: vp.w - heroS - 14, y: vp.h - heroS - bottom, s: heroS }
    }
    const measureSlot = (): Target | null => {
      const el = slotRef.current
      if (!el) return null
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return null
      return { x: r.left, y: r.top, s: r.width }
    }

    let last = 0
    const tick = (ms: number) => {
      const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0
      last = ms
      const target = (flyToRail ? measureSlot() : null) ?? measureHero()
      const p = pos.current
      if (!p || snapNext.current) {
        snapNext.current = false
        pos.current = { ...target }
      } else {
        // Exponential smoothing — frame-rate independent; sheet slide-in is
        // tracked because we re-measure the slot every frame while open.
        const k = instant ? 1 : 1 - Math.exp(-14 * dt)
        p.x += (target.x - p.x) * k
        p.y += (target.y - p.y) * k
        p.s += (target.s - p.s) * k
      }
      const el = boxRef.current
      if (el) {
        el.style.transform = `translate3d(${Math.round(pos.current!.x)}px, ${Math.round(pos.current!.y)}px, 0)`
        el.style.width = `${Math.round(pos.current!.s)}px`
        el.style.height = `${Math.round(pos.current!.s)}px`
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const onVis = () => {
      cancelAnimationFrame(rafRef.current)
      if (!document.hidden) { last = 0; rafRef.current = requestAnimationFrame(tick) }
    }
    document.addEventListener('visibilitychange', onVis)
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [vp.w, vp.h, isMobile, heroS, flyToRail, collapsed, osReduced, prefs.motion])

  // Re-anchor instantly when layout-changing prefs or viewport tier change
  // (a setting change should not fling him across the screen).
  useEffect(() => { snapNext.current = true }, [prefs.scale, prefs.presence, vp.w, vp.h])

  // Proactive companion (Phase 2A)
  const env = useMemo<BakaSurEnvironment>(() => {
    if (typeof window === 'undefined') return 'live'
    if (localStorage.getItem('bt_demo_mode') === 'true') return 'demo'
    if (!navigator.onLine) return 'offline'
    return 'live'
  }, [])
  const location = useLocation()
  const isFocusRoute = useMemo(() => {
    const p = location.pathname
    return p.startsWith('/notes/') || p === '/journal' || p === '/bakasur'
  }, [location.pathname])
  const { message: proactiveMessage, intent: proactiveIntent } = useBakaSurProactive(env, isFocusRoute)

  // State Priority: AI THINKING/chat-open > EVENT REACTION > PROACTIVE MESSAGE > IDLE
  let state: BaksurState
  const showProactiveBubble = Boolean(proactiveMessage && !reaction && !busy && collapsed)
  if (busy && !collapsed) state = 'THINKING'
  else if (reaction) state = reaction.state
  else state = 'IDLE'

  // V3.5 identity: the resting face is a mischievous side-eye ('mefiant');
  // attention (hover / open rail / USER_OPENED reaction) lifts it to
  // 'attentif'; reactions carry their own expression.
  const restExpression = reaction ? reaction.expression
    : showProactiveBubble ? 'attentif'
    : hovered || (flyToRail && !busy) ? 'attentif'
    : 'mefiant'
  
  const followPointer = prefs.motion === 'full' && !osReduced

  const proactiveApi = useMemo(() => ({
    getProactiveMessage: () => proactiveMessage,
    getProactiveIntent: () => proactiveIntent,
  }), [proactiveMessage, proactiveIntent])

  // Merge proactive API into context value
  const apiWithProactive = useMemo<BakaSurPresenceApi>(() => ({
    ...api,
    proactive: proactiveApi,
  }), [api, proactiveApi])

  if (presenceHidden) {
    return <BakaSurPresenceCtx.Provider value={apiWithProactive}>{children}</BakaSurPresenceCtx.Provider>
  }

  return (
    <BakaSurPresenceCtx.Provider value={apiWithProactive}>
      {children}
      <div
        ref={boxRef}
        className="baksur-presence-layer"
        data-open={flyToRail ? 'true' : 'false'}
        data-baksur-signal={signal ?? undefined}
        style={{
          position: 'fixed', left: 0, top: 0,
          zIndex: flyToRail ? 65 : 40,
          width: Math.max(44, heroS), height: Math.max(44, heroS),
          // 'hidden' presence / editor canvas: out of sight + out of mind,
          // but the slot registration (children) stays mounted for chat.
          display: heroVisible ? undefined : 'none',
        }}
      >
        <button
          type="button"
          className="baksur-hero-button"
          onClick={onToggle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          aria-label={collapsed ? 'Open BakaSur, your companion' : 'Collapse BakaSur'}
          title={collapsed ? 'Open BakaSur' : 'Collapse BakaSur'}
          tabIndex={flyToRail ? -1 : 0}
          style={{
            position: 'relative', width: '100%', height: '100%',
            border: 'none', background: 'none', padding: 0, cursor: 'pointer',
            transition: 'filter 200ms ease, transform 200ms ease',
          }}
        >
          <BaksurCharacter
            direction="flamehorn"
            state={state}
            /* The presence box is lerped imperatively every frame (hero ↔
             * slot). CSS (.baksur-hero-svg) pins the art to 100% of that
             * box, so this attribute is only the initial hint — it must
             * NOT read the lerp ref during render (react-hooks refs rule). */
            size={heroS}
            className="baksur-hero-svg"
            bodyColor={color.body}
            moodColor={color.mood}
            followPointer={followPointer}
            restExpression={restExpression}
            frozenAt={prefs.motion === 'reduced' ? 0.4 : undefined}
            decorative
          />
        </button>
        {/* Proactive Bubble */}
        {showProactiveBubble && (
          <div
            aria-live="polite"
            className="absolute right-full bottom-1/2 translate-y-1/2 mr-2 w-max max-w-[200px]"
            style={{
              transition: (osReduced || prefs.motion === 'reduced') ? 'none' : 'opacity 200ms ease, transform 200ms ease',
            }}
          >
            <div className="bg-zinc-800 text-zinc-100 text-sm p-3 rounded-2xl rounded-br-sm shadow-xl border border-zinc-700/50 leading-snug">
              {proactiveMessage}
            </div>
          </div>
        )}
      </div>
    </BakaSurPresenceCtx.Provider>
  )
}
