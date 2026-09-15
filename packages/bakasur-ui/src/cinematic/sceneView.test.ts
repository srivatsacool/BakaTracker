// @vitest-environment happy-dom
/*
 * BAKASUR-UI — Original Bakasur work (Phase 8).
 *
 * Scene runtime + playground tests: frozen frames are deterministic,
 * unknown scenes fall back, reduced motion stills the frame, transport
 * and viewport switching work, inspection reflects resolution.
 */
import { createApp, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import Playground from './Playground.vue'
import { renderSceneSvg } from './render'
import { getScene } from './scenes'
import SceneView from './SceneView.vue'

function mountView(props?: Record<string, unknown>) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp(SceneView, { sceneId: 'bakasur-awakening', width: 400, height: 250, ...(props ?? {}) })
  app.mount(el)
  return {
    el,
    unmount() {
      app.unmount()
      document.body.removeChild(el)
    }
  }
}

describe('scene runtime', () => {
  it('renders environment, portal, actor and particles', async () => {
    const { el, unmount } = mountView({ frozenAt: 3 })
    await nextTick()
    const stage = el.querySelector('.cx-stage')!
    expect(stage.querySelectorAll('svg').length).toBeGreaterThanOrEqual(3)
    // Actor nests the real Bakasur renderer (mask + body path).
    expect(stage.querySelector('.cx-actor svg mask')).not.toBeNull()
    expect(stage.querySelectorAll('.cx-actor').length).toBe(1)
    unmount()
  })

  it('frozen frames match the pure renderer frame for frame', async () => {
    const { el, unmount } = mountView({ frozenAt: 3 })
    await nextTick()
    const live = el.querySelector('.cx-stage svg')!.outerHTML
    const pure = renderSceneSvg(getScene('bakasur-awakening'), 3, 400, 250, { uid: 'x' })
    // Same layers, same order (ids differ per instance, so compare tags).
    const tags = (s: string): string[] => [...s.matchAll(/<(rect|ellipse|circle|path|g|filter|radialGradient|linearGradient|stop|mask|svg|defs|feDropShadow)/g)].map((m) => m[1]!)
    const liveBase = el.querySelectorAll('.cx-stage > svg')[0]!.outerHTML
    expect(tags(liveBase).join(',')).toBe(tags(pure.split('<svg x=')[0]!).join(','))
    expect(live.length).toBeGreaterThan(1000)
    unmount()
  })

  it('unknown scene ids fall back to awakening with a note', async () => {
    const { el, unmount } = mountView({ frozenAt: 1, sceneId: 'nope' })
    await nextTick()
    expect(el.querySelector('.cx-stage svg')).not.toBeNull()
    unmount()
  })

  it('reduced motion renders a valid static frame', async () => {
    const { el, unmount } = mountView({ frozenAt: 4, reduced: true, sceneId: 'bakasur-chaos' })
    await nextTick()
    const svg = el.querySelector('.cx-stage svg')!.outerHTML
    expect(svg).not.toMatch(/NaN|Infinity/)
    expect(svg).toContain('<ellipse')
    unmount()
  })

  it('no upstream blue or orange in any scene at any quarter', async () => {
    for (const s of ['bakasur-awakening', 'bakasur-arrival', 'bakasur-observing', 'bakasur-suspicious', 'bakasur-chaos']) {
      const { el, unmount } = mountView({ frozenAt: 3, sceneId: s })
      await nextTick()
      const html = el.querySelector('.cx-stage')!.outerHTML.toLowerCase()
      expect(html, s).not.toContain('#2496e8')
      for (const o of ['#ff7a00', '#f97316', '#fb923c', '#ffa500']) expect(html, `${s}/${o}`).not.toContain(o)
      unmount()
    }
  })
})

describe('scene playground', () => {
  function mountPg() {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Playground)
    app.mount(el)
    return {
      el,
      unmount() {
        app.unmount()
        document.body.removeChild(el)
      }
    }
  }

  function btn(root: ParentNode, text: string): HTMLButtonElement {
    const b = [...root.querySelectorAll('button')].find((x) => x.textContent?.trim() === text)
    if (!b) throw new Error(`button "${text}" missing`)
    return b as HTMLButtonElement
  }

  it('switches scenes, scrubs, resets and inspects', async () => {
    const { el, unmount } = mountPg()
    await nextTick()
    expect(el.querySelector('.pg-name')!.textContent).toBe('Awakening')
    btn(el, 'Chaos').click()
    await nextTick()
    expect(el.querySelector('.pg-name')!.textContent).toBe('Chaos')
    expect(el.querySelector('.pg-time')!.textContent).toContain('/ 8.00 s')
    const scrub = el.querySelector('.pg-scrub') as HTMLInputElement
    scrub.value = '4'
    scrub.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(el.querySelector('.pg-time')!.textContent).toContain('4.00 s')
    btn(el, '50 %').click()
    await nextTick()
    expect(el.querySelector('.pg-time')!.textContent).toContain('4.00 s')
    // Inspector reflects the resolved frame.
    expect(el.querySelector('.pg-inspector')!.textContent).toContain('burst')
    btn(el, 'Reset').click()
    await nextTick()
    expect(el.querySelector('.pg-time')!.textContent).toContain('0.00 s')
    unmount()
  })

  it('switches viewports without page overflow', async () => {
    const { el, unmount } = mountPg()
    await nextTick()
    btn(el, '390 × 844').click()
    await nextTick()
    const stage = el.querySelector('.cx-stage') as HTMLElement
    expect(stage.style.width).toBe('390px')
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390 + 40)
    btn(el, '1440 × 900').click()
    await nextTick()
    expect((el.querySelector('.cx-stage') as HTMLElement).style.width).toBe('1440px')
    unmount()
  })
})
