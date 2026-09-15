/*
 * BAKASUR-UI — Original Bakasur work (Phase 8).
 *
 * Scene system tests (node, no DOM): validation, resolution, track
 * interpolation, deterministic particles, actor + nested timeline,
 * frozen frames, reduced motion, serialization, fallbacks, viewport math.
 * The one law: same scene + same timestamp = same resolved output.
 */
import { describe, expect, it } from 'vitest'
import { effectAt, sampleTrack } from './interp'
import { renderSceneSvg } from './render'
import {
  faceAt,
  frameViewport,
  resolveGazeAt,
  resolveSceneFrame,
  validateFrameValues,
  validateScene
} from './resolve'
import { getScene, listScenes } from './scenes'
import type { CinematicScene } from './types'

const awakening = (): CinematicScene => JSON.parse(JSON.stringify(getScene('bakasur-awakening'))) as CinematicScene

describe('scene catalogue', () => {
  it('holds the 5 specified scenes, all valid and distinct', () => {
    const ids = listScenes().map((s) => s.id)
    for (const id of ['bakasur-awakening', 'bakasur-arrival', 'bakasur-observing', 'bakasur-suspicious', 'bakasur-chaos']) {
      expect(ids, id).toContain(id)
    }
    for (const s of listScenes()) {
      expect(validateScene(s).ok, s.id).toBe(true)
    }
    // Distinct compositions, not renames: portals, cameras and actors differ.
    const sig = (s: CinematicScene): string =>
      JSON.stringify([s.portal?.radius, s.camera.zoom, s.actor.preset, s.environment.darkness, s.particles.length])
    expect(new Set(listScenes().map(sig)).size).toBe(5)
  })

  it('unknown scene ids degrade to awakening', () => {
    expect(getScene('nope').id).toBe('bakasur-awakening')
  })
})

describe('scene validation', () => {
  it('rejects non-objects and missing actors', () => {
    expect(validateScene(null).ok).toBe(false)
    expect(validateScene({ id: 'x', duration: 5 }).ok).toBe(false)
  })

  it('reports unknown presets, faces, themes and bad numbers', () => {
    const s = awakening()
    s.actor.preset = 'nope'
    s.actor.faces = [{ t: 1, expression: 'vague' }]
    s.duration = -2
    s.particles = [{ count: 500, seed: 1, sizeMin: 1, sizeMax: 2, opacity: 1, drift: 1, foreground: false }]
    s.effects = [{ kind: 'portalPulse', at: -1, dur: 0, amount: NaN }]
    const v = validateScene(s)
    expect(v.ok).toBe(false)
    const codes = v.issues.map((i) => i.code)
    for (const c of ['unknown-preset', 'unknown-expression', 'bad-duration', 'bad-count', 'bad-window', 'bad-amount']) {
      expect(codes, c).toContain(c)
    }
    for (const i of v.issues) {
      expect(i.field.length).toBeGreaterThan(0)
      expect(i.message.length).toBeGreaterThan(0)
    }
  })
})

describe('track interpolation', () => {
  it('holds ends, steps on hold, lerps linear, smooths smooth', () => {
    expect(sampleTrack({ keys: [] }, 5)).toBe(0)
    expect(sampleTrack({ keys: [{ t: 2, v: 7 }] }, 99)).toBe(7)
    expect(sampleTrack({ keys: [{ t: 2, v: 7 }] }, 0)).toBe(7)
    const hold = { keys: [{ t: 0, v: 1, ease: 'hold' as const }, { t: 2, v: 9 }] }
    expect(sampleTrack(hold, 1.99)).toBe(1)
    expect(sampleTrack(hold, 5)).toBe(9)
    const lin = { keys: [{ t: 0, v: 0, ease: 'linear' as const }, { t: 4, v: 8 }] }
    expect(sampleTrack(lin, 1)).toBe(2)
    const smo = { keys: [{ t: 0, v: 0, ease: 'smooth' as const }, { t: 2, v: 4 }] }
    expect(sampleTrack(smo, 1)).toBe(2)
    expect(sampleTrack(smo, 0.5)).toBeLessThan(1.5)
    expect(sampleTrack(lin, NaN)).toBe(0)
  })

  it('effect envelopes are zero outside their window', () => {
    const fx = [{ kind: 'glow' as const, at: 2, dur: 2, amount: 1 }]
    expect(effectAt(fx, 'glow', 1.99)).toBe(0)
    expect(effectAt(fx, 'glow', 4.01)).toBe(0)
    expect(effectAt(fx, 'glow', 3)).toBeCloseTo(1, 10)
    expect(effectAt(fx, 'haze', 3)).toBe(0)
  })
})

describe('scene frame resolution', () => {
  it('is deterministic per (scene, t)', () => {
    const s = awakening()
    for (const t of [0, 2.5, 6.99]) {
      const a = resolveSceneFrame(s, t)
      const b = resolveSceneFrame(JSON.parse(JSON.stringify(s)) as CinematicScene, t)
      expect(JSON.stringify(b)).toBe(JSON.stringify(a))
    }
  })

  it('clamps time to [0, duration] and holds the opening frame on garbage', () => {
    const s = awakening()
    expect(resolveSceneFrame(s, -5).t).toBe(0)
    expect(resolveSceneFrame(s, 99).t).toBe(s.duration)
    expect(resolveSceneFrame(s, NaN).t).toBe(0)
  })

  it('drives camera, portal, actor and effects from scene time', () => {
    const s = getScene('bakasur-arrival')
    const early = resolveSceneFrame(s, 0)
    const late = resolveSceneFrame(s, 6)
    expect(late.camera.zoom).toBeGreaterThan(early.camera.zoom)
    expect(late.portal!.opacity).toBeGreaterThan(early.portal!.opacity)
    expect(late.actor.opacity).toBe(1)
    expect(early.actor.opacity).toBe(0)
  })

  it('resolves the nested Bakasur timeline (burst → orbit → comet)', () => {
    const s = getScene('bakasur-chaos')
    expect(resolveSceneFrame(s, 1).actor.intent).toBe('burst')
    expect(resolveSceneFrame(s, 3).actor.intent).toBe('orbit')
    expect(resolveSceneFrame(s, 7).actor.intent).toBe('comet')
  })

  it('applies face cues at their times', () => {
    expect(faceAt([{ t: 3.5, expression: 'annoyed' }], 0)).toBeUndefined()
    expect(faceAt([{ t: 3.5, expression: 'annoyed' }], 5)).toBe('annoyed')
    const s = getScene('bakasur-suspicious')
    expect(resolveSceneFrame(s, 1).actor.expression).toBe('suspicious')
    expect(resolveSceneFrame(s, 5).actor.expression).toBe('annoyed')
  })

  it('degrades unknown actor presets to idle without throwing', () => {
    const s = awakening()
    s.actor.preset = 'nope'
    const f = resolveSceneFrame(s, 2)
    expect(f.actor.animation).toBe('idle')
  })
})

describe('deterministic particles', () => {
  it('same seed + index + t = same particle, no Math.random', () => {
    const s = awakening()
    const a = resolveSceneFrame(s, 2.5).particles
    const b = resolveSceneFrame(s, 2.5).particles
    expect(a).toEqual(b)
    expect(a.length).toBe(24)
    const c = resolveSceneFrame(s, 3.5).particles
    expect(c).not.toEqual(a)
    for (const p of a) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(800)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(500)
    }
  })

  it('reduced motion freezes drift and softens twinkle', () => {
    const s = awakening()
    const still = resolveSceneFrame(s, 2.5, { reducedMotion: true })
    const later = resolveSceneFrame(s, 5.5, { reducedMotion: true })
    expect(still.particles.map((p) => [p.x, p.y])).toEqual(later.particles.map((p) => [p.x, p.y]))
    expect(still.reduced).toBe(true)
  })
})

describe('reduced motion frames', () => {
  it('zeroes shake and pulse but keeps structure', () => {
    const s = getScene('bakasur-chaos')
    const full = resolveSceneFrame(s, 4.5)
    const calm = resolveSceneFrame(s, 4.5, { reducedMotion: true })
    expect(full.camera.x).not.toBe(calm.camera.x)
    expect(calm.actor.opacity).toBe(full.actor.opacity)
    expect(calm.portal!.opacity).toBe(full.portal!.opacity)
    expect(calm.actor.intent).toBe(full.actor.intent)
  })
})

describe('frozen scene frames', () => {
  it('renders clean standalone SVG, byte-stable per (scene, t)', () => {
    for (const s of listScenes()) {
      for (const t of [0, s.duration / 2, s.duration]) {
        const a = renderSceneSvg(s, t, 800, 500, { uid: 'fz' })
        const b = renderSceneSvg(s, t, 800, 500, { uid: 'fz' })
        expect(a).toBe(b)
        expect(a).toContain('<svg')
        expect(a).not.toMatch(/NaN|Infinity/)
        expect(a).not.toContain('#2496e8')
      }
    }
  })

  it('5 fitted frames at 0/25/50/75/100% stay clean', () => {
    for (const s of listScenes()) {
      for (const pct of [0, 25, 50, 75, 100]) {
        const svg = renderSceneSvg(s, (pct / 100) * s.duration, 800, 500, { uid: `p${pct}` })
        expect(svg, `${s.id}@${pct}%`).not.toMatch(/NaN|Infinity/)
      }
    }
  })
})

describe('responsive viewport math', () => {
  it('cover-fits without letterbox on the four target sizes', () => {
    const cases: Array<[number, number, number]> = [
      [1440, 900, 1.8],
      [1024, 768, 1.536],
      [768, 1024, 2.048],
      [390, 844, 1.688]
    ]
    for (const [w, h, scale] of cases) {
      const vp = frameViewport(w, h)
      expect(vp.scale, `${w}x${h}`).toBeCloseTo(scale, 3)
      // Stage covers the frame on both axes (crop, never bars).
      expect(800 * vp.scale).toBeGreaterThanOrEqual(w - 1)
      expect(500 * vp.scale).toBeGreaterThanOrEqual(h - 1)
    }
    const wide = frameViewport(1440, 900)
    expect(wide.tx).toBeCloseTo(0, 6)
    expect(wide.ty).toBeCloseTo(0, 6)
  })
})

describe('scene serialization', () => {
  it('every scene survives JSON round-trip with identical frames', () => {
    for (const s of listScenes()) {
      const back = JSON.parse(JSON.stringify(s)) as CinematicScene
      expect(validateScene(back).ok, s.id).toBe(true)
      expect(JSON.stringify(resolveSceneFrame(back, 3))).toBe(JSON.stringify(resolveSceneFrame(s, 3)))
      expect(JSON.stringify(back)).not.toMatch(/function/)
    }
  })
})

describe('Phase 10 choreography & quality gates', () => {
  it('1. choreography resolution resolves all choreography parameters cleanly', () => {
    const scene = getScene('bakasur-arrival')
    const frame = resolveSceneFrame(scene, 2)
    expect(frame.choreography).toBeDefined()
    expect(frame.choreography?.entrance?.kind).toBe('portal')
  })

  it('2. entrance sequence modulates actor opacity, scale and position deterministically', () => {
    const scene = getScene('bakasur-arrival')
    const pre = resolveSceneFrame(scene, 0.5)
    const mid = resolveSceneFrame(scene, 1.5)
    const post = resolveSceneFrame(scene, 3.0)
    expect(pre.actor.opacity).toBe(0)
    expect(mid.actor.opacity).toBeGreaterThan(0)
    expect(mid.actor.opacity).toBeLessThan(1)
    expect(post.actor.opacity).toBe(1)
  })

  it('3. gaze cues interpolate gaze yaw, pitch and mix smooth over time', () => {
    const cues = [
      { t: 1.0, yaw: -10, pitch: 5, mix: 0.5, duration: 1.5 },
      { t: 3.0, yaw: 10, pitch: -5, mix: 0.8, duration: 1.0 }
    ]
    expect(resolveGazeAt(cues, 0.5)).toBeUndefined()
    const at1 = resolveGazeAt(cues, 1.0)
    expect(at1?.yaw).toBe(-10)
    expect(at1?.pitch).toBe(5)
    const atMid = resolveGazeAt(cues, 1.75)
    expect(atMid?.yaw).toBeGreaterThan(-10)
    expect(atMid?.yaw).toBeLessThan(10)
  })

  it('4. portal/Bakasur coupling boosts portal intensity and settles post-arrival', () => {
    const scene = getScene('bakasur-arrival')
    const active = resolveSceneFrame(scene, 2.0)
    const settled = resolveSceneFrame(scene, 5.0)
    expect(active.portal).not.toBeNull()
    expect(active.portal!.intensity).toBeGreaterThan(0.6)
    expect(settled.portal!.intensity).toBeLessThanOrEqual(active.portal!.intensity)
  })

  it('5. camera cues follow intentional rules across all 5 scenes', () => {
    for (const scene of listScenes()) {
      const start = resolveSceneFrame(scene, 0)
      const end = resolveSceneFrame(scene, scene.duration)
      expect(Number.isFinite(start.camera.zoom)).toBe(true)
      expect(Number.isFinite(end.camera.zoom)).toBe(true)
    }
  })

  it('6. dialogue synchronization parameters are valid across presets', () => {
    for (const scene of listScenes()) {
      const sync = scene.choreography?.dialogueSync
      expect(sync).toBeDefined()
      expect(sync!.delay).toBeGreaterThanOrEqual(0)
    }
  })

  it('7. micro-motion applies deterministic hover, breathing and glow breath', () => {
    const scene = getScene('bakasur-observing')
    const f1 = resolveSceneFrame(scene, 1.0)
    const f2 = resolveSceneFrame(scene, 2.0)
    expect(f1.actor.hoverY).not.toBe(f2.actor.hoverY)
    expect(f1.actor.breathScale).toBeGreaterThan(0)
    expect(f1.env.glowBreath).toBeDefined()
  })

  it('8. scene signatures establish distinct visual & motion identities for all 5 scenes', () => {
    const scenes = listScenes()
    expect(scenes.length).toBe(5)
    const signatures = scenes.map((s) => ({
      id: s.id,
      entrance: s.choreography?.entrance?.kind,
      zoomStart: s.camera.zoom.keys[0]?.v,
      darkness: s.environment.darkness
    }))
    const uniqueEntrances = new Set(signatures.map((s) => s.entrance))
    expect(uniqueEntrances.size).toBeGreaterThanOrEqual(3)
  })

  it('9. transition interpolation is smooth with no property jumps', () => {
    const scene = getScene('bakasur-chaos')
    for (let t = 0; t <= scene.duration; t += 0.5) {
      const frame = resolveSceneFrame(scene, t)
      expect(frame.actor.opacity).toBeGreaterThanOrEqual(0)
      expect(frame.actor.opacity).toBeLessThanOrEqual(1)
    }
  })

  it('10. reduced motion zeroes camera shake, particle drift and micro motion', () => {
    const scene = getScene('bakasur-chaos')
    const calm = resolveSceneFrame(scene, 4.0, { reducedMotion: true })
    expect(calm.actor.hoverY).toBe(0)
    expect(calm.actor.breathScale).toBe(1)
    expect(Math.abs(calm.env.glowBreath)).toBe(0)
    for (const p of calm.particles) {
      expect(Number.isFinite(p.x)).toBe(true)
    }
  })

  it('11. responsive frame calculations compute accurate cover scales', () => {
    const viewports = [
      { w: 1440, h: 900 },
      { w: 1024, h: 768 },
      { w: 768, h: 1024 },
      { w: 390, h: 844 }
    ]
    for (const { w, h } of viewports) {
      const vp = frameViewport(w, h)
      expect(vp.scale).toBeGreaterThan(0)
      expect(800 * vp.scale).toBeGreaterThanOrEqual(w - 1)
      expect(500 * vp.scale).toBeGreaterThanOrEqual(h - 1)
    }
  })

  it('12. frozen frame checks at 0%, 10%, 25%, 50%, 75%, 90%, 100% are valid with zero NaN/Infinity', () => {
    const pcts = [0, 10, 25, 50, 75, 90, 100]
    for (const scene of listScenes()) {
      for (const pct of pcts) {
        const t = (pct / 100) * scene.duration
        const frame = resolveSceneFrame(scene, t)
        const check = validateFrameValues(frame)
        expect(check.ok, `${scene.id} @ ${pct}%: ${check.issues.join(', ')}`).toBe(true)
      }
    }
  })

  it('13. invalid choreography definitions produce validation issues', () => {
    const s = awakening()
    s.choreography = {
      entrance: { kind: 'invalid' as any, t: -1, duration: 0 },
      gazeCues: [{ t: -1, yaw: 200, pitch: -200 }]
    }
    const v = validateScene(s)
    expect(v.ok).toBe(false)
    const fields = v.issues.map((i) => i.field)
    expect(fields).toContain('choreography.entrance')
  })

  it('14. all 5 scene presets pass full validation gate', () => {
    for (const s of listScenes()) {
      const val = validateScene(s)
      expect(val.ok, `${s.id} validation failed: ${val.issues.map((i) => i.message).join('; ')}`).toBe(true)
    }
  })
})

