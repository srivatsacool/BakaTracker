// @vitest-environment happy-dom
/*
 * BAKASUR-UI — Original Bakasur work (Phase 7).
 *
 * Lab view tests: selection flows update the real runtime preview,
 * transport/timeline/keyboard work, validation gates saving, import/export
 * round-trips, built-ins stay immutable, reduced motion freezes playback.
 */
import { createApp, nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { BAKASUR_PRESETS } from '../bakasur/presets/catalogue'
import BakasurLab from './BakasurLab.vue'

const SNAPSHOT = JSON.stringify(BAKASUR_PRESETS)

function mount(props?: Record<string, unknown>) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp(BakasurLab, props ?? {})
  app.mount(el)
  return {
    el,
    unmount() {
      app.unmount()
      document.body.removeChild(el)
    }
  }
}

function btnByText(root: ParentNode, text: string): HTMLButtonElement {
  const btn = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)
  if (!btn) throw new Error(`button "${text}" not found`)
  return btn as HTMLButtonElement
}

/** Contains-match inside a scope: entries carry name + description. */
function btnIn(root: ParentNode, scope: string, text: string): HTMLButtonElement {
  const btn = [...root.querySelectorAll(`${scope} button`)].find((b) =>
    b.textContent?.toLowerCase().includes(text.toLowerCase())
  )
  if (!btn) throw new Error(`button "${text}" in "${scope}" not found`)
  return btn as HTMLButtonElement
}

const presetBtn = (root: ParentNode, text: string) => btnIn(root, '.lab-left .lab-panel .lab-entries', text)
const faceBtn = (root: ParentNode, text: string) => btnIn(root, '.lab-faces', text)
const animBtn = (root: ParentNode, text: string) => btnIn(root, '.lab-anims', text)
const themeBtn = (root: ParentNode, text: string) => btnIn(root, '.lab-themes', text)

function stageSvg(el: HTMLElement): string {
  return el.querySelector('.lab-stage svg')!.outerHTML
}

async function setRange(input: HTMLInputElement, v: number) {
  input.value = String(v)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}

beforeEach(() => localStorage.clear())

describe('bakasur lab view', () => {
  it('mounts with a live runtime preview and real-renderer thumbnails', async () => {
    const { el, unmount } = mount()
    expect(el.querySelector('.lab-name')!.textContent).toBe('Idle')
    expect(el.querySelectorAll('.lab-stage svg')).toHaveLength(1)
    expect(el.querySelectorAll('.lab-thumb svg').length).toBeGreaterThan(30)
    expect(el.querySelector('.lab-ok')!.textContent).toContain('Valid preset')
    unmount()
  })

  it('preset selection composes into the live preview', async () => {
    const { el, unmount } = mount()
    const before = stageSvg(el)
    presetBtn(el, 'Sleepy').click()
    await nextTick()
    expect(el.querySelector('.lab-name')!.textContent).toBe('Sleepy')
    expect(stageSvg(el)).not.toBe(before)
    unmount()
  })

  it('expression, animation and theme picks update the preview', async () => {
    const { el, unmount } = mount()
    faceBtn(el, 'suspicious').click()
    await nextTick()
    const afterFace = stageSvg(el)
    // Animation pick (Notification = notify vehicle).
    animBtn(el, 'Notification').click()
    await nextTick()
    expect(stageSvg(el)).not.toBe(afterFace)
    // Theme pick: ember rim survives in the preview svg.
    themeBtn(el, 'Ember violet').click()
    await nextTick()
    expect(stageSvg(el)).toContain('#c084fc')
    unmount()
  })

  it('a face on a fixed-face vehicle warns and blocks saving', async () => {
    const { el, unmount } = mount()
    animBtn(el, 'Notification').click()
    await nextTick()
    faceBtn(el, 'happy').click()
    await nextTick()
    expect(el.querySelector('.lab-warn')!.textContent).toContain('fixed face')
    const save = btnByText(el, 'Save as new preset')
    expect(save.disabled).toBe(true)
    unmount()
  })

  it('treatment sliders change the rendered output', async () => {
    const { el, unmount } = mount()
    const before = stageSvg(el)
    const glow = el.querySelector('.lab-slider input') as HTMLInputElement
    await setRange(glow, 1.8)
    expect(stageSvg(el)).not.toBe(before)
    unmount()
  })

  it('timeline add/remove/scrub drive the time indicator', async () => {
    const { el, unmount } = mount()
    expect(el.querySelectorAll('.lab-steps li')).toHaveLength(1)
    btnByText(el, 'Add step').click()
    await nextTick()
    expect(el.querySelectorAll('.lab-steps li')).toHaveLength(2)
    expect(el.querySelector('.lab-time')!.textContent).toContain('/ 3.00 s')
    await setRange(el.querySelector('.lab-scrub') as HTMLInputElement, 1.5)
    expect(el.querySelector('.lab-time')!.textContent).toContain('1.50 s')
    btnByText(el, '50 %').click()
    await nextTick()
    expect(el.querySelector('.lab-time')!.textContent).toContain('1.50 s')
    btnByText(el, 'Remove').click()
    await nextTick()
    expect(el.querySelectorAll('.lab-steps li')).toHaveLength(1)
    unmount()
  })

  it('play/pause, reset and keyboard drive transport', async () => {
    const { el, unmount } = mount()
    const transport = el.querySelector('.lab-transport')!
    btnByText(transport, 'Play').click()
    await nextTick()
    expect(btnByText(transport, 'Pause')).toBeDefined()
    btnByText(transport, 'Pause').click()
    await nextTick()
    expect(btnByText(transport, 'Play')).toBeDefined()
    await setRange(el.querySelector('.lab-scrub') as HTMLInputElement, 1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'R', bubbles: true }))
    await nextTick()
    expect(el.querySelector('.lab-time')!.textContent).toContain('0.00 s')
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))
    await nextTick()
    expect(btnByText(transport, 'Pause')).toBeDefined()
    unmount()
  })

  it('saves user presets and keeps them separate from built-ins', async () => {
    const { el, unmount } = mount()
    presetBtn(el, 'Sleepy').click()
    await nextTick()
    btnByText(el, 'Save as new preset').click()
    await nextTick()
    expect(el.querySelector('.lab-left')!.textContent).toContain('My presets (1)')
    // Persisted across mounts.
    unmount()
    const second = mount()
    expect(second.el.querySelector('.lab-left')!.textContent).toContain('My presets (1)')
    second.unmount()
    expect(JSON.stringify(BAKASUR_PRESETS)).toBe(SNAPSHOT)
  })

  it('imports JSON and rejects malformed input with reasons', async () => {
    const { el, unmount } = mount()
    const area = el.querySelector('.lab-right textarea') as HTMLTextAreaElement
    area.value = 'not json'
    area.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    btnByText(el, 'Import JSON').click()
    await nextTick()
    expect(el.querySelector('#lab-import-err')!.textContent).toContain('JSON')
    area.value = '{"animation": "orbit", "theme": "ember-violet", "name": "Shop"}'
    area.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    btnByText(el, 'Import JSON').click()
    await nextTick()
    expect(el.querySelector('.lab-name')!.textContent).toBe('Shop')
    expect(stageSvg(el)).toContain('#c084fc')
    unmount()
  })

  it('undo/redo restore composition', async () => {
    const { el, unmount } = mount()
    presetBtn(el, 'Sleepy').click()
    await nextTick()
    expect(el.querySelector('.lab-name')!.textContent).toBe('Sleepy')
    btnByText(el, 'Undo').click()
    await nextTick()
    expect(el.querySelector('.lab-name')!.textContent).toBe('Idle')
    btnByText(el, 'Redo').click()
    await nextTick()
    expect(el.querySelector('.lab-name')!.textContent).toBe('Sleepy')
    unmount()
  })

  it('reduced motion disables live playback but keeps a frozen frame', async () => {
    const original = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })
    })
    const { el, unmount } = mount()
    const live = el.querySelector('.lab-mode input') as HTMLInputElement
    expect(live.disabled).toBe(true)
    expect(el.querySelectorAll('.lab-stage svg')).toHaveLength(1)
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: original })
    unmount()
  })

  it('opens a deep-linked preset and ignores unknown ids', async () => {
    const a = mount({ initialPreset: 'bakasur-sleepy' })
    await nextTick()
    expect(a.el.querySelector('.lab-name')!.textContent).toBe('Sleepy')
    a.unmount()
    const b = mount({ initialPreset: 'nope' })
    await nextTick()
    expect(b.el.querySelector('.lab-name')!.textContent).toBe('Idle')
    b.unmount()
  })

  it('frozen frames are deterministic for a preset', async () => {
    const a = mount()
    presetBtn(a.el, 'Sleepy').click()
    await nextTick()
    const first = stageSvg(a.el)
    a.unmount()
    const b = mount()
    presetBtn(b.el, 'Sleepy').click()
    await nextTick()
    expect(stageSvg(b.el)).toBe(first)
    b.unmount()
  })
})
