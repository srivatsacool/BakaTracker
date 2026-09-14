/*
 * BAKATRACKER — Canonical Flamehorn Character Component
 *
 * Implements the canonical Flamehorn character with:
 * - Direction A: Mild organic pebble base with dual curved horns (233° & 307°) and central flame crest (270°)
 * - Deep luminous capsule eyes with translucent aura diffusion
 * - Dark ambient socket occlusion shadow
 * - Dual glass specular catchlight glints with gaze parallax
 * - Volumetric depth: 3D core shadow, mood keylight gradient, upper crest specular sheen
 * - Tactile micro-grain pattern and organic turbulence noise overlay
 * - Grounding contact shadow and soft outer purple bloom
 * - Smooth pointer gaze tracking and natural blink & breathing cycle
 * - 6 emotional states: Idle, Thinking, Celebrate (Wink), Alert, Sleep, Happy
 */

import React, { useEffect, useId, useMemo, useRef } from 'react'

export type FlamehornMood = 'idle' | 'thinking' | 'celebrate' | 'alert' | 'sleep' | 'happy'

export interface FlamehornCharacterProps {
  state?: FlamehornMood | 'IDLE' | 'THINKING' | 'CELEBRATE' | 'ALERT' | 'SLEEP' | 'HAPPY'
  size?: number
  moodColor?: string
  tactileTexture?: number // 0 - 100, default 48
  coreDepth?: number // 0 - 100, default 100
  specularSheen?: number // 0 - 100, default 61
  eyeGlow?: number // 0 - 100, default 85
  socketDepth?: number // 0 - 100, default 85
  followPointer?: boolean
  interactive?: boolean
  showGroundShadow?: boolean
  frozenAt?: number
  decorative?: boolean
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
  onSvgReady?: (svgString: string) => void
}

const SAMPLES = 64
const RAYON = 100

function addBump(radii: number[], centerDeg: number, innerDeg: number, outerDeg: number, height: number): void {
  const n = radii.length
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360
    let d = a - centerDeg
    while (d > 180) d -= 360
    while (d < -180) d += 360
    const half = d >= 0 ? outerDeg : innerDeg
    const x = Math.abs(d) / half
    if (x >= 1) continue
    radii[i] = (radii[i] ?? 1) + height * Math.pow(Math.cos((x * Math.PI) / 2), 2)
  }
}

export function buildFlamehornRadii(): number[] {
  const base: number[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const a = (i / SAMPLES) * Math.PI * 2
    base.push(1 + 0.045 * Math.cos(2 * a) + 0.02 * Math.cos(4 * a))
  }
  const peak = Math.max(...base)
  const normalized = base.map((r) => r / (peak || 1))
  addBump(normalized, 233, 10, 18, 0.17) // Left horn
  addBump(normalized, 307, 18, 10, 0.17) // Right horn
  addBump(normalized, 270, 12, 12, 0.12) // Central flame crest
  return normalized
}

export const CANONICAL_FLAMEHORN_RADII = buildFlamehornRadii()

/** Catmull-Rom closed spline generator for butter-smooth organic contour */
function closedSpline(points: { x: number; y: number }[]): string {
  const n = points.length
  if (n === 0) return ''
  let d = `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]!
    const p1 = points[i]!
    const p2 = points[(i + 1) % n]!
    const p3 = points[(i + 2) % n]!

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d + ' Z'
}

export function buildBodyPath(scaleY = 1.0, breath = 0): string {
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const theta = (i / SAMPLES) * Math.PI * 2
    const r = ((CANONICAL_FLAMEHORN_RADII[i] ?? 1) + breath) * RAYON
    const x = r * Math.cos(theta)
    const y = r * Math.sin(theta) * scaleY
    points.push({ x, y })
  }
  return closedSpline(points)
}

export function makeEyePath(w: number, h: number): string {
  if (h <= w) {
    const r = Math.max(1, h / 2)
    return `M ${-w / 2} 0 A ${w / 2} ${r} 0 0 1 ${w / 2} 0 A ${w / 2} ${r} 0 0 1 ${-w / 2} 0 Z`
  }
  const r = w / 2
  const straight = (h - w) / 2
  return `M ${-r} ${-straight} A ${r} ${r} 0 0 1 ${r} ${-straight} L ${r} ${straight} A ${r} ${r} 0 0 1 ${-r} ${straight} Z`
}

function normalizeState(s: string): FlamehornMood {
  const lower = s.toLowerCase()
  if (lower === 'thinking') return 'thinking'
  if (lower === 'celebrate' || lower === 'wink') return 'celebrate'
  if (lower === 'alert' || lower === 'wide') return 'alert'
  if (lower === 'sleep') return 'sleep'
  if (lower === 'happy') return 'happy'
  return 'idle'
}

export const FlamehornCharacter: React.FC<FlamehornCharacterProps> = ({
  state = 'idle',
  size = 320,
  moodColor = '#8B5CF6',
  tactileTexture = 48,
  coreDepth = 100,
  specularSheen = 61,
  eyeGlow = 85,
  socketDepth = 85,
  followPointer = true,
  interactive = true,
  showGroundShadow = true,
  frozenAt,
  decorative = false,
  ariaLabel = 'Bakasur Flamehorn',
  className = '',
  style,
  onSvgReady
}) => {
  const rawId = useId()
  const uid = useMemo(() => rawId.replace(/[^a-zA-Z0-9_-]/g, ''), [rawId])
  const activeMood = normalizeState(state)

  const stageRef = useRef<SVGSVGElement | null>(null)
  const bodyPathMaskRef = useRef<SVGPathElement | null>(null)
  const eyeLeftSocketRef = useRef<SVGPathElement | null>(null)
  const eyeRightSocketRef = useRef<SVGPathElement | null>(null)
  const eyeLeftBodyRef = useRef<SVGPathElement | null>(null)
  const eyeRightBodyRef = useRef<SVGPathElement | null>(null)
  const eyeLeftContainerRef = useRef<SVGGElement | null>(null)
  const eyeRightContainerRef = useRef<SVGGElement | null>(null)
  const eyeLeftGlint1Ref = useRef<SVGEllipseElement | null>(null)
  const eyeLeftGlint2Ref = useRef<SVGEllipseElement | null>(null)
  const eyeRightGlint1Ref = useRef<SVGEllipseElement | null>(null)
  const eyeRightGlint2Ref = useRef<SVGEllipseElement | null>(null)
  const characterGroupRef = useRef<SVGGElement | null>(null)

  const targetLook = useRef({ x: 0, y: 0 })
  const currentLook = useRef({ x: 0, y: 0 })
  const blinkValue = useRef(1.0)
  const blinkTimer = useRef(0)
  const lastTime = useRef(performance.now())

  // Reduced motion support
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  const isStatic = frozenAt !== undefined || prefersReducedMotion

  // Handle pointer tracking
  useEffect(() => {
    if (!followPointer || isStatic) return

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      const el = stageRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const maxDistX = Math.max(120, window.innerWidth * 0.35)
      const maxDistY = Math.max(120, window.innerHeight * 0.35)
      const dx = (e.clientX - cx) / maxDistX
      const dy = (e.clientY - cy) / maxDistY
      targetLook.current.x = Math.max(-1, Math.min(1, dx))
      targetLook.current.y = Math.max(-1, Math.min(1, dy))
    }

    const handleMouseLeave = () => {
      targetLook.current.x = 0
      targetLook.current.y = 0
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [followPointer, isStatic])

  // Click to trigger quick blink
  const handleClick = () => {
    if (!interactive || isStatic) return
    blinkValue.current = 0.05
  }

  // Animation Loop
  useEffect(() => {
    let rafId: number
    let running = true

    const updateFrame = (now: number) => {
      if (!running) return

      const dt = Math.min((now - lastTime.current) / 1000, 0.064)
      lastTime.current = now

      // Smooth look lerp
      currentLook.current.x += (targetLook.current.x - currentLook.current.x) * Math.min(1, dt * 6)
      currentLook.current.y += (targetLook.current.y - currentLook.current.y) * Math.min(1, dt * 6)

      // Blink cycle
      blinkTimer.current += dt
      if (blinkTimer.current > 3.8 + Math.sin(now * 0.0007) * 1.5) {
        blinkValue.current = 0.05
        blinkTimer.current = 0
      }
      blinkValue.current += (1.0 - blinkValue.current) * Math.min(1, dt * 14)

      // State specific parameters
      let breathAmp = 0.02 * Math.sin(now * 0.002)
      let bodyScaleY = 1.0
      let leftEyeH = 58 * blinkValue.current
      let rightEyeH = 58 * blinkValue.current
      let leftEyeW = 28
      let rightEyeW = 28
      let eyeBaseY = -10
      let gazeOffsetX = currentLook.current.x * 24
      let gazeOffsetY = currentLook.current.y * 18
      let rot = currentLook.current.x * 5

      if (activeMood === 'thinking') {
        bodyScaleY = 0.96
        breathAmp = 0.008 * Math.sin(now * 0.001)
        gazeOffsetY -= 12
        gazeOffsetX += 6
      } else if (activeMood === 'celebrate') {
        rightEyeH = 3 // Single eye wink!
        leftEyeH = 54 * blinkValue.current
        gazeOffsetX += 4
        rot += 3
      } else if (activeMood === 'alert') {
        leftEyeH = 64
        rightEyeH = 64
        leftEyeW = 32
        rightEyeW = 32
        bodyScaleY = 1.04
      } else if (activeMood === 'sleep') {
        leftEyeH = 3
        rightEyeH = 3
        bodyScaleY = 0.92
        breathAmp = 0.035 * Math.sin(now * 0.0012)
        eyeBaseY = -6
      } else if (activeMood === 'happy') {
        leftEyeH = 26 * blinkValue.current
        rightEyeH = 26 * blinkValue.current
        eyeBaseY = -14
      }

      // Re-generate body path
      const bodyD = buildBodyPath(bodyScaleY, breathAmp)
      if (bodyPathMaskRef.current) {
        bodyPathMaskRef.current.setAttribute('d', bodyD)
      }

      // Eye placement on the sphere
      const leftX = -26 + gazeOffsetX
      const rightX = 26 + gazeOffsetX
      const eyeY = eyeBaseY + gazeOffsetY

      const leftEyePath = makeEyePath(leftEyeW, leftEyeH)
      const rightEyePath = makeEyePath(rightEyeW, rightEyeH)

      const leftSocketPath = makeEyePath(leftEyeW + 8, leftEyeH + 8)
      const rightSocketPath = makeEyePath(rightEyeW + 8, rightEyeH + 8)

      if (eyeLeftSocketRef.current) eyeLeftSocketRef.current.setAttribute('d', leftSocketPath)
      if (eyeRightSocketRef.current) eyeRightSocketRef.current.setAttribute('d', rightSocketPath)

      if (eyeLeftBodyRef.current) eyeLeftBodyRef.current.setAttribute('d', leftEyePath)
      if (eyeRightBodyRef.current) eyeRightBodyRef.current.setAttribute('d', rightEyePath)

      const leftTransform = `translate(${leftX.toFixed(2)} ${eyeY.toFixed(2)}) rotate(${rot.toFixed(2)})`
      const rightTransform = `translate(${rightX.toFixed(2)} ${eyeY.toFixed(2)}) rotate(${rot.toFixed(2)})`

      if (eyeLeftContainerRef.current) eyeLeftContainerRef.current.setAttribute('transform', leftTransform)
      if (eyeRightContainerRef.current) eyeRightContainerRef.current.setAttribute('transform', rightTransform)

      // Glints visibility & parallax
      const glintVisibleLeft = leftEyeH > 10
      const glintVisibleRight = rightEyeH > 10
      if (eyeLeftGlint1Ref.current) eyeLeftGlint1Ref.current.style.display = glintVisibleLeft ? '' : 'none'
      if (eyeLeftGlint2Ref.current) eyeLeftGlint2Ref.current.style.display = glintVisibleLeft ? '' : 'none'
      if (eyeRightGlint1Ref.current) eyeRightGlint1Ref.current.style.display = glintVisibleRight ? '' : 'none'
      if (eyeRightGlint2Ref.current) eyeRightGlint2Ref.current.style.display = glintVisibleRight ? '' : 'none'

      // Parallax catchlight position
      const glint1X = -5 - currentLook.current.x * 3
      const glint1Y = -14 - currentLook.current.y * 3
      if (eyeLeftGlint1Ref.current) {
        eyeLeftGlint1Ref.current.setAttribute('cx', glint1X.toFixed(2))
        eyeLeftGlint1Ref.current.setAttribute('cy', glint1Y.toFixed(2))
      }
      if (eyeRightGlint1Ref.current) {
        eyeRightGlint1Ref.current.setAttribute('cx', glint1X.toFixed(2))
        eyeRightGlint1Ref.current.setAttribute('cy', glint1Y.toFixed(2))
      }

      // Gentle floating micro-motion + subtle 3D body lean into gaze
      const floatY = Math.sin(now * 0.0018) * 3
      const leanX = currentLook.current.x * 5
      const leanY = currentLook.current.y * 3.5
      const leanRot = currentLook.current.x * 2.5
      if (characterGroupRef.current) {
        characterGroupRef.current.setAttribute(
          'transform',
          `translate(${leanX.toFixed(2)} ${(floatY + leanY).toFixed(2)}) rotate(${leanRot.toFixed(2)})`
        )
      }

      rafId = requestAnimationFrame(updateFrame)
    }

    if (!isStatic) {
      rafId = requestAnimationFrame(updateFrame)
    } else {
      // Single static render
      const bodyD = buildBodyPath(1.0, 0)
      if (bodyPathMaskRef.current) bodyPathMaskRef.current.setAttribute('d', bodyD)
      const leftEyePath = makeEyePath(28, 58)
      const rightEyePath = makeEyePath(28, 58)
      if (eyeLeftBodyRef.current) eyeLeftBodyRef.current.setAttribute('d', leftEyePath)
      if (eyeRightBodyRef.current) eyeRightBodyRef.current.setAttribute('d', rightEyePath)
      if (eyeLeftSocketRef.current) eyeLeftSocketRef.current.setAttribute('d', makeEyePath(36, 66))
      if (eyeRightSocketRef.current) eyeRightSocketRef.current.setAttribute('d', makeEyePath(36, 66))
      if (eyeLeftContainerRef.current) eyeLeftContainerRef.current.setAttribute('transform', 'translate(-26 -10)')
      if (eyeRightContainerRef.current) eyeRightContainerRef.current.setAttribute('transform', 'translate(26 -10)')
    }

    return () => {
      running = false
      cancelAnimationFrame(rafId)
    }
  }, [activeMood, isStatic])

  // Provide SVG string callback if requested
  useEffect(() => {
    if (onSvgReady && stageRef.current) {
      onSvgReady(stageRef.current.outerHTML)
    }
  }, [onSvgReady, activeMood, moodColor, size, tactileTexture, coreDepth, specularSheen, eyeGlow, socketDepth])

  // Computed filter & gradient values
  const grainAlpha = ((tactileTexture / 100) * 0.18).toFixed(3)
  const grainOpacity = (tactileTexture / 100).toFixed(2)
  const depthShadowOpacity = (coreDepth / 100).toFixed(2)
  const groundShadowOpacity = ((coreDepth / 100) * 0.55).toFixed(2)
  const sheenOpacity = (specularSheen / 100).toFixed(2)
  const glowK = eyeGlow / 100
  const socketOpacity = ((socketDepth / 100) * 0.7).toFixed(2)

  // IDs
  const maskId = `flamehorn-mask-${uid}`
  const moodGradId = `mood-grad-${uid}`
  const shadowBlurId = `shadow-blur-${uid}`
  const sheenBlurId = `sheen-blur-${uid}`
  const groundBlurId = `ground-blur-${uid}`
  const bloomFilterId = `bloom-filter-${uid}`
  const grainPatId = `grain-pat-${uid}`
  const grainFilterId = `grain-filter-${uid}`
  const eyeGradId = `eye-luminous-grad-${uid}`
  const eyeDiffusionId = `eye-soft-diffusion-${uid}`
  const socketFilterId = `socket-shadow-filter-${uid}`

  return (
    <svg
      ref={stageRef}
      width={size}
      height={size}
      viewBox="-158 -158 316 316"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative || undefined}
      className={`select-none ${className}`}
      style={{ cursor: interactive ? 'pointer' : 'default', ...style }}
      onClick={handleClick}
    >
      <defs>
        {/* Mood Keylight Radial Gradient */}
        <radialGradient id={moodGradId} cx="0.32" cy="0.24" r="0.95">
          <stop offset="0%" stopColor={moodColor} stopOpacity="0.65" />
          <stop offset="55%" stopColor={moodColor} stopOpacity="0.20" />
          <stop offset="100%" stopColor={moodColor} stopOpacity="0" />
        </radialGradient>

        {/* Blur Filters */}
        <filter id={shadowBlurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
        <filter id={sheenBlurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id={groundBlurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="16" />
        </filter>

        {/* Character Bloom Glow Filter */}
        <filter id={bloomFilterId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={moodColor} floodOpacity="0.6" />
          <feDropShadow dx="0" dy="0" stdDeviation="16" floodColor={moodColor} floodOpacity="0.35" />
        </filter>

        {/* Tactile Micro-Grain Pattern */}
        <pattern id={grainPatId} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.75" fill="#ffffff" opacity="0.08" />
          <circle cx="4.5" cy="4.5" r="0.75" fill="#000000" opacity="0.12" />
          <circle cx="4.5" cy="1.5" r="0.5" fill="#ffffff" opacity="0.05" />
          <circle cx="1.5" cy="4.5" r="0.5" fill="#000000" opacity="0.08" />
        </pattern>

        {/* Fractal Turbulence Noise Overlay */}
        <filter id={grainFilterId} x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={3} result="noise" />
          <feColorMatrix
            type="matrix"
            values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${grainAlpha} 0`}
          />
        </filter>

        {/* Deep Luminous Eye Gradient */}
        <radialGradient id={eyeGradId} cx="45%" cy="38%" r="68%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="50%" stopColor="#faf6ff" stopOpacity="0.98" />
          <stop offset="80%" stopColor="#f0e6fe" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#dfcbfe" stopOpacity="0.88" />
        </radialGradient>

        {/* Soft Translucent Aura Diffusion */}
        <filter id={eyeDiffusionId} x="-100%" y="-100%" width="300%" height="300%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={moodColor} floodOpacity={(glowK * 0.42).toFixed(2)} />
          <feDropShadow dx="0" dy="0" stdDeviation="14" floodColor={moodColor} floodOpacity={(glowK * 0.25).toFixed(2)} />
          <feDropShadow dx="0" dy="0" stdDeviation="28" floodColor={moodColor} floodOpacity={(glowK * 0.12).toFixed(2)} />
        </filter>

        {/* Socket Occlusion Shadow Filter */}
        <filter id={socketFilterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>

        {/* Dynamic Body Silhouette Mask */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-158" y="-158" width="316" height="316">
          <path ref={bodyPathMaskRef} fill="#fff" d={buildBodyPath(1.0, 0)} />
        </mask>
      </defs>

      {/* Grounding Contact Shadow */}
      {showGroundShadow && (
        <ellipse
          cx="0"
          cy="118"
          rx="85"
          ry="14"
          fill="#000000"
          opacity={groundShadowOpacity}
          filter={`url(#${groundBlurId})`}
        />
      )}

      <g ref={characterGroupRef} filter={`url(#${bloomFilterId})`}>
        {/* Masked Charcoal Body + Volumetric Depth & Texture */}
        <g mask={`url(#${maskId})`}>
          <rect x="-158" y="-158" width="316" height="316" fill="#0d0618" />
          {/* Core Ambient Shadow (Bottom-Right Depth) */}
          <ellipse
            cx="40"
            cy="50"
            rx="90"
            ry="75"
            fill="#000000"
            opacity={depthShadowOpacity}
            filter={`url(#${shadowBlurId})`}
          />
          {/* Keylight Gradient (Top-Left Volume) */}
          <rect x="-158" y="-158" width="316" height="316" fill={`url(#${moodGradId})`} />
          {/* Specular Sheen (Upper Crest Highlight) */}
          <ellipse
            cx="-35"
            cy="-45"
            rx="55"
            ry="42"
            fill="#ffffff"
            opacity={sheenOpacity}
            filter={`url(#${sheenBlurId})`}
          />
          {/* Tactile Micro-Grain Pattern */}
          <rect
            x="-158"
            y="-158"
            width="316"
            height="316"
            fill={`url(#${grainPatId})`}
            style={{ opacity: Number(grainOpacity) }}
          />
          {/* Organic Turbulence Noise Overlay */}
          <rect x="-158" y="-158" width="316" height="316" filter={`url(#${grainFilterId})`} />
        </g>

        {/* DEEP LUMINOUS EYES LAYER */}
        <g id="eyes-container">
          {/* Left Eye Structure */}
          <g ref={eyeLeftContainerRef} transform="translate(-26 -10)">
            {/* Dark subtle ambient socket occlusion */}
            <path
              ref={eyeLeftSocketRef}
              fill="#030108"
              opacity={socketOpacity}
              filter={`url(#${socketFilterId})`}
              d={makeEyePath(36, 66)}
            />
            {/* Smooth luminous eye pill with translucent aura diffusion */}
            <path
              ref={eyeLeftBodyRef}
              fill={`url(#${eyeGradId})`}
              filter={`url(#${eyeDiffusionId})`}
              d={makeEyePath(28, 58)}
            />
            {/* Glass specular catchlight glints */}
            <ellipse ref={eyeLeftGlint1Ref} cx="-5" cy="-14" rx="3.5" ry="5.5" fill="#ffffff" opacity="0.9" />
            <ellipse ref={eyeLeftGlint2Ref} cx="4" cy="14" rx="2" ry="2.8" fill="#ffffff" opacity="0.45" />
          </g>

          {/* Right Eye Structure */}
          <g ref={eyeRightContainerRef} transform="translate(26 -10)">
            {/* Dark subtle ambient socket occlusion */}
            <path
              ref={eyeRightSocketRef}
              fill="#030108"
              opacity={socketOpacity}
              filter={`url(#${socketFilterId})`}
              d={makeEyePath(36, 66)}
            />
            {/* Smooth luminous eye pill with translucent aura diffusion */}
            <path
              ref={eyeRightBodyRef}
              fill={`url(#${eyeGradId})`}
              filter={`url(#${eyeDiffusionId})`}
              d={makeEyePath(28, 58)}
            />
            {/* Glass specular catchlight glints */}
            <ellipse ref={eyeRightGlint1Ref} cx="-5" cy="-14" rx="3.5" ry="5.5" fill="#ffffff" opacity="0.9" />
            <ellipse ref={eyeRightGlint2Ref} cx="4" cy="14" rx="2" ry="2.8" fill="#ffffff" opacity="0.45" />
          </g>
        </g>
      </g>
    </svg>
  )
}
