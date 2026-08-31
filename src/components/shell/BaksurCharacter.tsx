/*
 * BAKATRACKER — Baksur character runtime (V3.4.2)
 *
 * React port of the Bloub render layer (BloubBot.vue, MIT © 2026 Jérémy
 * Perret) onto the vendored engine in src/lib/bloub/. SVG mask rendering:
 * the body is one filled path, the eyes are holes cut by the mask, exactly
 * as upstream. No animation library; one rAF loop; static frames under
 * prefers-reduced-motion.
 *
 * V3.4.2 additions (design gate: ambient → cursor → hover → click):
 *   - `followPointer`: eyes track the OS cursor via the engine's built-in
 *     `Look` channel (absolute yaw/pitch, smoothed by LOOK_MORPH). Wandering
 *     gaze resumes after the pointer has been idle for a while. Pure input
 *     reaction — Baksur never seeks attention on his own.
 *   - `restExpression`: hover can shift the resting face (e.g. 'attentif').
 *   - `decorative`: renders aria-hidden for use inside labelled controls.
 * Still no store/event wiring — real product reactions belong to V3.4.3.
 */
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { BotEngine, type BotFrame, type Look } from '../../lib/bloub/engine'
import { EXPRESSION_BY_ID, type BotExpression } from '../../lib/bloub/expressions'
import { RAYON, DEMI_VIEWBOX } from '../../lib/bloub/repere'
import { SHAPE_BY_ID } from '../../lib/bloub/skins'
import { POSES, type StateId } from '../../lib/bloub/states'
import type { BaksurDirection, BaksurState } from './baksurShared'

const NEUTRE = EXPRESSION_BY_ID.get('neutre') ?? null
const HEUREUX = EXPRESSION_BY_ID.get('heureux') ?? null

/** Pointer idle time before the cursor-follow gives back to the wander. */
const FOLLOW_IDLE_S = 2.5
/** Hard limit of the gaze sweep, degrees (past this the eyes leave the sphere front). */
const FOLLOW_MAX_DEG = 38

function followDeg(offset: number, dist: number): number {
  // Inverse-ish mapping: eyes turn toward the pointer with distance falloff, so
  // a cursor crossing the screen doesn't whip the gaze 180 degrees.
  const rad = Math.atan2(offset, dist + 140)
  const deg = (rad * 180) / Math.PI
  return Math.max(-FOLLOW_MAX_DEG, Math.min(FOLLOW_MAX_DEG, deg))
}

/** Product state → engine state + resting expression. */
function resolve(state: BaksurState, restExpr?: string | null): { bloub: StateId; expression: BotExpression | null } {
  const rest = (restExpr && (EXPRESSION_BY_ID.get(restExpr) ?? NEUTRE)) || NEUTRE
  switch (state) {
    case 'IDLE':
      return { bloub: 'idle', expression: rest }
    case 'HAPPY':
      // Quiet expression change on the resting body (docs/baksur/ANIMATION.md §2).
      return { bloub: 'idle', expression: HEUREUX }
    case 'THINKING':
      return { bloub: 'thinking', expression: NEUTRE }
    case 'ALERT':
      // Restrained alert: wide eyes on the base body (the `!` bar stays future).
      return { bloub: 'wide', expression: NEUTRE }
    case 'SLEEP':
      return { bloub: 'sleep', expression: NEUTRE }
    case 'CELEBRATE':
      // V3.4.3: the reserved wink pose — a quiet, single-eyed acknowledgment.
      return { bloub: 'wink', expression: NEUTRE }
  }
}

/** Reactive prefers-reduced-motion subscription (module-level media query). */
const reducedMq =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
function subscribeReduced(onChange: () => void) {
  reducedMq?.addEventListener('change', onChange)
  return () => reducedMq?.removeEventListener('change', onChange)
}
function getReduced() {
  return reducedMq?.matches ?? false
}

export interface BaksurCharacterProps {
  direction: BaksurDirection
  state: BaksurState
  /** Rendered box size in px (viewBox is always DEMI_VIEWBOX*2 units). */
  size?: number
  /**
   * Render one deterministic pose at this state-local time (seconds) and run
   * no rAF loop — used for reduced motion and comparable screenshots.
   */
  frozenAt?: number
  /** Base body colour — always a dark charcoal. Mood never changes it;
   *  `moodColor` paints a light gradient OVER it (V3.5 identity pass). */
  bodyColor?: string
  /**
   * Mood light: a restrained highlight gradient laid over the charcoal body
   * (top-left key light). Changing the user's BakaSur color changes THIS,
   * not the base body. Undefined = bare charcoal.
   */
  moodColor?: string
  /** Colour the eye holes reveal (paper). */
  eyeColor?: string
  /**
   * Resting expression id ('neutre', 'attentif', …) applied to IDLE/HAPPY
   * states. Used by the hover rung of the interaction ladder.
   */
  restExpression?: string | null
  /**
   * Eyes follow the OS cursor (Look channel). Input-reactive only: a pointer
   * that stops moving hands the gaze back to the engine's wander after
   * FOLLOW_IDLE_S. Disabled in static mode and by prefers-reduced-motion.
   */
  followPointer?: boolean
  /** Decorative instance inside an already-labelled control → aria-hidden. */
  decorative?: boolean
  ariaLabel?: string
  className?: string
}

export function BaksurCharacter({
  direction,
  state,
  size = 48,
  frozenAt,
  bodyColor = '#1a1625',
  moodColor,
  eyeColor = '#e9e6f2',
  restExpression = null,
  followPointer = false,
  decorative = false,
  ariaLabel = 'Baksur, your companion',
  className,
}: BaksurCharacterProps) {
  const R = RAYON
  const VB = DEMI_VIEWBOX
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const maskId = `baksur-mask-${uid}`
  const moodGradId = `baksur-mood-${uid}`

  // The radii array must be the EXACT reference registered in skins.ts —
  // the vendored eyefit table is keyed by reference (see eyefit.ts).
  const shapeRadii = useMemo(() => SHAPE_BY_ID.get(direction)?.radii ?? null, [direction])

  const reduced = useSyncExternalStore(subscribeReduced, getReduced, () => false)
  const isStatic = frozenAt !== undefined || reduced

  // One engine per mounted instance; `state` changes flow through the
  // setState effect below, never through a re-create here.
  const engine = useMemo(() => {
    const initial = resolve(state, restExpression)
    return new BotEngine(R, initial.bloub, shapeRadii, initial.expression)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- instance-scoped engine; prop changes are applied via setters
  }, [shapeRadii])

  // Static mode: pure per-render computation, deterministic and idempotent —
  // no effect, no setState. Animated mode: frame state driven by rAF only.
  const staticFrame = useMemo<BotFrame | null>(() => {
    if (!isStatic) return null
    const target = resolve(state, restExpression)
    // Date the transition at 0 so the pose is the settled state.
    engine.reset(target.bloub, 0)
    engine.setExpression(target.expression, 0)
    engine.setShape(shapeRadii, 0)
    return engine.sample(POSES[target.bloub])
  }, [engine, isStatic, state, restExpression, shapeRadii])

  const [frame, setFrame] = useState<BotFrame>(() => engine.sample(frozenAt ?? POSES[resolve(state, restExpression).bloub]))
  const clock = useRef(0)

  // Prop-driven state/expression changes for the animated loop.
  useEffect(() => {
    if (isStatic) return
    const target = resolve(state, restExpression)
    engine.setState(target.bloub, clock.current)
    engine.setExpression(target.expression, clock.current)
  }, [engine, state, restExpression, isStatic])

  // Cursor awareness (interaction ladder rung 2). A single document listener;
  // nothing recomputed per frame — `setLook` is date-stamped and the rAF loop
  // below samples the morph as usual.
  const svgRef = useRef<SVGSVGElement | null>(null)
  useEffect(() => {
    if (!followPointer || isStatic) return

    let lastMoveAt = 0
    let follow: Look | null = null

    const compute = (event: PointerEvent) => {
      const el = svgRef.current
      if (!el) return
      const box = el.getBoundingClientRect()
      // Degenerate boxes give 0/0 — the engine rejects non-finite Look, but
      // skipping here also keeps the gaze on its last target.
      if (!box.width || !box.height) return
      lastMoveAt = clock.current
      const cx = box.left + box.width / 2
      const cy = box.top + box.height / 2
      const dx = event.clientX - cx
      const dy = event.clientY - cy
      follow = {
        yaw: followDeg(dx, Math.abs(dy)),
        pitch: -followDeg(dy, Math.abs(dx)), // screen y is down; pitch up is positive
        mix: 1,
        spin: 0,
        wander: 0
      }
      engine.setLook(follow, clock.current)
    }

    // When the pointer parks, hand the head back to its own wander: the gaze
    // stays where it looked and keeps living (upstream Look semantics).
    const release = window.setInterval(() => {
      if (follow && clock.current - lastMoveAt > FOLLOW_IDLE_S) {
        engine.setLook({ ...follow, mix: 0, wander: 1 }, clock.current, 1.2)
        follow = null
      }
    }, 500)

    window.addEventListener('pointermove', compute, { passive: true })
    return () => {
      window.removeEventListener('pointermove', compute)
      window.clearInterval(release)
      engine.setLook(null, clock.current)
    }
  }, [engine, followPointer, isStatic])

  // rAF loop (animated mode only). Pauses while the document is hidden.
  useEffect(() => {
    if (isStatic) return

    let raf = 0
    let last = 0
    let running = true

    const tick = (ms: number) => {
      if (!running) return
      raf = requestAnimationFrame(tick)
      // Scene clock with a bounded delta: hiding and re-showing the tab
      // resumes without jumping forward (rAF is suspended while hidden).
      const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0
      last = ms
      clock.current += dt
      setFrame(engine.sample(clock.current))
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        last = 0
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    raf = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [engine, isStatic])

  const shown = staticFrame ?? frame

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative || undefined}
      className={className}
      data-baksur-direction={direction}
      data-baksur-state={state}
      data-baksur-static={isStatic ? 'true' : undefined}
      data-baksur-mood={moodColor}
    >
      <defs>
        {moodColor ? (
          /* V3.5 mood-light: a top-left key light over the charcoal body.
             Stops stay low-alpha so the silhouette remains the same dark
             form at every size (24px → 184px). */
          <radialGradient id={moodGradId} cx="0.32" cy="0.24" r="0.95">
            <stop offset="0%" stopColor={moodColor} stopOpacity="0.55" />
            <stop offset="55%" stopColor={moodColor} stopOpacity="0.16" />
            <stop offset="100%" stopColor={moodColor} stopOpacity="0" />
          </radialGradient>
        ) : null}
        {/*
          The eyes are real holes punched in the body (upstream design), so
          they clip themselves at the silhouette edge automatically.
        */}
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-VB}
          y={-VB}
          width={VB * 2}
          height={VB * 2}
        >
          <path d={shown.bodyPath} fill="#fff" />
          {shown.eyes.map((eye, i) => (
            <path key={i} d={eye.d} transform={eye.matrix} opacity={eye.alpha} fill="#000" />
          ))}
        </mask>
      </defs>

      <g opacity={shown.bodyAlpha}>
        {/*
          Opaque backing in the eye colour: the mask holes reveal it, so the
          eyes read as light dots on the dark body.
        */}
        <path d={shown.bodyPath} fill={eyeColor} />
        <g mask={`url(#${maskId})`}>
          <rect x={-VB} y={-VB} width={VB * 2} height={VB * 2} fill={bodyColor} />
          {moodColor ? (
            <rect x={-VB} y={-VB} width={VB * 2} height={VB * 2} fill={`url(#${moodGradId})`} />
          ) : null}
        </g>
      </g>

      {shown.dots.map((dot, i) =>
        dot.d ? (
          <path
            key={i}
            d={dot.d}
            fill={dot.color ?? bodyColor}
            opacity={dot.opacity}
            transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`}
          />
        ) : (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={dot.r}
            fill={dot.color ?? bodyColor}
            opacity={dot.opacity}
          />
        )
      )}
    </svg>
  )
}
