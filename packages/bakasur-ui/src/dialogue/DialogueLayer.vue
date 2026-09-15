<!--
  BAKASUR-UI — Original Bakasur work (Phase 9).

  The cinematic dialogue surface: a translucent void plate with a soft
  violet edge — NOT a bubble. Position comes from anchors (% of the
  stage), reveal from the pure timeline, typography from one style table.
  Fully keyboard operable: the plate holds focus semantics, choices are
  real buttons, the text region is aria-live polite.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { ANCHOR_ZONES, DIALOGUE_SPEAKERS, PRESENTATION_STYLES } from './speakers'
import { dialogueStateAt } from './timeline'
import type { DialogueLine, DialogueSequence } from './types'

const props = withDefaults(
  defineProps<{
    seq: DialogueSequence
    /** Scene/dialogue time in seconds. */
    t: number
    /** Applied choices: lineId → next id. */
    choices?: Record<string, string>
    reduced?: boolean
    /** Stage width in px, used to scale typography down on narrow stages. */
    stageW?: number
    /** Hide the text entirely (scrubbing backwards before a line). */
    show?: boolean
  }>(),
  { choices: undefined, reduced: false, stageW: 800, show: true }
)

const emit = defineEmits<{ pick: [lineId: string, choiceId: string] }>()

const state = computed(() =>
  dialogueStateAt(props.seq, props.t, { reducedMotion: props.reduced, choices: props.choices })
)
const line = computed<DialogueLine | null>(() => state.value.line)
const style = computed(() => PRESENTATION_STYLES[line.value?.style ?? 'cinematic'])
const speaker = computed(() => DIALOGUE_SPEAKERS[line.value?.speaker ?? 'bakasur'])
const zone = computed(() => {
  const p = line.value?.position ?? 'below'
  return ANCHOR_ZONES[p] ?? ANCHOR_ZONES.below!
})
const customPos = computed(() => (line.value?.position === 'custom' && line.value.custom ? line.value.custom : null))

/** rem size scaled to the stage, floored for readability at 390 px. */
const fontPx = computed(() => {
  const base = 16 * style.value.size
  const k = Math.min(1, Math.max(0.72, props.stageW / 800))
  return Math.round(base * k)
})

const plateStyle = computed(() => {
  const z = zone.value
  const c = customPos.value
  const s: Record<string, string> = {
    fontSize: `${fontPx.value}px`,
    opacity: `${style.value.opacity}`,
    '--dlg-edge': `${style.value.edge}`
  }
  if (c) {
    s.left = `${Math.min(88, Math.max(2, c.x * 100 - 12))}%`
    s.bottom = `${Math.min(90, 100 - c.y * 100)}%`
    s.maxWidth = '64%'
  } else {
    if (z.top !== undefined) s.top = z.top
    if (z.bottom !== undefined) s.bottom = z.bottom
    s.left = z.left
    s.right = z.right
    s.maxWidth = z.maxWidth
  }
  return s
})

const entrance = computed(() => {
  const e = line.value?.entrance ?? 'fade'
  if (props.reduced || e === 'none') return ''
  return `dlg-${e}`
})

const visible = computed(() => props.show && line.value !== null && state.value.revealed.length > 0)

defineExpose({ state, total: computed(() => state.value.total) })
</script>

<template>
  <div v-if="visible" class="dlg" :style="plateStyle">
    <template v-if="line">
      <p
        :key="line.id"
        class="dlg-plate"
        :class="[`dlg--${style.id}`, line.speaker === 'user' ? 'dlg-user' : '', line.emphasis ? 'dlg-emph' : '', entrance]"
        :aria-live="line.speaker === 'bakasur' ? 'polite' : 'off'"
        :data-line="line.id"
      >
        <span v-if="line.speaker !== 'bakasur' || style.id === 'system'" class="dlg-speaker">{{ speaker.name }}</span>
        <span class="dlg-text">{{ state.revealed }}</span>
        <span v-if="!state.full" class="dlg-cursor" aria-hidden="true">▍</span>
      </p>
      <div v-if="line.choices?.length && state.waitingChoice" class="dlg-choices" role="group" aria-label="Choices">
        <button
          v-for="(c, i) in line.choices"
          :key="c.id"
          type="button"
          class="dlg-choice"
          :autofocus="i === 0"
          @click="emit('pick', line.id, c.id)"
        >
          {{ c.label }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dlg {
  position: absolute;
  z-index: 6;
  pointer-events: none;
  text-align: center;
  line-height: 1.4;
}
.dlg-plate {
  margin: 0 auto;
  display: inline-block;
  max-width: 100%;
  padding: 0.5em 1.1em;
  border-radius: 10px;
  color: #ece6fb;
  background: rgb(6 4 9 / 0.55);
  box-shadow:
    0 0 0 1px rgb(157 123 255 / calc(var(--dlg-edge) * 0.5)),
    0 0 calc(28px * var(--dlg-edge)) rgb(139 92 246 / calc(var(--dlg-edge) * 0.35));
  backdrop-filter: blur(6px);
  text-shadow: 0 1px 12px rgb(6 4 9 / 0.9);
}
@keyframes dlg-fade {
  from {
    opacity: 0;
  }
}
@keyframes dlg-rise {
  from {
    opacity: 0;
    translate: 0 10px;
  }
}
.dlg-fade {
  animation: dlg-fade 0.4s ease-out;
}
.dlg-rise {
  animation: dlg-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
.dlg--whisper {
  opacity: 0.85;
  letter-spacing: 0.01em;
}
.dlg--thought {
  font-style: italic;
  color: #d9cfee;
}
.dlg--system {
  font-family: ui-monospace, monospace;
  letter-spacing: 0.04em;
}
.dlg--alert {
  box-shadow:
    0 0 0 1px rgb(157 123 255 / 0.55),
    0 0 34px rgb(157 123 255 / 0.4);
}
.dlg-emph {
  font-weight: 650;
}
.dlg-user {
  color: #cfc4ec;
}
.dlg-speaker {
  display: block;
  font-size: 0.62em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a79fc4;
  margin-bottom: 0.25em;
}
.dlg-cursor {
  color: #9d7bff;
  animation: dlg-blink 0.9s steps(2, jump-none) infinite;
}
@keyframes dlg-blink {
  50% {
    opacity: 0;
  }
}
.dlg-choices {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 10px;
  pointer-events: auto;
  flex-wrap: wrap;
}
.dlg-choice {
  cursor: pointer;
  border: 1px solid rgb(157 123 255 / 0.45);
  border-radius: 999px;
  background: rgb(14 10 23 / 0.82);
  color: #ece6fb;
  font-size: 0.8em;
  padding: 0.5em 1.1em;
  min-height: 32px;
}
.dlg-choice:hover {
  border-color: #9d7bff;
  box-shadow: 0 0 16px rgb(139 92 246 / 0.4);
}
.dlg-choice:focus-visible {
  outline: 2px solid #9d7bff;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .dlg-cursor {
    animation: none;
  }
}
</style>
