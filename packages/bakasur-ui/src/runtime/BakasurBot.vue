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

  Rendering is delegated to src/bakasur/render.ts with the resolved
  treatment + theme, the SAME function the preview matrices use.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BotEngine, type Look } from '../engine/engine'
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
import { renderBakasurInner } from '../bakasur/render'

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

/** Quiet follow amplitudes (Phase 10 owns interaction tuning). */
const FOLLOW_YAW_MAX = 18
const FOLLOW_PITCH_MAX = 14

let uidCounter = 0

const uid = `b${++uidCounter}`
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

function resolvedLook(): Look | null {
  const l = resolved.value.look
  return l ? { yaw: l.yaw, pitch: l.pitch, mix: l.mix, spin: 0, wander: 1 } : null
}

function redraw(at: number) {
  inner.value = renderBakasurInner(engine.sample(at), {
    size: props.size,
    uid,
    treatment: resolved.value.treatment,
    colours: theme.value
  })
}

applyIntent(0)
const inner = ref(
  renderBakasurInner(engine.sample(props.frozenAt ?? 0), {
    size: props.size,
    uid,
    treatment: resolved.value.treatment,
    colours: theme.value
  })
)

let raf = 0
let last = 0
let clock = 0
let isVisible = true
let observer: IntersectionObserver | null = null
let isListeningPointer = false
let cachedBox: DOMRect | null = null
let lastBoxTime = 0

function updateBox(el: HTMLElement | null): DOMRect | null {
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

function startLoop() {
  if (isStatic || raf !== 0 || !isVisible) return
  last = 0
  raf = requestAnimationFrame(tick)
  if (props.follow && !isListeningPointer) {
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
    isListeningPointer = true
  }
}

function stopLoop() {
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
  raf = requestAnimationFrame(tick)
  const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0
  last = ms
  clock += dt
  redraw(clock)
}

function onPointerMove(event: PointerEvent) {
  if (!props.follow || event.pointerType === 'touch' || !isVisible) return
  const el = document.getElementById(`bakasur-${uid}`)
  const box = updateBox(el)
  if (!box || box.width === 0 || box.height === 0) return
  const nx = (event.clientX - (box.left + box.width / 2)) / Math.max(120, window.innerWidth * 0.35)
  const ny = (event.clientY - (box.top + box.height / 2)) / Math.max(120, window.innerHeight * 0.35)
  engine.setLook(
    {
      yaw: Math.max(-1, Math.min(1, nx)) * FOLLOW_YAW_MAX,
      pitch: -Math.max(-1, Math.min(1, ny)) * FOLLOW_PITCH_MAX,
      mix: 1,
      spin: 0,
      wander: 0
    },
    clock
  )
}

function onPointerLeave() {
  // Release back to the RESOLVED gaze bias, not to neutral: alert keeps
  // staring after the pointer leaves.
  engine.setLook(resolvedLook(), clock)
}

watch(resolved, () => {
  applyIntent(clock)
  // Toujours repeindre : en direct la prochaine image rAF le ferait de toute
  // façon dans 16 ms ; immediat, le changement est deterministe et testable.
  redraw(isStatic ? (props.frozenAt ?? 0) : clock)
})

onMounted(() => {
  if (isStatic) return

  const el = document.getElementById(`bakasur-${uid}`)
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
    :id="`bakasur-${uid}`"
    :width="props.size"
    :height="props.size"
    :viewBox="`${-VB} ${-VB} ${VB * 2} ${VB * 2}`"
    role="img"
    :aria-label="props.label"
    v-html="inner"
  />
</template>
