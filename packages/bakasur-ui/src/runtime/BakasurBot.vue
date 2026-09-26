<!--
  BAKASUR-UI — Original Bakasur work (Phase 3 component, Phase 5 adapters, Phase 6 presets).

  BakasurBot: the embeddable Bakasur character. `state` is an INTENT id
  (upstream StateId strings, so timelines resolve directly); every intent
  goes through resolveBakasurAnimation — the runtime NEVER samples a raw
  upstream silhouette. `expression`, when provided, overrides the intent's
  face (same resolver as Phase 4); omitted, the intent decides.

  Phase 6: `preset` names a catalogue preset (composition of animation +
  face + shape + theme + treatment); explicit `state` / `expression` /
  `colour` props override the preset per field. Without `preset`, this
  component behaves exactly as in Phase 5 — the direct props travel the
  same resolution pipeline.

  Persistent SVG DOM Architecture:
  Renders static defs, filters, masks, and gradients ONCE into the DOM tree.
  Animation ticks mutate only dynamic attributes (bodyPath, eye matrices, alpha)
  in-place without reparsing or destroying the SVG DOM.
  Includes dual-stage eye tracking smoothing and intelligent idle-settle sleep
  for silky responsiveness and 0% idle CPU draw.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { BotEngine, type BotFrame, type Look } from '../engine/engine'
import { DEMI_VIEWBOX, RAYON } from '../engine/repere'
import type { StateId } from '../engine/states'
import type { BakasurPresetTreatment } from '../bakasur/presets/types'
import {
  applyResolvedPreset,
  getBakasurPreset,
  resolveBakasurPreset,
  resolveBakasurTheme,
  resolvePresetDef
} from '../bakasur/presets'
import { arcStops } from '../bakasur/render'
import { BAKASUR_LIGHTING } from '../bakasur/lighting'
import { r2 } from '../engine/math'
import { mixHex } from '../engine/skins'
import type { DotRender } from '../engine/decor'
import { BLINKS, BLINK_DUR } from '../engine/face'

const props = withDefaults(
  defineProps<{
    state?: StateId
    preset?: string
    colour?: string
    expression?: string | null
    /** Explicit treatment overlay (Lab scrubbing); undefined = preset/intent. */
    treatment?: BakasurPresetTreatment | null
    size?: number
    frozenAt?: number
    follow?: boolean
    label?: string
  }>(),
  {
    state: undefined,
    preset: undefined,
    colour: undefined,
    expression: undefined,
    treatment: undefined,
    size: 160,
    frozenAt: undefined,
    follow: false,
    label: 'Bakasur'
  }
)

const R = RAYON
const VB = DEMI_VIEWBOX
const L = BAKASUR_LIGHTING

/** Quiet follow amplitudes (Phase 10 owns interaction tuning). */
const FOLLOW_YAW_MAX = 18
const FOLLOW_PITCH_MAX = 14

const uid = Math.random().toString(36).slice(2, 8)
const maskId = `bakasur-mask-${uid}`
const keyId = `bakasur-key-${uid}`
const shadowBlurId = `bakasur-depth-shadow-${uid}`
const sheenBlurId = `bakasur-depth-sheen-${uid}`
const grainPatId = `bakasur-grain-pat-${uid}`
const rimId = `bakasur-rim-${uid}`

const svgRef = ref<SVGSVGElement | null>(null)

/** Catalogue preset, when named (unknown ids fall back to the direct path). */
const presetDef = computed(() => (props.preset ? getBakasurPreset(props.preset) : undefined))

/**
 * Full resolution: preset composition, then explicit props per field.
 * Precedence: explicit prop > preset overlay > intent default.
 */
const resolved = computed(() =>
  presetDef.value
    ? resolvePresetDef(presetDef.value, {
        expression: props.expression ?? undefined,
        theme: props.colour,
        treatment: props.treatment ?? undefined
      })
    : resolveBakasurPreset(
        { animation: props.state ?? 'idle', theme: props.colour },
        { expression: props.expression ?? undefined, treatment: props.treatment ?? undefined }
      )
)

/** Theme colour surface for the renderer (structural pass-through). */
const theme = computed(() => resolveBakasurTheme(resolved.value.theme))
const dim = computed(() => resolved.value.treatment?.dim ?? 0)
const glow = computed(() => resolved.value.treatment?.glow ?? 1)

const cachedLook = computed<Look | null>(() => {
  const l = resolved.value.look
  return l ? { yaw: l.yaw, pitch: l.pitch, mix: l.mix, spin: 0, wander: 1 } : null
})

const engine = new BotEngine(R, resolved.value.vehicle, null, null)
const reduced =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
const isStatic = props.frozenAt !== undefined || reduced

/** Date the full resolved preset (vehicle + shape + face + gaze bias). */
function applyIntent(now: number) {
  applyResolvedPreset(engine, resolved.value, now)
}

applyIntent(0)
const frame = shallowRef<BotFrame>(engine.sample(props.frozenAt ?? 0))

let raf = 0
let last = 0
let clock = 0

let hasPointer = false
let targetYaw = cachedLook.value?.yaw ?? 0
let targetPitch = cachedLook.value?.pitch ?? 0
let leadYaw = targetYaw
let leadPitch = targetPitch
let currentYaw = targetYaw
let currentPitch = targetPitch
let currentMix = cachedLook.value?.mix ?? 0

let isVisible = true
let observer: IntersectionObserver | null = null
let isListeningPointer = false
let cachedBox: DOMRect | null = null
let lastBoxTime = 0
let cachedBodyPath = ''
let lastBodyPathTime = 0
let blinkTimer: ReturnType<typeof setTimeout> | null = null

function updateBox(el: HTMLElement | SVGElement | null): DOMRect | null {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (!cachedBox || now - lastBoxTime > 500) {
    if (el) {
      cachedBox = el.getBoundingClientRect()
      lastBoxTime = now
    }
  }
  return cachedBox
}

function invalidateBox() {
  cachedBox = null
  lastBoxTime = 0
}

function clearBlinkTimer() {
  if (blinkTimer) {
    clearTimeout(blinkTimer)
    blinkTimer = null
  }
}

function scheduleNextBlink() {
  clearBlinkTimer()
  if (isStatic || !isVisible) return
  const next = BLINKS.find((t) => t > clock)
  if (next !== undefined) {
    const delayMs = Math.max(40, (next - clock - 0.05) * 1000)
    blinkTimer = setTimeout(() => {
      startLoop()
    }, delayMs)
  }
}

function startLoop() {
  if (isStatic || !isVisible) return
  clearBlinkTimer()
  if (raf === 0) {
    last = 0
    raf = requestAnimationFrame(tick)
  }
  if (props.follow && !isListeningPointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
    isListeningPointer = true
  }
}

function stopLoop() {
  clearBlinkTimer()
  if (raf !== 0) {
    cancelAnimationFrame(raf)
    raf = 0
  }
  if (isListeningPointer) {
    window.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerleave', onPointerLeave)
    isListeningPointer = false
  }
}

function tick(ms: number) {
  if (!isVisible || isStatic) {
    raf = 0
    return
  }

  const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0
  last = ms
  clock += dt

  const lookTarget = cachedLook.value

  if (props.follow) {
    const targetMix = hasPointer ? 1 : (lookTarget?.mix ?? 0)

    // Dual-stage exponential filter:
    // Stage 1 (lead) provides responsive, alert reaction without robotic snapping
    const kLead = 1 - Math.exp(-9.0 * dt)
    leadYaw += (targetYaw - leadYaw) * kLead
    leadPitch += (targetPitch - leadPitch) * kLead

    // Stage 2 (follower) provides silky critically-damped deceleration
    const kFollow = 1 - Math.exp(-7.5 * dt)
    currentYaw += (leadYaw - currentYaw) * kFollow
    currentPitch += (leadPitch - currentPitch) * kFollow
    currentMix += (targetMix - currentMix) * kFollow

    engine.setLook(
      {
        yaw: currentYaw,
        pitch: currentPitch,
        mix: currentMix,
        spin: 0,
        wander: Math.max(0, 1 - currentMix)
      },
      clock,
      0
    )
  }

  const sampled = engine.sample(clock)
  if (hasPointer && cachedBodyPath && clock - lastBodyPathTime < 0.066) {
    sampled.bodyPath = cachedBodyPath
  } else {
    cachedBodyPath = sampled.bodyPath
    lastBodyPathTime = clock
  }

  frame.value = sampled

  // Idle settle detection & sleep:
  // When in resting idle state, cursor stationary, smoothing converged, and not blinking:
  const isIdleState =
    (props.state === undefined || props.state === 'idle') &&
    (!props.preset || props.preset === 'idle' || props.preset === 'calm')

  const canSleep =
    isIdleState &&
    frame.value.arcs.length === 0 &&
    (!frame.value.dots || frame.value.dots.length === 0)

  if (canSleep) {
    const targetMix = hasPointer ? 1 : (lookTarget?.mix ?? 0)
    const isGazeSettled =
      Math.abs(targetYaw - currentYaw) < 0.04 &&
      Math.abs(targetPitch - currentPitch) < 0.04 &&
      Math.abs(leadYaw - currentYaw) < 0.04 &&
      Math.abs(targetMix - currentMix) < 0.04

    const isBlinking = BLINKS.some((t) => clock >= t && clock <= t + BLINK_DUR + 0.06)

    if (isGazeSettled && !isBlinking) {
      raf = 0
      scheduleNextBlink()
      return
    }
  }

  raf = requestAnimationFrame(tick)
}

function onPointerMove(event: PointerEvent) {
  if (!props.follow || event.pointerType === 'touch' || !isVisible) return
  hasPointer = true
  clearBlinkTimer()
  if (raf === 0) {
    startLoop()
  }
  const el = svgRef.value
  const box = updateBox(el)
  if (!box || box.width === 0 || box.height === 0) return
  const nx = (event.clientX - (box.left + box.width / 2)) / Math.max(120, window.innerWidth * 0.35)
  const ny = (event.clientY - (box.top + box.height / 2)) / Math.max(120, window.innerHeight * 0.35)
  targetYaw = Math.max(-1, Math.min(1, nx)) * FOLLOW_YAW_MAX
  targetPitch = -Math.max(-1, Math.min(1, ny)) * FOLLOW_PITCH_MAX
}

function onPointerLeave() {
  hasPointer = false
  const rl = cachedLook.value
  targetYaw = rl?.yaw ?? 0
  targetPitch = rl?.pitch ?? 0
  clearBlinkTimer()
  if (raf === 0) {
    startLoop()
  }
}

function dotAttrs(dot: DotRender) {
  const fill =
    dot.color ??
    (dot.depth === undefined
      ? theme.value.body
      : mixHex(theme.value.void, theme.value.body, dot.depth))
  const common = { fill, opacity: dot.opacity }
  return dot.d
    ? {
        ...common,
        d: dot.d,
        transform: `translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`
      }
    : { ...common, cx: dot.x, cy: dot.y, r: dot.r }
}

watch(resolved, () => {
  applyIntent(clock)
  if (!hasPointer) {
    const rl = cachedLook.value
    targetYaw = rl?.yaw ?? 0
    targetPitch = rl?.pitch ?? 0
  }
  frame.value = engine.sample(isStatic ? (props.frozenAt ?? 0) : clock)
  clearBlinkTimer()
  startLoop()
})

watch(() => props.follow, (val) => {
  if (val && !isListeningPointer && !isStatic && isVisible) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
    isListeningPointer = true
    startLoop()
  } else if (!val && isListeningPointer) {
    window.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerleave', onPointerLeave)
    isListeningPointer = false
  }
})

onMounted(() => {
  if (isStatic) return

  const el = svgRef.value
  if (typeof IntersectionObserver !== 'undefined' && el) {
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) {
          isVisible = entry.isIntersecting
          if (isVisible) {
            invalidateBox()
            startLoop()
          } else {
            stopLoop()
          }
        }
      },
      { rootMargin: '100px' }
    )
    observer.observe(el)
  } else {
    startLoop()
  }

  window.addEventListener('resize', invalidateBox, { passive: true })
  window.addEventListener('scroll', invalidateBox, { passive: true })
})

onBeforeUnmount(() => {
  stopLoop()
  clearBlinkTimer()
  if (observer) {
    observer.disconnect()
    observer = null
  }
  window.removeEventListener('resize', invalidateBox)
  window.removeEventListener('scroll', invalidateBox)
})
</script>

<template>
  <svg
    ref="svgRef"
    :id="`bakasur-${uid}`"
    :width="props.size"
    :height="props.size"
    :viewBox="`${-VB} ${-VB} ${VB * 2} ${VB * 2}`"
    role="img"
    :aria-label="props.label"
    style="contain: paint; will-change: transform;"
  >
    <defs>
      <mask
        :id="maskId"
        maskUnits="userSpaceOnUse"
        :x="-VB"
        :y="-VB"
        :width="VB * 2"
        :height="VB * 2"
      >
        <path :d="frame.bodyPath" fill="#fff" />
        <path
          v-for="(eye, i) in frame.eyes"
          :key="i"
          :d="eye.d"
          :transform="eye.matrix"
          :opacity="eye.alpha"
          fill="#000"
        />
        <circle
          v-if="frame.notch"
          :cx="frame.notch.x"
          :cy="frame.notch.y"
          :r="frame.notch.r"
          fill="#000"
        />
      </mask>

      <radialGradient
        :id="keyId"
        gradientUnits="objectBoundingBox"
        :cx="L.keyX"
        :cy="L.keyY"
        r="0.95"
      >
        <stop
          v-for="([offset, , opacity], i) in L.stops"
          :key="i"
          :offset="`${r2(offset * 100)}%`"
          :stop-color="theme.innerLight"
          :stop-opacity="opacity"
        />
      </radialGradient>

      <filter
        :id="shadowBlurId"
        filterUnits="userSpaceOnUse"
        :x="-VB"
        :y="-VB"
        :width="VB * 2"
        :height="VB * 2"
      >
        <feGaussianBlur stdDeviation="30" />
      </filter>

      <filter
        :id="sheenBlurId"
        filterUnits="userSpaceOnUse"
        :x="-VB"
        :y="-VB"
        :width="VB * 2"
        :height="VB * 2"
      >
        <feGaussianBlur stdDeviation="22" />
      </filter>

      <pattern
        v-if="L.textureOpacity > 0"
        :id="grainPatId"
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
      >
        <circle cx="1.5" cy="1.5" r="0.75" :fill="theme.eyes" opacity="0.06" />
        <circle cx="4.5" cy="4.5" r="0.75" fill="#000000" opacity="0.10" />
        <circle cx="4.5" cy="1.5" r="0.5" :fill="theme.eyes" opacity="0.04" />
        <circle cx="1.5" cy="4.5" r="0.5" fill="#000000" opacity="0.07" />
      </pattern>

      <filter
        :id="rimId"
        filterUnits="userSpaceOnUse"
        :x="-VB"
        :y="-VB"
        :width="VB * 2"
        :height="VB * 2"
        color-interpolation-filters="sRGB"
      >
        <feDropShadow
          dx="0"
          dy="0"
          :stdDeviation="L.rimBlur"
          :flood-color="theme.rim"
          :flood-opacity="r2(L.rimOpacity * glow)"
        />
        <feDropShadow
          dx="0"
          dy="0"
          :stdDeviation="L.auraBlur"
          :flood-color="theme.rim"
          :flood-opacity="r2(L.auraOpacity * glow)"
        />
      </filter>

      <linearGradient
        v-for="arc in frame.arcs"
        :id="`bakasur-${uid}-${arc.id}`"
        :key="arc.id"
        gradientUnits="userSpaceOnUse"
        :x1="arc.grad.x1"
        :y1="arc.grad.y1"
        :x2="arc.grad.x2"
        :y2="arc.grad.y2"
      >
        <stop
          v-for="(stopCol, i) in arcStops(arc.grad.stops.length, theme)"
          :key="i"
          :offset="`${r2((i / (arc.grad.stops.length - 1 || 1)) * 100)}%`"
          :stop-color="stopCol"
        />
      </linearGradient>
    </defs>

    <!-- Back arcs -->
    <g v-if="frame.arcs.length" fill="none" stroke-linecap="round">
      <path
        v-for="arc in frame.arcs"
        :key="`b${arc.id}`"
        :d="arc.back"
        :stroke="`url(#bakasur-${uid}-${arc.id})`"
        :stroke-width="arc.width"
        :opacity="arc.opacity"
      />
    </g>

    <!-- Dots behind -->
    <g v-if="frame.dotsBehind && frame.dots?.length">
      <component
        :is="dot.d ? 'path' : 'circle'"
        v-for="(dot, i) in frame.dots"
        :key="`pb${i}`"
        v-bind="dotAttrs(dot)"
      />
    </g>

    <!-- Body & layers -->
    <g :opacity="frame.bodyAlpha">
      <!-- Eye-glow backing: filtered copy first (soft bloom), crisp on top -->
      <path :d="frame.bodyPath" :fill="theme.eyes" :filter="`url(#${rimId})`" />
      <path :d="frame.bodyPath" :fill="theme.eyes" />
      <g :mask="`url(#${maskId})`">
        <rect :x="-VB" :y="-VB" :width="VB * 2" :height="VB * 2" :fill="theme.body" />
        <ellipse cx="40" cy="50" rx="90" ry="75" fill="#000000" opacity="0.52" :filter="`url(#${shadowBlurId})`" />
        <rect :x="-VB" :y="-VB" :width="VB * 2" :height="VB * 2" :fill="`url(#${keyId})`" />
        <ellipse cx="-35" cy="-45" rx="55" ry="42" :fill="theme.eyes" opacity="0.22" :filter="`url(#${sheenBlurId})`" />
        <rect
          v-if="L.textureOpacity > 0"
          :x="-VB"
          :y="-VB"
          :width="VB * 2"
          :height="VB * 2"
          :fill="`url(#${grainPatId})`"
        />
        <rect
          v-if="dim > 0"
          :x="-VB"
          :y="-VB"
          :width="VB * 2"
          :height="VB * 2"
          fill="#000000"
          :opacity="dim"
        />
      </g>
    </g>

    <!-- Dots front -->
    <g v-if="!frame.dotsBehind && frame.dots?.length">
      <component
        :is="dot.d ? 'path' : 'circle'"
        v-for="(dot, i) in frame.dots"
        :key="`pf${i}`"
        v-bind="dotAttrs(dot)"
      />
    </g>

    <!-- Notification pastille -->
    <circle
      v-if="frame.notif"
      :cx="frame.notif.x"
      :cy="frame.notif.y"
      :r="frame.notif.r"
      :fill="theme.pastille"
    />

    <!-- Front arcs -->
    <g v-if="frame.arcs.length" fill="none" stroke-linecap="round">
      <path
        v-for="arc in frame.arcs"
        :key="`f${arc.id}`"
        :d="arc.front"
        :stroke="`url(#bakasur-${uid}-${arc.id})`"
        :stroke-width="arc.width"
        :opacity="arc.opacity"
      />
    </g>
  </svg>
</template>
