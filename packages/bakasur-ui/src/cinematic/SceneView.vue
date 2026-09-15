<!--
  BAKASUR-UI — Original Bakasur work (Phase 8).

  CinematicScene runtime: resolves (scene, t) through the same pure
  pipeline the frozen renderer uses, then stages it — environment, portal
  and particles as SVG layers, the actor as the REAL animated BakasurBot.
  Camera transform is shared math (cover-fit + focal offset), computed in
  pixels for the actor box and as SVG transforms for the layers.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { r2 } from '../engine/math'
import { LabPlayback } from '../lab/playback'
import BakasurBot from '../runtime/BakasurBot.vue'
import DialogueLayer from '../dialogue/DialogueLayer.vue'
import { applyPersonality, cueToResolved, DEFAULT_RULES, findRule, nextState, type InteractionRule } from '../dialogue/reactions'
import { dialogueStateAt, endOfLine, scheduleSequence } from '../dialogue/timeline'
import type { DialogueEventType, DialogueInteractionState, DialogueSequence, ReactionCue } from '../dialogue/types'
import { cameraTransform, envLayer, lensLayer, particlesLayer, portalLayer } from './render'
import { frameViewport, resolveSceneFrame, validateScene } from './resolve'
import { getScene } from './scenes'
import type { CinematicScene } from './types'

const props = withDefaults(
  defineProps<{
    sceneId?: string
    sceneData?: CinematicScene | null
    autoplay?: boolean
    loop?: boolean
    width?: number
    height?: number
    frozenAt?: number
    /** Null = follow the OS setting live (like the rest of the app). */
    reduced?: boolean | null
    /** Optional dialogue layer: its reaction cues override the actor look. */
    dialogue?: DialogueSequence | null
    /** Opt-in pointer interaction (hover/click rules). */
    interact?: boolean
    /** Personality nudges for rules and dialogue reactions. */
    personality?: string | null
    /** Rule overrides; default DEFAULT_RULES. */
    rules?: InteractionRule[] | null
    /** Pointer follow through BakasurBot's existing gaze channel. */
    follow?: boolean
    label?: string
  }>(),
  {
    sceneId: 'bakasur-awakening',
    sceneData: null,
    autoplay: true,
    loop: true,
    width: 800,
    height: 500,
    frozenAt: undefined,
    reduced: null,
    dialogue: null,
    interact: false,
    personality: null,
    rules: null,
    follow: false,
    label: undefined
  }
)

const emit = defineEmits<{ complete: []; choice: [lineId: string, choiceId: string] }>()

/** Playhead in scene seconds; the playground binds and scrubs this. */
const time = defineModel<number>('time', { default: 0 })

const scene = computed<CinematicScene>(() => props.sceneData ?? getScene(props.sceneId))
const validation = computed(() => validateScene(scene.value))

const calmQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
const calm = ref(calmQuery?.matches ?? false)
calmQuery?.addEventListener?.('change', (e: MediaQueryListEvent) => {
  calm.value = e.matches
  if (e.matches) pause()
})
const reducedEff = computed(() => props.reduced ?? calm.value)
/** Frozen frame mode: explicit time OR caller-forced stillness. */
const isStatic = computed(() => props.frozenAt !== undefined)
const at = computed(() => (isStatic.value ? (props.frozenAt as number) : time.value))

const frame = computed(() => resolveSceneFrame(scene.value, at.value, { reducedMotion: reducedEff.value }))
const vp = computed(() => frameViewport(props.width, props.height))
const cover = computed(() => `translate(${r2(vp.value.tx)} ${r2(vp.value.ty)}) scale(${r2(vp.value.scale)})`)
const cam = computed(() => cameraTransform(frame.value))

let uidCounter = 0
const uid = `cx${++uidCounter}`

const theme = computed(() => frame.value.actor.theme)
const backParts = computed(() => frame.value.particles.filter((p) => !p.front))
const frontParts = computed(() => frame.value.particles.filter((p) => p.front))
const baseLayers = computed(() => {
  const f = frame.value
  return (
    envLayer(f, theme.value, uid) +
    particlesLayer(backParts.value, theme.value) +
    (f.portal ? portalLayer(f.portal, f.portalTheme, uid) : '')
  )
})
const frontLayers = computed(() => {
  const f = frame.value
  return particlesLayer(frontParts.value, theme.value) + lensLayer(f, theme.value, uid)
})

/** Actor stage box → pixels (cover, then camera, applied numerically). */
const BODY_FILL = 200 / 316
const actorBox = computed(() => {
  const f = frame.value
  const a = f.actor
  const c = f.camera
  const side = Math.max(0, a.scale / BODY_FILL)
  const rad = (c.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = (a.x - (400 + c.x)) * c.zoom
  const dy = (a.y - (250 + c.y)) * c.zoom
  const sx = 400 + dx * cos - dy * sin
  const sy = 250 + dx * sin + dy * cos
  const s = vp.value.scale
  return {
    left: vp.value.tx + s * sx - (side * s * c.zoom) / 2,
    top: vp.value.ty + s * sy - (side * s * c.zoom) / 2,
    size: side * s * c.zoom,
    opacity: Math.min(1, Math.max(0, a.opacity))
  }
})

const botFrozen = computed<number | undefined>(() => (isStatic.value ? at.value : undefined))

/* -------------------------------------------------------------- dialogue */

const dlgChoices = ref<Record<string, string>>({})
const dlgSchedule = computed(() =>
  props.dialogue ? scheduleSequence(props.dialogue, { reducedMotion: reducedEff.value, choices: dlgChoices.value }) : null
)
const dlgState = computed(() =>
  props.dialogue
    ? dialogueStateAt(props.dialogue, at.value, { reducedMotion: reducedEff.value, choices: dlgChoices.value })
    : null
)
/** A reaction cue is visible while its line plays (or held after a pick). */
const activeCue = computed<ReactionCue | null>(() => {
  const d = dlgState.value
  const per = props.personality ?? props.dialogue?.personality
  if (d?.line?.reaction) return per ? applyPersonality(d.line.reaction, per) : d.line.reaction
  return heldCue.value
})
const dlgResolved = computed(() => (activeCue.value ? cueToResolved(activeCue.value, 'bakasur') : null))
/** Actor bindings: cue wins, else the scene's own resolution. */
const actorExpr = computed<string | null | undefined>(() =>
  dlgResolved.value ? dlgResolved.value.expression : frame.value.actor.expression
)
const actorThemeId = computed(() => (dlgResolved.value ? dlgResolved.value.theme : frame.value.actor.theme.id))
const actorTreatment = computed(() =>
  dlgResolved.value ? { ...frame.value.actor.preset.treatment, ...dlgResolved.value.treatment } : frame.value.actor.preset.treatment
)
const actorIntent = computed(() => (dlgResolved.value ? dlgResolved.value.animation : frame.value.actor.intent))
/** A choice line that finished revealing: the playhead must stop. */
const waiting = computed(() => dlgState.value?.waitingChoice ?? false)

const heldCue = ref<ReactionCue | null>(null)
let holdTimer = 0
function dlgHold(cue: ReactionCue | null) {
  if (holdTimer) window.clearTimeout(holdTimer)
  heldCue.value = cue
  if (!cue) return
  holdTimer = window.setTimeout(() => {
    heldCue.value = null
    interState.value = nextState(interState.value, 'react:end')
  }, Math.max(0.6, cue.duration ?? 1.6) * 1000)
}
function pickChoice(lineId: string, choiceId: string) {
  const line = props.dialogue?.lines.find((l) => l.id === lineId)
  const choice = line?.choices?.find((c) => c.id === choiceId)
  if (!choice) return
  dlgChoices.value = { ...dlgChoices.value, [lineId]: choice.next }
  dlgHold(choice.reaction ?? null)
  emit('choice', lineId, choiceId)
  // Resume past the wait: the playhead jumps to the chosen line's start.
  const end = dlgSchedule.value ? endOfLine(dlgSchedule.value.schedule, lineId) : at.value
  seek(Math.min(end + 0.001, scene.value.duration))
  play(end + 0.001)
}

/* A choice line stops the playhead where it stands, until a pick. */
watch(waiting, (w) => {
  if (w) {
    if (playing.value) pause()
    interState.value = nextState(interState.value, 'choice')
  } else if (interState.value === 'waiting') {
    interState.value = nextState('waiting', 'choice:resolve')
  }
})

/* ----------------------------------------------------------- interaction */

/** Local interaction state, transitions from the table in reactions.ts. */
const interState = ref<DialogueInteractionState>('idle')

function applyRule(event: DialogueEventType) {
  const rule = findRule(props.rules ?? DEFAULT_RULES, event, interState.value)
  if (!rule) return
  interState.value = nextState(interState.value, event)
  const per = props.personality ?? props.dialogue?.personality
  dlgHold(per ? applyPersonality(rule.reaction, per) : rule.reaction)
}
function onStagePointerEnter() {
  if (props.interact) applyRule('pointerenter')
}
function onStagePointerLeave() {
  if (props.interact) applyRule('pointerleave')
}
function onStageClick() {
  if (props.interact) applyRule('click')
}

/* ------------------------------------------------------------ lecture */

/** Playback spans the scene AND its dialogue track, whichever is longer. */
const runLength = computed(() => Math.max(scene.value.duration, dlgSchedule.value?.total ?? 0))

const player = new LabPlayback()
const playing = ref(false)
let raf = 0
let completed = false

function tick(nowMs: number) {
  raf = requestAnimationFrame(tick)
  const { elapsed, ended } = player.tick(nowMs, runLength.value)
  if (ended) {
    if (props.loop && runLength.value > 0.05) {
      player.play(nowMs, 0)
      time.value = 0
      completed = false
    } else {
      time.value = runLength.value
      pause()
      if (!completed) {
        completed = true
        emit('complete')
      }
    }
    return
  }
  time.value = elapsed
}

function play(from?: number) {
  if (isStatic.value) return
  player.play(performance.now(), from ?? time.value)
  playing.value = true
  completed = false
  if (typeof requestAnimationFrame === 'function') {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(tick)
  }
}

function pause() {
  player.pause(performance.now())
  playing.value = false
  cancelAnimationFrame(raf)
}

function reset() {
  pause()
  player.reset()
  time.value = 0
  completed = false
  interState.value = 'idle'
}

function seek(t: number) {
  player.seek(Math.min(Math.max(0, t), runLength.value), performance.now())
  time.value = Math.min(Math.max(0, t), runLength.value)
}

watch(
  () => [props.sceneId, props.sceneData, props.frozenAt, props.dialogue],
  () => {
    dlgChoices.value = {}
    heldCue.value = null
    reset()
    if (props.autoplay && !isStatic.value && !reducedEff.value) play(0)
  }
)

onMounted(() => {
  if (props.autoplay && !isStatic.value && !reducedEff.value) play(0)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  if (holdTimer) window.clearTimeout(holdTimer)
})

defineExpose({ play, pause, reset, seek, playing, time, pickChoice })
</script>

<template>
  <div
    class="cx-stage"
    :style="{ width: `${props.width}px`, height: `${props.height}px` }"
    role="group"
    :aria-label="props.label ?? scene.name"
    @pointerenter="onStagePointerEnter"
    @pointerleave="onStagePointerLeave"
    @click="onStageClick"
  >
    <svg class="cx-layer" :width="props.width" :height="props.height" :viewBox="`0 0 ${props.width} ${props.height}`" aria-hidden="true">
      <g :transform="cover">
        <g :transform="cam" v-html="baseLayers" />
      </g>
    </svg>
    <div
      class="cx-actor"
      :style="{
        left: `${actorBox.left}px`,
        top: `${actorBox.top}px`,
        width: `${actorBox.size}px`,
        height: `${actorBox.size}px`,
        opacity: actorBox.opacity
      }"
    >
      <BakasurBot
        :state="actorIntent"
        :expression="actorExpr"
        :colour="actorThemeId"
        :treatment="actorTreatment"
        :size="Math.max(1, Math.round(actorBox.size))"
        :frozen-at="botFrozen"
        :follow="props.follow && !reducedEff"
        :label="scene.name"
      />
    </div>
    <svg class="cx-layer cx-front" :width="props.width" :height="props.height" :viewBox="`0 0 ${props.width} ${props.height}`" aria-hidden="true">
      <g :transform="cover">
        <g :transform="cam" v-html="frontLayers" />
      </g>
    </svg>
    <DialogueLayer
      v-if="props.dialogue"
      :seq="props.dialogue"
      :t="at"
      :choices="dlgChoices"
      :reduced="reducedEff"
      :stage-w="props.width"
      @pick="pickChoice"
    />
    <p v-if="!validation.ok" class="cx-warn" role="note">
      {{ validation.issues[0]?.message }}
    </p>
  </div>
</template>

<style scoped>
.cx-stage {
  position: relative;
  overflow: hidden;
  background: #060409;
  border-radius: 12px;
}
.cx-layer {
  position: absolute;
  inset: 0;
  display: block;
}
.cx-front {
  pointer-events: none;
}
.cx-actor {
  position: absolute;
  pointer-events: none;
}
.cx-actor :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
.cx-warn {
  position: absolute;
  left: 8px;
  bottom: 8px;
  margin: 0;
  font-size: 11px;
  color: #f0a8a8;
  background: rgb(0 0 0 / 0.6);
  padding: 2px 8px;
  border-radius: 6px;
}
</style>
