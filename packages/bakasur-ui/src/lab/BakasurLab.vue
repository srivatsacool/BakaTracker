<!--
  BAKASUR-UI — Original Bakasur work (Phase 7).

  Bakasur Lab: SELECT → COMPOSE → PREVIEW → PLAY → INSPECT → SAVE.
  The preview IS the real runtime (`BakasurBot`); thumbnails ARE the real
  renderer (`renderBakasurSvg` via `thumbSvg`). All state logic lives in
  `labState.ts` (pure, node-tested); this file only wires controls.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import BakasurBot from '../runtime/BakasurBot.vue'
import { BAKASUR_ANIMATIONS } from '../bakasur/animations'
import { BAKASUR_EXPRESSIONS } from '../bakasur/expressions'
import { BAKASUR_SHAPES } from '../bakasur/presets/shapes'
import { BAKASUR_THEMES } from '../bakasur/presets'
import type { BakasurPresetTreatment, BakasurTimelineStep, TimelineDirection } from '../bakasur/presets/types'
import { intentAt, normalizeBakasurTimeline } from '../bakasur/presets/timeline'
import { t } from '../i18n'
import { telecharge } from '../ui/capture'
import { useModalDialog } from '../ui/useModalDialog'
import { LabPlayback } from './playback'
import { resolveBakasurPreset } from '../bakasur/presets/validate'
import {
  EMPTY_FILTER,
  blankWorking,
  commitHistory,
  createHistory,
  filterEntries,
  inspectWorking,
  labEntries,
  loadUserPresets,
  parseUserPresetJson,
  redoHistory,
  saveUserPresets,
  serializeUserPreset,
  thumbSvg,
  undoHistory,
  userPresetId,
  validateWorking,
  workingFromPersonality,
  workingFromPreset,
  workingFromUserPreset,
  workingToInput,
  type LabEntry,
  type LabFilter,
  type LabHistory,
  type LabUserPreset,
  type LabWorking
} from './labState'

/* ------------------------------------------------------------------ etat */

const props = withDefaults(
  defineProps<{
    /** Deep link (`#lab&preset=bakasur-sleepy`) : preset ou personnalité initiale. */
    initialPreset?: string | null
  }>(),
  { initialPreset: null }
)

const initialWorking = (() => {
  if (props.initialPreset) {
    if (props.initialPreset.startsWith('personality:')) {
      const w = workingFromPersonality(props.initialPreset.slice('personality:'.length))
      if (w) return w
    } else {
      const w = workingFromPreset(props.initialPreset)
      if (w) return w
    }
  }
  return blankWorking()
})()

const history = ref<LabHistory>(createHistory(initialWorking))
const working = computed<LabWorking>(() => history.value.present)
const userPresets = ref<LabUserPreset[]>(loadUserPresets())
const filter = ref<LabFilter>({ ...EMPTY_FILTER })

const mode = ref<'live' | 'frozen'>('live')
const compare = ref<'off' | 'source' | 'baseline'>('off')
const labTime = ref(0)
const playing = ref(false)
const loop = ref(true)
const helpOpen = ref(false)
const importText = ref('')
const importError = ref<string | null>(null)
const helpDialog = useTemplateRef<HTMLDialogElement>('help-dialog')
useModalDialog(helpOpen, helpDialog)

/** `prefers-reduced-motion`, suivi (cf. App.vue) : fige l'aperçu, jamais les contrôles. */
const calmQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
const calm = ref(calmQuery?.matches ?? false)
function onCalmChange(e: MediaQueryListEvent) {
  calm.value = e.matches
  if (e.matches) pause()
}
calmQuery?.addEventListener?.('change', onCalmChange)

/* -------------------------------------------------------------- resolution */

const validation = computed(() => validateWorking(working.value))
const inspected = computed(() => inspectWorking(working.value))
const resolved = computed(() => inspected.value.resolved)
const timeline = computed(() => normalizeBakasurTimeline(working.value.timeline, resolved.value.animation))
const total = computed(() => Math.max(0.05, timeline.value.totalDuration))
const currentIntent = computed(() => intentAt(timeline.value, labTime.value))
const stepCount = computed(() => timeline.value.steps.length)

function stepIndexAt(t: number): number {
  const tl = timeline.value
  let within = Math.min(Math.max(0, t - tl.delay), Math.max(0.0001, tl.totalDuration * tl.repeat - 0.0001))
  const loopLen = Math.max(0.0001, tl.totalDuration)
  within = within % loopLen
  let acc = 0
  for (let i = 0; i < tl.steps.length; i++) {
    acc += tl.steps[i]!.duration + tl.steps[i]!.hold
    if (within < acc) return i
    acc += tl.transition
    if (within < acc) return i
  }
  return tl.steps.length - 1
}
const currentStep = computed(() => stepIndexAt(labTime.value))

const frozenPreview = computed(() => mode.value === 'frozen' || calm.value)
const faceProp = computed<string | null | undefined>(() =>
  working.value.faceMode === 'auto' ? undefined : working.value.faceMode === 'none' ? null : working.value.expression
)
const treatmentProp = computed<BakasurPresetTreatment | undefined>(
  () => workingToInput(working.value).treatment
)

/* ------------------------------------------------------------------ lecture */

const player = new LabPlayback()
let raf = 0

function frame(nowMs: number) {
  raf = requestAnimationFrame(frame)
  const { elapsed, ended } = player.tick(nowMs, total.value)
  if (ended) {
    if (loop.value && total.value > 0.05) {
      player.play(nowMs, 0)
      labTime.value = 0
    } else {
      pause()
      labTime.value = total.value
    }
    return
  }
  labTime.value = elapsed
}

function play(from?: number) {
  if (calm.value) return
  player.play(performance.now(), from ?? labTime.value)
  playing.value = true
  if (typeof requestAnimationFrame === 'function') {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(frame)
  }
}

function pause() {
  player.pause(performance.now())
  playing.value = false
  cancelAnimationFrame(raf)
}

function toggle() {
  if (playing.value) pause()
  else play(labTime.value >= total.value ? 0 : undefined)
}

function reset() {
  pause()
  player.reset()
  labTime.value = 0
}

function scrub(to: number) {
  player.seek(Math.min(Math.max(0, to), total.value), performance.now())
  labTime.value = Math.min(Math.max(0, to), total.value)
}

watch(total, (d) => {
  if (labTime.value > d) scrub(d)
})

/* ------------------------------------------------------------ comparaison */

const sourceInput = computed(() => {
  const src = working.value.sourceId
  if (src?.startsWith('personality:')) {
    const w = workingFromPersonality(src.slice('personality:'.length))
    if (w) return workingToInput(w)
  } else if (src) {
    const w = workingFromPreset(src)
    if (w) return workingToInput(w)
  }
  return workingToInput({ ...working.value, animation: 'idle' })
})

/** La cible comparée, résolue par le même pipeline (jamais un second dessin). */
const compareResolved = computed(() =>
  compare.value === 'baseline'
    ? resolveBakasurPreset({ animation: 'idle' })
    : resolveBakasurPreset(sourceInput.value)
)
const compareIntent = computed(() => intentAt(compareResolved.value.timeline, labTime.value))
const compareFace = computed<string | null | undefined>(() => {
  const e = compareResolved.value.expression
  return e === null ? null : (e ?? undefined)
})

/* -------------------------------------------------------------- catalogue */

const entries = computed<LabEntry[]>(() => labEntries())
const filtered = computed(() => filterEntries(entries.value, filter.value))
const thumbs = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  for (const e of entries.value) {
    const input =
      e.kind === 'personality'
        ? (() => {
            const w = workingFromPersonality(e.id.slice('personality:'.length))
            return w ? workingToInput(w) : { animation: 'idle' }
          })()
        : (() => {
            const w = workingFromPreset(e.id)
            return w ? workingToInput(w) : { animation: 'idle' }
          })()
    out[e.id] = thumbSvg(input, 56, `lab-${e.kind}-${e.id.replace(/[^a-z0-9]+/gi, '-')}`)
  }
  for (const p of userPresets.value) out[`user:${p.id}`] = thumbSvg(p.input, 56, `lab-user-${p.id}`)
  return out
})

const faceThumbs = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  for (const f of BAKASUR_EXPRESSIONS) {
    out[f.bakasurId] = thumbSvg({ animation: 'idle', expression: f.bakasurId }, 56, `lab-face-${f.bakasurId}`)
  }
  return out
})

const animThumbs = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  for (const a of BAKASUR_ANIMATIONS) {
    out[a.intent] = thumbSvg({ animation: a.intent }, 48, `lab-anim-${a.intent}`)
  }
  return out
})

const themeThumbs = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  const base = workingToInput(working.value)
  for (const id of Object.keys(BAKASUR_THEMES)) {
    out[id] = thumbSvg({ ...base, theme: id }, 48, `lab-theme-${id}`)
  }
  return out
})

function loadEntry(e: LabEntry) {
  const w =
    e.kind === 'personality'
      ? workingFromPersonality(e.id.slice('personality:'.length))
      : workingFromPreset(e.id)
  if (w) {
    history.value = commitHistory(history.value, w)
    reset()
  }
}

/* --------------------------------------------------------------- mutations */

function update(mut: (draft: LabWorking) => void) {
  // Clone JSON et pas `structuredClone` : le présent est un proxy réactif, que
  // le clonage structuré refuse — et le modèle est sérialisable par contrat.
  const draft = JSON.parse(JSON.stringify(history.value.present)) as LabWorking
  mut(draft)
  // Toute retouche manuelle rompt le lien source : le préréglé devient custom.
  history.value = commitHistory(history.value, { ...draft, sourceId: null })
}

/** Champs méta hors historique (nom, description, étiquettes). */
function setMeta(patch: Partial<Pick<LabWorking, 'name' | 'description' | 'tags'>>) {
  history.value = { ...history.value, present: { ...history.value.present, ...patch } }
}

function undo() {
  history.value = undoHistory(history.value)
}
function redo() {
  history.value = redoHistory(history.value)
}

function addStep() {
  update((d) => {
    const steps = [...(d.timeline?.steps ?? [{ intent: d.animation, duration: 2 }]), { intent: d.animation, duration: 1 }]
    d.timeline = { ...d.timeline, steps }
  })
}

function removeStep(i: number) {
  update((d) => {
    const steps = (d.timeline?.steps ?? []).filter((_, j) => j !== i)
    d.timeline = steps.length ? { ...d.timeline, steps } : null
  })
}

function moveStep(i: number, dir: -1 | 1) {
  update((d) => {
    const steps = [...(d.timeline?.steps ?? [])]
    const j = i + dir
    if (j < 0 || j >= steps.length) return
    const [s] = steps.splice(i, 1)
    steps.splice(j, 0, s!)
    d.timeline = { ...d.timeline, steps }
  })
}

/* ------------------------------------------------------ persistance locale */

function persistUsers() {
  saveUserPresets(userPresets.value)
}

function saveAsNew() {
  if (!validation.value.ok) return
  const w = working.value
  const preset: LabUserPreset = {
    id: userPresetId(w.name, userPresets.value),
    name: w.name,
    description: w.description,
    tags: [...w.tags],
    input: workingToInput(w)
  }
  userPresets.value = [...userPresets.value, preset]
  persistUsers()
}

function duplicateWorking() {
  update((d) => {
    d.name = `${d.name} (copie)`
  })
}

function loadUser(p: LabUserPreset) {
  history.value = commitHistory(history.value, workingFromUserPreset(p))
  reset()
}

function removeUser(id: string) {
  userPresets.value = userPresets.value.filter((p) => p.id !== id)
  persistUsers()
}

function exportWorking() {
  if (!validation.value.ok) return
  const w = working.value
  const preset: LabUserPreset = {
    id: userPresetId(w.name, userPresets.value),
    name: w.name,
    description: w.description,
    tags: [...w.tags],
    input: workingToInput(w)
  }
  telecharge(new Blob([serializeUserPreset(preset)], { type: 'application/json' }), `${preset.id}.json`)
}

function importFromText() {
  const r = parseUserPresetJson(importText.value)
  if (!r.ok || !r.preset) {
    importError.value = r.issues.join(' ')
    return
  }
  importError.value = null
  importText.value = ''
  const p: LabUserPreset = { ...r.preset, id: userPresetId(r.preset.name, userPresets.value) }
  userPresets.value = [...userPresets.value, p]
  persistUsers()
  loadUser(p)
}

function importFromFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    importText.value = typeof reader.result === 'string' ? reader.result : ''
    importFromText()
  }
  reader.readAsText(file)
}

/* ----------------------------------------------------------------- clavier */

function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) {
    return
  }
  if (e.code === 'Space') {
    if (el && el.tagName === 'BUTTON') return
    e.preventDefault()
    toggle()
  } else if (e.key === 'r' || e.key === 'R') {
    reset()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    pause()
    scrub(labTime.value - (e.shiftKey ? 1 : 0.1))
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    pause()
    scrub(labTime.value + (e.shiftKey ? 1 : 0.1))
  } else if (e.key === 'Home') {
    e.preventDefault()
    scrub(0)
  } else if (e.key === 'End') {
    e.preventDefault()
    scrub(total.value)
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  cancelAnimationFrame(raf)
  calmQuery?.removeEventListener?.('change', onCalmChange)
})

/* -------------------------------------------------------------------Divers */

/** Libellé d'intention : `t('states.x')` existe pour les 15, repli sur l'id. */
const animLabel = (id: string): string => t(`states.${id}` as 'states.idle')

const faceRow = computed(() => inspected.value.rows.find((r) => r.axis === 'expression'))

/**
 * Accès en écriture au montage brut : matérialise les plans depuis la forme
 * normalisée quand l'utilisateur part du défaut (timeline null).
 */
function tl(d: LabWorking): { steps: BakasurTimelineStep[] } & Omit<NonNullable<LabWorking['timeline']>, 'steps'> {
  const norm = normalizeBakasurTimeline(d.timeline, resolved.value.animation)
  if (!d.timeline?.steps?.length) {
    d.timeline = {
      ...d.timeline,
      steps: norm.steps.map((s) => ({ intent: s.intent, duration: s.duration, hold: s.hold })),
      repeat: norm.repeat,
      direction: norm.direction,
      delay: norm.delay,
      transition: norm.transition
    }
  }
  const raw = d.timeline!
  return { ...raw, steps: raw.steps as BakasurTimelineStep[] }
}

function stepAt(d: LabWorking, i: number): BakasurTimelineStep {
  const steps = tl(d).steps
  const s = steps[i]
  if (!s) throw new Error(`Lab: missing timeline step ${i}`)
  return s
}
</script>

<template>
  <div class="lab">
    <h1 class="sr-only">{{ t('lab.title') }}</h1>

    <header class="lab-top">
      <a class="lab-back" href="#">{{ t('lab.back') }}</a>
      <p class="lab-name" aria-live="polite">{{ working.name }}</p>
      <div class="lab-top-actions">
        <button type="button" class="lab-btn" :disabled="!history.past.length" @click="undo">
          {{ t('lab.undo') }}
        </button>
        <button type="button" class="lab-btn" :disabled="!history.future.length" @click="redo">
          {{ t('lab.redo') }}
        </button>
        <button type="button" class="lab-btn" @click="helpOpen = true">{{ t('lab.shortcuts') }}</button>
      </div>
    </header>

    <div class="lab-grid">
      <!-- Centre en premier dans le DOM : prioritaire sur mobile. -->
      <section class="lab-preview" :aria-label="t('lab.preview')">
        <div class="lab-stage">
          <BakasurBot
            :state="currentIntent"
            :expression="faceProp"
            :colour="working.theme"
            :treatment="treatmentProp"
            :size="296"
            :frozen-at="frozenPreview ? labTime : undefined"
            :follow="!frozenPreview"
            :label="working.name"
          />
          <BakasurBot
            v-if="compare !== 'off'"
            :state="compareIntent"
            :expression="compareFace"
            :colour="compareResolved.theme"
            :treatment="compareResolved.treatment"
            :size="160"
            :frozen-at="labTime"
            :label="compare === 'baseline' ? t('lab.baseline') : (working.sourceId ?? 'idle')"
          />
        </div>

        <div class="lab-transport" role="group" :aria-label="t('lab.timeline')">
          <button type="button" class="lab-btn lab-primary" @click="toggle">
            {{ playing ? t('lab.pause') : t('lab.play') }}
          </button>
          <button type="button" class="lab-btn" @click="reset">{{ t('lab.reset') }}</button>
          <label class="lab-mode">
            <input v-model="mode" type="radio" value="live" :disabled="calm" />
            {{ t('lab.live') }}
          </label>
          <label class="lab-mode">
            <input v-model="mode" type="radio" value="frozen" />
            {{ t('lab.frozen') }}
          </label>
          <input
            class="lab-scrub"
            type="range"
            :min="0"
            :max="total"
            :step="0.01"
            :value="labTime"
            :aria-label="t('lab.timeline')"
            @input="scrub(($event.target as HTMLInputElement).valueAsNumber)"
          />
          <p class="lab-time" role="status">
            {{ labTime.toFixed(2) }} s / {{ total.toFixed(2) }} s · {{ t('lab.step') }} {{ currentStep + 1 }}/{{ stepCount }}
          </p>
          <div class="lab-jumps" role="group" :aria-label="t('lab.frozen')">
            <button v-for="p in [0, 25, 50, 75, 100]" :key="p" type="button" class="lab-chip" @click="scrub((p / 100) * total)">
              {{ p }} %
            </button>
          </div>
        </div>
      </section>

      <div class="lab-left">
        <details class="lab-panel" open>
          <summary>{{ t('lab.presets') }}</summary>
          <div class="lab-panel-body">
            <input v-model="filter.query" type="search" :placeholder="t('lab.search')" :aria-label="t('lab.search')" />
            <div class="lab-filters" role="group" :aria-label="t('lab.group')">
              <select v-model="filter.group" :aria-label="t('lab.group')">
                <option value="all">{{ t('lab.all') }}</option>
                <option value="core">Core</option>
                <option value="reaction">Reaction</option>
                <option value="system">System</option>
                <option value="cinematic">Cinematic</option>
                <option value="personality">Personality</option>
              </select>
              <select v-model="filter.theme" :aria-label="t('lab.theme')">
                <option value="">{{ t('lab.all') }}</option>
                <option v-for="(th, id) in BAKASUR_THEMES" :key="id" :value="id">{{ th.name }}</option>
              </select>
              <select v-model="filter.animation" :aria-label="t('lab.animation')">
                <option value="">{{ t('lab.all') }}</option>
                <option v-for="a in BAKASUR_ANIMATIONS" :key="a.intent" :value="a.intent">
                  {{ animLabel(a.intent) }}
                </option>
              </select>
            </div>
            <ul class="lab-entries">
              <li v-for="e in filtered" :key="`${e.kind}:${e.id}`">
                <button
                  type="button"
                  class="lab-entry"
                  :aria-current="working.sourceId === e.id ? 'true' : undefined"
                  @click="loadEntry(e)"
                >
                  <span class="lab-thumb" v-html="thumbs[e.id]" />
                  <span class="lab-entry-text">
                    <strong>{{ e.name }}</strong>
                    <small>{{ e.description }}</small>
                  </span>
                </button>
              </li>
            </ul>
            <h3>{{ t('lab.userModels') }} ({{ userPresets.length }})</h3>
            <ul class="lab-entries">
              <li v-for="p in userPresets" :key="p.id" class="lab-user">
                <button type="button" class="lab-entry" @click="loadUser(p)">
                  <span class="lab-thumb" v-html="thumbs[`user:${p.id}`]" />
                  <span class="lab-entry-text">
                    <strong>{{ p.name }}</strong>
                    <small>{{ p.description }}</small>
                  </span>
                </button>
                <button type="button" class="lab-chip" @click="removeUser(p.id)">{{ t('lab.removeStep') }}</button>
              </li>
            </ul>
          </div>
        </details>

        <details class="lab-panel">
          <summary>{{ t('lab.expression') }}</summary>
          <div class="lab-panel-body">
            <div class="lab-seg" role="group" :aria-label="t('lab.expression')">
              <button
                v-for="m in (['auto', 'set', 'none'] as const)"
                :key="m"
                type="button"
                class="lab-chip"
                :aria-pressed="working.faceMode === m"
                @click="update((d) => { d.faceMode = m })"
              >
                {{ m }}
              </button>
            </div>
            <p v-if="faceRow?.status === 'ignored'" class="lab-warn" role="note">
              {{ t('lab.fixedFace') }}
            </p>
            <ul class="lab-faces">
              <li v-for="f in BAKASUR_EXPRESSIONS" :key="f.bakasurId">
                <button
                  type="button"
                  class="lab-face"
                  :aria-pressed="working.faceMode === 'set' && working.expression === f.bakasurId"
                  :title="f.meta.blurb"
                  @click="update((d) => { d.faceMode = 'set'; d.expression = f.bakasurId })"
                >
                  <span class="lab-thumb" v-html="faceThumbs[f.bakasurId]" />
                  <span>{{ f.bakasurId }}</span>
                </button>
              </li>
            </ul>
          </div>
        </details>

        <details class="lab-panel">
          <summary>{{ t('lab.animation') }}</summary>
          <div class="lab-panel-body">
            <ul class="lab-anims">
              <li v-for="a in BAKASUR_ANIMATIONS" :key="a.intent">
                <button
                  type="button"
                  class="lab-entry"
                  :aria-pressed="working.animation === a.intent"
                  @click="update((d) => { d.animation = a.intent })"
                >
                  <span class="lab-thumb" v-html="animThumbs[a.intent]" />
                  <span class="lab-entry-text">
                    <strong>{{ animLabel(a.intent) }}</strong>
                    <small>{{ a.disposition }} · {{ a.vehicle }}</small>
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </details>

        <details class="lab-panel">
          <summary>{{ t('lab.colour') }}</summary>
          <div class="lab-panel-body">
            <ul class="lab-themes">
              <li v-for="(th, id) in BAKASUR_THEMES" :key="id">
                <button
                  type="button"
                  class="lab-entry"
                  :aria-pressed="working.theme === id"
                  @click="update((d) => { d.theme = id })"
                >
                  <span class="lab-thumb" v-html="themeThumbs[id]" />
                  <span class="lab-entry-text">
                    <strong>{{ th.name }}</strong>
                    <small>{{ th.description }}</small>
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </details>
      </div>

      <div class="lab-right">
        <details class="lab-panel" open>
          <summary>{{ t('lab.timeline') }}</summary>
          <div class="lab-panel-body">
            <ol class="lab-steps">
              <li v-for="(s, i) in timeline.steps" :key="i" :aria-current="currentStep === i ? 'step' : undefined">
                <span class="lab-step-n">{{ t('lab.step') }} {{ i + 1 }}</span>
                <select
                  :value="s.intent"
                  :aria-label="`${t('lab.step')} ${i + 1} ${t('lab.animation')}`"
                  @change="update((d) => { stepAt(d, i).intent = ($event.target as HTMLSelectElement).value })"
                >
                  <option v-for="a in BAKASUR_ANIMATIONS" :key="a.intent" :value="a.intent">
                    {{ animLabel(a.intent) }}
                  </option>
                </select>
                <label>
                  {{ t('lab.duration') }}
                  <input
                    type="number"
                    :value="s.duration"
                    min="0.1"
                    max="30"
                    step="0.1"
                    @change="update((d) => { stepAt(d, i).duration = ($event.target as HTMLInputElement).valueAsNumber })"
                  />
                </label>
                <label>
                  {{ t('lab.hold') }}
                  <input
                    type="number"
                    :value="s.hold"
                    min="0"
                    max="10"
                    step="0.1"
                    @change="update((d) => { stepAt(d, i).hold = ($event.target as HTMLInputElement).valueAsNumber })"
                  />
                </label>
                <button type="button" class="lab-chip" :disabled="i === 0" @click="moveStep(i, -1)" aria-label="↑">↑</button>
                <button
                  type="button"
                  class="lab-chip"
                  :disabled="i === timeline.steps.length - 1"
                  aria-label="↓"
                  @click="moveStep(i, 1)"
                >
                  ↓
                </button>
                <button type="button" class="lab-chip" @click="removeStep(i)">{{ t('lab.removeStep') }}</button>
              </li>
            </ol>
            <button type="button" class="lab-btn" @click="addStep">{{ t('lab.addStep') }}</button>
            <div class="lab-tl-params">
              <label>
                {{ t('lab.delay') }}
                <input
                  type="number"
                  :value="timeline.delay"
                  min="0"
                  max="10"
                  step="0.1"
                  @change="update((d) => { tl(d).delay = ($event.target as HTMLInputElement).valueAsNumber })"
                />
              </label>
              <label>
                {{ t('lab.transition') }}
                <input
                  type="number"
                  :value="timeline.transition"
                  min="0"
                  max="5"
                  step="0.1"
                  @change="update((d) => { tl(d).transition = ($event.target as HTMLInputElement).valueAsNumber })"
                />
              </label>
              <label>
                {{ t('lab.repeat') }}
                <input
                  type="number"
                  :value="timeline.repeat"
                  min="1"
                  max="99"
                  step="1"
                  @change="update((d) => { tl(d).repeat = Math.round(($event.target as HTMLInputElement).valueAsNumber) })"
                />
              </label>
              <label>
                {{ t('lab.direction') }}
                <select
                  :value="timeline.direction"
                  @change="update((d) => { tl(d).direction = ($event.target as HTMLSelectElement).value as TimelineDirection })"
                >
                  <option value="forward">forward</option>
                  <option value="reverse">reverse</option>
                  <option value="alternate">alternate</option>
                </select>
              </label>
              <button
                v-if="working.timeline"
                type="button"
                class="lab-chip"
                @click="update((d) => { d.timeline = null })"
              >
                {{ t('lab.reset') }}
              </button>
            </div>
          </div>
        </details>

        <details class="lab-panel">
          <summary>{{ t('lab.treatment') }}</summary>
          <div class="lab-panel-body">
            <label class="lab-slider">
              glow · {{ working.treatment.glow.toFixed(2) }}
              <input
                type="range"
                :value="working.treatment.glow"
                min="0.5"
                max="2"
                step="0.05"
                @input="update((d) => { d.treatment.glow = ($event.target as HTMLInputElement).valueAsNumber })"
              />
            </label>
            <label class="lab-slider">
              dim · {{ working.treatment.dim.toFixed(2) }}
              <input
                type="range"
                :value="working.treatment.dim"
                min="0"
                max="0.6"
                step="0.01"
                @input="update((d) => { d.treatment.dim = ($event.target as HTMLInputElement).valueAsNumber })"
              />
            </label>
            <div class="lab-seg" role="group" aria-label="gaze">
              <button
                v-for="m in (['intent', 'release', 'custom'] as const)"
                :key="m"
                type="button"
                class="lab-chip"
                :aria-pressed="working.treatment.lookMode === m"
                @click="update((d) => { d.treatment.lookMode = m })"
              >
                {{ m }}
              </button>
            </div>
            <template v-if="working.treatment.lookMode === 'custom'">
              <label class="lab-slider">
                yaw · {{ working.treatment.yaw }}
                <input
                  type="range"
                  :value="working.treatment.yaw"
                  min="-20"
                  max="20"
                  step="1"
                  @input="update((d) => { d.treatment.yaw = ($event.target as HTMLInputElement).valueAsNumber })"
                />
              </label>
              <label class="lab-slider">
                pitch · {{ working.treatment.pitch }}
                <input
                  type="range"
                  :value="working.treatment.pitch"
                  min="-20"
                  max="20"
                  step="1"
                  @input="update((d) => { d.treatment.pitch = ($event.target as HTMLInputElement).valueAsNumber })"
                />
              </label>
              <label class="lab-slider">
                mix · {{ working.treatment.mix.toFixed(2) }}
                <input
                  type="range"
                  :value="working.treatment.mix"
                  min="0"
                  max="1"
                  step="0.05"
                  @input="update((d) => { d.treatment.mix = ($event.target as HTMLInputElement).valueAsNumber })"
                />
              </label>
            </template>
            <div class="lab-shapes" role="group" aria-label="shape">
              <button
                v-for="(sh, id) in BAKASUR_SHAPES"
                :key="id"
                type="button"
                class="lab-chip"
                :aria-pressed="working.shape === id"
                :title="sh.description"
                @click="update((d) => { d.shape = id })"
              >
                {{ sh.name }}
              </button>
            </div>
          </div>
        </details>

        <details class="lab-panel" open>
          <summary>{{ t('lab.inspector') }}</summary>
          <div class="lab-panel-body">
            <p v-if="validation.ok" class="lab-ok" role="status">✓ {{ t('lab.valid') }}</p>
            <ul v-else class="lab-issues" role="alert">
              <li v-for="(issue, i) in validation.issues" :key="i">
                <strong>{{ issue.field }}</strong> · {{ issue.message }}
              </li>
            </ul>
            <table class="lab-table">
              <thead>
                <tr>
                  <th scope="col">axis</th>
                  <th scope="col">{{ t('lab.selected') }}</th>
                  <th scope="col">{{ t('lab.resolved') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in inspected.rows" :key="row.axis">
                  <th scope="row">{{ row.axis }}</th>
                  <td>{{ row.selected }}</td>
                  <td>
                    {{ row.resolved }}
                    <small v-if="row.reason" class="lab-reason">{{ row.reason }}</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>

        <details class="lab-panel" open>
          <summary>{{ t('lab.saveAs') }}</summary>
          <div class="lab-panel-body">
            <label>
              name
              <input type="text" :value="working.name" @input="setMeta({ name: ($event.target as HTMLInputElement).value })" />
            </label>
            <label>
              description
              <input
                type="text"
                :value="working.description"
                @input="setMeta({ description: ($event.target as HTMLInputElement).value })"
              />
            </label>
            <div class="lab-save-row">
              <button type="button" class="lab-btn lab-primary" :disabled="!validation.ok" :title="validation.ok ? '' : t('lab.saveBlocked')" @click="saveAsNew">
                {{ t('lab.saveAs') }}
              </button>
              <button type="button" class="lab-btn" @click="duplicateWorking">{{ t('lab.duplicate') }}</button>
              <button type="button" class="lab-btn" :disabled="!validation.ok" @click="exportWorking">
                {{ t('lab.export') }}
              </button>
            </div>
            <label class="lab-compare">
              {{ t('lab.compare') }}
              <select v-model="compare">
                <option value="off">off</option>
                <option value="source">source</option>
                <option value="baseline">{{ t('lab.baseline') }}</option>
              </select>
            </label>
            <label>
              {{ t('lab.import') }}
              <textarea
                v-model="importText"
                rows="3"
                placeholder='{"animation": "idle"}'
                aria-describedby="lab-import-err"
              />
            </label>
            <p v-if="importError" id="lab-import-err" class="lab-issues" role="alert">{{ importError }}</p>
            <div class="lab-save-row">
              <button type="button" class="lab-btn" :disabled="!importText.trim()" @click="importFromText">
                {{ t('lab.import') }}
              </button>
              <label class="lab-btn">
                file…
                <input type="file" accept="application/json,.json" class="sr-only" @change="importFromFile" />
              </label>
            </div>
          </div>
        </details>
      </div>
    </div>

    <dialog ref="help-dialog" class="lab-dialog" @close="helpOpen = false">
      <h2>{{ t('lab.shortcuts') }}</h2>
      <ul>
        <li><kbd>Space</kbd> — {{ t('lab.play') }}/{{ t('lab.pause') }}</li>
        <li><kbd>R</kbd> — {{ t('lab.reset') }}</li>
        <li><kbd>←</kbd>/<kbd>→</kbd> — ±0.1 s (⇧ ±1 s)</li>
        <li><kbd>Home</kbd>/<kbd>End</kbd> — {{ t('lab.timeline') }}</li>
      </ul>
      <button type="button" class="lab-btn" @click="helpOpen = false">{{ t('lab.close') }}</button>
    </dialog>
  </div>
</template>

<style scoped>
.lab {
  --lab-bg: #060409;
  --lab-panel: #0e0a17;
  --lab-line: #2b2350;
  --lab-text: #ece6fb;
  --lab-muted: #b3a8d6;
  --lab-accent: #9d7bff;
  min-height: 100dvh;
  overflow-x: clip;
  background: var(--lab-bg);
  color: var(--lab-text);
  font-size: 14px;
  line-height: 1.45;
}
.lab :focus-visible {
  outline: 2px solid var(--lab-accent);
  outline-offset: 2px;
}
.lab-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--lab-line);
}
.lab-back {
  color: var(--lab-muted);
  font-size: 12px;
}
.lab-name {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lab-top-actions {
  display: flex;
  gap: 8px;
}
.lab-grid {
  display: grid;
  gap: 16px;
  padding: 16px;
  grid-template-columns: 1fr;
  grid-template-areas: 'preview' 'left' 'right';
  max-width: 1600px;
  margin: 0 auto;
}
.lab-preview {
  grid-area: preview;
  min-width: 0;
}
.lab-left {
  grid-area: left;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.lab-right {
  grid-area: right;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
@media (width >= 64rem) {
  .lab-grid {
    grid-template-columns: 300px minmax(0, 1fr) 330px;
    grid-template-areas: 'left preview right';
    align-items: start;
  }
  /* Sur grand écran les panneaux sont des sections : toujours ouverts. */
  .lab-panel > summary {
    pointer-events: none;
    list-style: none;
  }
  .lab-panel > summary::-webkit-details-marker {
    display: none;
  }
  .lab-panel > summary::marker {
    content: none;
  }
  .lab-panel:not([open]) > :not(summary) {
    display: block;
  }
}
.lab-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-height: 340px;
  border: 1px solid var(--lab-line);
  border-radius: 16px;
  background: radial-gradient(120% 90% at 50% 10%, #141021 0%, var(--lab-bg) 70%);
  padding: 16px;
  flex-wrap: wrap;
}
.lab-transport {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.lab-scrub {
  flex: 1 1 200px;
  accent-color: var(--lab-accent);
}
.lab-time {
  margin: 0;
  font-variant-numeric: tabular-nums;
  color: var(--lab-muted);
  font-size: 12px;
  width: 100%;
}
.lab-jumps {
  display: flex;
  gap: 6px;
}
.lab-btn {
  cursor: pointer;
  border: 1px solid var(--lab-line);
  border-radius: 10px;
  background: var(--lab-panel);
  color: var(--lab-text);
  padding: 7px 12px;
  font-size: 13px;
}
.lab-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.lab-primary {
  background: var(--lab-accent);
  border-color: var(--lab-accent);
  color: #0b0716;
  font-weight: 650;
}
.lab-chip {
  cursor: pointer;
  border: 1px solid var(--lab-line);
  border-radius: 999px;
  background: transparent;
  color: var(--lab-muted);
  padding: 4px 10px;
  font-size: 12px;
}
.lab-chip[aria-pressed='true'] {
  color: #0b0716;
  background: var(--lab-accent);
  border-color: var(--lab-accent);
}
.lab-mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--lab-muted);
}
.lab-mode input {
  accent-color: var(--lab-accent);
}
.lab-panel {
  border: 1px solid var(--lab-line);
  border-radius: 14px;
  background: var(--lab-panel);
}
.lab-panel > summary {
  cursor: pointer;
  padding: 10px 14px;
  font-weight: 650;
}
.lab-panel-body {
  padding: 0 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.lab-panel-body input[type='search'],
.lab-panel-body input[type='text'],
.lab-panel-body input[type='number'],
.lab-panel-body select,
.lab-panel-body textarea {
  width: 100%;
  box-sizing: border-box;
  background: #060409;
  border: 1px solid var(--lab-line);
  border-radius: 8px;
  color: var(--lab-text);
  padding: 6px 8px;
  font-size: 13px;
}
.lab-panel-body label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--lab-muted);
  min-width: 0;
}
.lab-filters {
  display: flex;
  gap: 6px;
}
.lab-filters select {
  flex: 1;
  min-width: 0;
}
.lab-entries {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
}
.lab-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  cursor: pointer;
  text-align: start;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--lab-text);
  padding: 4px 6px;
}
.lab-entry:hover {
  border-color: var(--lab-line);
}
.lab-entry[aria-current='true'],
.lab-entry[aria-pressed='true'] {
  border-color: var(--lab-accent);
}
.lab-thumb {
  display: inline-block;
  width: 56px;
  height: 56px;
  flex: none;
}
.lab-thumb svg {
  width: 100%;
  height: 100%;
  display: block;
}
.lab-entry-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.lab-entry-text strong {
  font-size: 13px;
}
.lab-entry-text small {
  color: var(--lab-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.lab-user {
  display: flex;
  align-items: center;
  gap: 4px;
}
.lab-user .lab-entry {
  flex: 1;
}
.lab-faces {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.lab-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--lab-muted);
  font-size: 10px;
  padding: 4px 2px;
}
.lab-face:hover {
  border-color: var(--lab-line);
}
.lab-face[aria-pressed='true'] {
  border-color: var(--lab-accent);
  color: var(--lab-text);
}
.lab-anims,
.lab-themes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
}
.lab-seg,
.lab-shapes {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.lab-slider {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--lab-muted);
}
.lab-slider input {
  accent-color: var(--lab-accent);
  width: 100%;
}
.lab-warn {
  margin: 0;
  font-size: 12px;
  color: #e8b4ff;
  border: 1px solid var(--lab-line);
  border-radius: 8px;
  padding: 6px 8px;
}
.lab-ok {
  margin: 0;
  color: #9df0c0;
  font-size: 13px;
}
.lab-issues {
  margin: 0;
  padding: 0;
  list-style: none;
  color: #f0a8a8;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lab-table {
  border-collapse: collapse;
  font-size: 12px;
  width: 100%;
}
.lab-table th,
.lab-table td {
  text-align: start;
  vertical-align: top;
  padding: 4px 6px;
  border-top: 1px solid var(--lab-line);
  overflow-wrap: anywhere;
}
.lab-table thead th {
  color: var(--lab-muted);
  font-weight: 600;
}
.lab-table th[scope='row'] {
  white-space: nowrap;
}
.lab-reason {
  display: block;
  color: #e8b4ff;
}
.lab-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.lab-steps li {
  flex: 0 0 168px;
  border: 1px solid var(--lab-line);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lab-steps li[aria-current='step'] {
  border-color: var(--lab-accent);
}
.lab-step-n {
  font-size: 11px;
  color: var(--lab-muted);
}
.lab-tl-params {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.lab-save-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.lab-compare {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--lab-muted);
}
.lab-dialog {
  background: var(--lab-panel);
  color: var(--lab-text);
  border: 1px solid var(--lab-line);
  border-radius: 14px;
  padding: 20px 24px;
}
.lab-dialog::backdrop {
  background: rgb(0 0 0 / 0.6);
}
.lab-dialog kbd {
  border: 1px solid var(--lab-line);
  border-radius: 6px;
  padding: 1px 6px;
  font-size: 12px;
}
</style>
