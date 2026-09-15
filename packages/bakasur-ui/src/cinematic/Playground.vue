<!--
  BAKASUR-UI — Original Bakasur work (Phase 8).

  Scene playground: select scene → preview → scrub → inspect → switch
  viewport. Deliberately NOT another Lab: no editing, no saving — the
  scene catalogue is data, this surface only plays and inspects it.
-->
<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import SceneView from './SceneView.vue'
import { resolveSceneFrame } from './resolve'
import { getScene, listScenes } from './scenes'
import { getDialogueSequence, listDialogueSequences } from '../dialogue/sequences'
import { cueToResolved } from '../dialogue/reactions'
import { dialogueStateAt, scheduleSequence } from '../dialogue/timeline'
import { t } from '../i18n'

const props = withDefaults(
  defineProps<{ initialScene?: string | null }>(),
  { initialScene: null }
)

const sceneId = ref(props.initialScene ?? 'bakasur-awakening')
const scene = computed(() => getScene(sceneId.value))
const dlgId = ref<string | null>(null)
const dialogue = computed(() => (dlgId.value ? getDialogueSequence(dlgId.value) : null))
const dlgChoices = ref<Record<string, string>>({})
const time = ref(0)
const loop = ref(true)
const VIEWS = [
  { w: 1440, h: 900, name: '1440 × 900' },
  { w: 1024, h: 768, name: '1024 × 768' },
  { w: 768, h: 1024, name: '768 × 1024' },
  { w: 390, h: 844, name: '390 × 844' }
]

// Fenetre etroite : on commence sur la scene qui rentre, sinon le stage
// debase ferait defiler la page (le scroll de `.pg-scroll` est un filet,
// pas le layout par defaut).
const initialView =
  typeof window !== 'undefined' && window.innerWidth < 800
    ? VIEWS[3]!
    : typeof window !== 'undefined' && window.innerWidth < 1100
      ? VIEWS[2]!
      : { w: 960, h: 600, name: '960 × 600' }
const view = ref<{ w: number; h: number; name: string }>(initialView)
const stage = useTemplateRef<{ play: (from?: number) => void; pause: () => void; reset: () => void; seek: (t: number) => void }>('stage')

const frame = computed(() => resolveSceneFrame(scene.value, time.value))
const activeEffects = computed(() =>
  (Object.entries(frame.value.effects) as Array<[string, number]>).filter(([, v]) => Math.abs(v) > 0.001)
)

/** Dialogue state mirrored here for the inspector (the layer is in SceneView). */
const dlgState = computed(() =>
  dialogue.value ? dialogueStateAt(dialogue.value, time.value, { choices: dlgChoices.value }) : null
)
const dlgSchedule = computed(() =>
  dialogue.value ? scheduleSequence(dialogue.value, { choices: dlgChoices.value }) : null
)
const runTotal = computed(() => Math.max(scene.value.duration, dlgSchedule.value?.total ?? 0))
const dlgReaction = computed(() => {
  const cue = dlgState.value?.line?.reaction
  if (!cue) return '—'
  const r = cueToResolved(cue, 'bakasur')
  return `${cue.expression ?? cue.preset ?? r.animation} · ${r.animation}`
})

const cinematicMode = ref(false)

function toggleCinematicMode() {
  cinematicMode.value = !cinematicMode.value
}

function pick(id: string) {
  sceneId.value = id
  time.value = 0
}

function scrubTo(pct: number) {
  stage.value?.seek((pct / 100) * runTotal.value)
}

/** Next/previous: jump to the next line boundary. */
function step(dir: 1 | -1) {
  const marks = [...(dlgSchedule.value?.schedule.map((s) => s.start) ?? []), 0, scene.value.duration].sort((a, b) => a - b)
  const cur = time.value
  const next = dir === 1 ? marks.find((m) => m > cur + 0.01) : [...marks].reverse().find((m) => m < cur - 0.01)
  stage.value?.seek(next ?? (dir === 1 ? runTotal.value : 0))
}

function onChoice(lineId: string, choiceId: string) {
  const line = dialogue.value?.lines.find((l) => l.id === lineId)
  const c = line?.choices?.find((x) => x.id === choiceId)
  if (c) dlgChoices.value = { ...dlgChoices.value, [lineId]: c.next }
}
</script>

<template>
  <div class="pg" :class="{ 'pg-cinematic-mode': cinematicMode }">
    <h1 class="sr-only">{{ t('scene.title') }}</h1>
    <header class="pg-top">
      <a class="pg-back" href="#">{{ t('scene.back') }}</a>
      <p class="pg-name">{{ scene.name }}</p>
      <button type="button" class="pg-btn pg-mode-toggle" :aria-pressed="cinematicMode" @click="toggleCinematicMode">
        {{ cinematicMode ? 'Exit Presentation' : 'Cinematic Mode' }}
      </button>
      <div class="pg-scenes" role="group" :aria-label="t('scene.scenes')">
        <button
          v-for="s in listScenes()"
          :key="s.id"
          type="button"
          class="pg-chip"
          :aria-pressed="sceneId === s.id"
          :title="s.description"
          @click="pick(s.id)"
        >
          {{ s.name }}
        </button>
      </div>
      <div class="pg-scenes" role="group" :aria-label="t('scene.dialogue')">
        <button type="button" class="pg-chip" :aria-pressed="dlgId === null" @click="dlgId = null; dlgChoices = {}">
          {{ t('scene.noDialogue') }}
        </button>
        <button
          v-for="d in listDialogueSequences()"
          :key="d.id"
          type="button"
          class="pg-chip"
          :aria-pressed="dlgId === d.id"
          :title="d.description"
          @click="dlgId = d.id; dlgChoices = {}; stage?.reset()"
        >
          {{ d.name }}
        </button>
      </div>
    </header>

    <div class="pg-grid">
      <section class="pg-preview" :aria-label="scene.name">
        <div class="pg-scroll">
          <SceneView
            ref="stage"
            v-model:time="time"
            :scene-id="sceneId"
            :dialogue="dialogue"
            :interact="true"
            :loop="loop"
            :width="view.w"
            :height="view.h"
            @choice="onChoice"
          />
        </div>
        <div class="pg-transport" role="group" :aria-label="t('scene.time')">
          <button type="button" class="pg-btn" @click="stage?.pause(); stage?.play()">{{ t('scene.play') }}</button>
          <button type="button" class="pg-btn" @click="stage?.pause()">{{ t('scene.pause') }}</button>
          <button type="button" class="pg-btn" @click="stage?.reset()">{{ t('scene.reset') }}</button>
          <button v-if="dialogue" type="button" class="pg-btn" :aria-label="t('scene.next')" @click="step(1)">→</button>
          <button v-if="dialogue" type="button" class="pg-btn" :aria-label="t('scene.prev')" @click="step(-1)">←</button>
          <label class="pg-loop"><input v-model="loop" type="checkbox" /> {{ t('scene.loop') }}</label>
          <input
            class="pg-scrub"
            type="range"
            :min="0"
            :max="runTotal"
            :step="0.01"
            :value="time"
            :aria-label="t('scene.scrub')"
            @input="stage?.seek(($event.target as HTMLInputElement).valueAsNumber)"
          />
          <p class="pg-time" role="status">{{ time.toFixed(2) }} s / {{ runTotal.toFixed(2) }} s</p>
          <div class="pg-jumps" role="group">
            <button v-for="p in [0, 25, 50, 75, 100]" :key="p" type="button" class="pg-chip" @click="scrubTo(p)">
              {{ p }} %
            </button>
          </div>
        </div>
        <div class="pg-views" role="group" :aria-label="t('scene.viewport')">
          <button
            v-for="v in VIEWS"
            :key="v.name"
            type="button"
            class="pg-chip"
            :aria-pressed="view.name === v.name"
            @click="view = v"
          >
            {{ v.name }}
          </button>
        </div>
      </section>

      <aside class="pg-inspector" :aria-label="t('scene.inspector')">
        <h2>{{ t('scene.inspector') }}</h2>
        <p class="pg-desc">{{ scene.description }}</p>
        <dl>
          <div><dt>actor</dt><dd>{{ scene.actor.preset }} · {{ frame.actor.intent }} · {{ frame.actor.expression ?? 'resting' }}</dd></div>
          <div><dt>{{ t('scene.actorTheme') }}</dt><dd>{{ frame.actor.theme.id }}</dd></div>
          <div><dt>{{ t('scene.camera') }}</dt>
            <dd>x {{ frame.camera.x.toFixed(0) }} · y {{ frame.camera.y.toFixed(0) }} · ×{{ frame.camera.zoom.toFixed(2) }} · {{ frame.camera.rotation.toFixed(0) }}°</dd>
          </div>
          <div><dt>portal</dt>
            <dd>{{ frame.portal ? `op ${frame.portal.opacity.toFixed(2)} · int ${frame.portal.intensity.toFixed(2)} · ${frame.portalTheme.id}` : '—' }}</dd>
          </div>
          <div><dt>{{ t('scene.effects') }}</dt>
            <dd>{{ activeEffects.length ? activeEffects.map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · ') : '—' }}</dd>
          </div>
          <div><dt>particles</dt><dd>{{ frame.particles.length }}</dd></div>
          <div v-if="dlgState?.line">
            <dt>{{ t('scene.dialogue') }}</dt>
            <dd>{{ dlgState.line.id }} · {{ dlgReaction }}</dd>
          </div>
        </dl>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.pg {
  min-height: 100dvh;
  overflow-x: clip;
  background: #060409;
  color: #ece6fb;
  font-size: 14px;
  line-height: 1.45;
}
.pg :focus-visible {
  outline: 2px solid #9d7bff;
  outline-offset: 2px;
}
.pg-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #2b2350;
  flex-wrap: wrap;
}
.pg-back {
  color: #b3a8d6;
  font-size: 12px;
}
.pg-name {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
}
.pg-scenes {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-left: auto;
  min-width: 0;
}
@media (width < 64rem) {
  /* Sur etroit : une bande horizontale deroulable — les cinq puces ne
     rentrent jamais sur une ligne de 358 px, et le clip racine ne doit
     pas rendre la derniere inatteignable. */
  .pg-scenes {
    margin-left: 0;
    width: 100%;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }
}
.pg-grid {
  display: grid;
  gap: 16px;
  padding: 16px;
  max-width: 1600px;
  margin: 0 auto;
  grid-template-columns: 1fr;
}
@media (width >= 64rem) {
  .pg-grid {
    grid-template-columns: minmax(0, 1fr) 300px;
    align-items: start;
  }
}
.pg-preview {
  min-width: 0;
}
.pg-scroll {
  overflow: auto;
  border: 1px solid #2b2350;
  border-radius: 14px;
  max-width: 100%;
}
.pg-transport {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.pg-scrub {
  flex: 1 1 200px;
  accent-color: #9d7bff;
}
.pg-time {
  margin: 0;
  width: 100%;
  font-variant-numeric: tabular-nums;
  color: #b3a8d6;
  font-size: 12px;
}
.pg-jumps,
.pg-views {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pg-btn {
  cursor: pointer;
  border: 1px solid #2b2350;
  border-radius: 10px;
  background: #0e0a17;
  color: #ece6fb;
  padding: 7px 12px;
  font-size: 13px;
}
.pg-chip {
  cursor: pointer;
  border: 1px solid #2b2350;
  border-radius: 999px;
  background: transparent;
  color: #b3a8d6;
  padding: 4px 10px;
  font-size: 12px;
}
.pg-chip[aria-pressed='true'] {
  color: #0b0716;
  background: #9d7bff;
  border-color: #9d7bff;
}
.pg-loop {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #b3a8d6;
}
.pg-loop input {
  accent-color: #9d7bff;
}
.pg-inspector {
  border: 1px solid #2b2350;
  border-radius: 14px;
  background: #0e0a17;
  padding: 14px;
  min-width: 0;
}
.pg-inspector h2 {
  margin: 0 0 8px;
  font-size: 14px;
}
.pg-desc {
  margin: 0 0 10px;
  color: #b3a8d6;
  font-size: 12px;
}
.pg-inspector dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}
.pg-inspector dl > div {
  display: grid;
  grid-template-columns: 74px 1fr;
  gap: 8px;
}
.pg-inspector dt {
  color: #b3a8d6;
}
.pg-inspector dd {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
