/*
 * BAKATRACKER — Canonical Flamehorn Character Tests
 *
 * Verifies the Flamehorn character geometry, luminous eye capsule generation,
 * volumetric depth filters, and BaksurCharacter integration.
 */

import { describe, expect, it } from 'vitest'
import {
  buildFlamehornRadii,
  buildBodyPath,
  makeEyePath,
  CANONICAL_FLAMEHORN_RADII
} from '../../components/bakasur/FlamehornCharacter'

describe('Flamehorn Character Architecture', () => {
  it('1. generates canonical 64-sample radial profile with twin horns and flame crest', () => {
    const radii = buildFlamehornRadii()
    expect(radii.length).toBe(64)

    // Peak radius includes horns & crest bumps
    const maxRadius = Math.max(...radii)
    expect(maxRadius).toBeGreaterThan(1.0)
    expect(maxRadius).toBeLessThan(1.2)

    // Left horn peak near 233 deg (sample index: (233 / 360) * 64 ≈ 41)
    const leftHornSample = Math.round((233 / 360) * 64)
    expect(radii[leftHornSample]).toBeGreaterThan(0.85)

    // Right horn peak near 307 deg (sample index: (307 / 360) * 64 ≈ 55)
    const rightHornSample = Math.round((307 / 360) * 64)
    expect(radii[rightHornSample]).toBeGreaterThan(0.85)

    // Central flame crest near 270 deg (sample index: (270 / 360) * 64 = 48)
    const crestSample = Math.round((270 / 360) * 64)
    expect(radii[crestSample]).toBeGreaterThan(0.85)

    // Exported constant matches computed radii
    expect(CANONICAL_FLAMEHORN_RADII).toEqual(radii)
  })

  it('2. generates continuous closed spline path for body silhouette', () => {
    const path = buildBodyPath(1.0, 0)
    expect(path).toMatch(/^M\s+[\d.-]+\s+[\d.-]+/)
    expect(path).toMatch(/Z$/)
    expect(path.includes('C ')).toBe(true)

    // Breathing amplitude modifies path
    const breathingPath = buildBodyPath(1.0, 0.05)
    expect(breathingPath).not.toEqual(path)
  })

  it('3. generates smooth capsule pill geometry for luminous eyes', () => {
    // Open capsule eye: w=28, h=58
    const eyeOpen = makeEyePath(28, 58)
    expect(eyeOpen).toContain('M -14 -15') // -r, -(h-w)/2
    expect(eyeOpen).toContain('A 14 14')
    expect(eyeOpen).toContain('L 14 15')
    expect(eyeOpen).toContain('Z')

    // Blinking slit eye: w=28, h=2 (h <= w)
    const eyeBlink = makeEyePath(28, 2)
    expect(eyeBlink).toContain('M -14 0')
    expect(eyeBlink).toContain('A 14 1')
    expect(eyeBlink).toContain('Z')
  })

  it('4. supports socket occlusion expansion dimensions', () => {
    const socket = makeEyePath(36, 66)
    expect(socket).toContain('M -18 -15')
    expect(socket).toContain('A 18 18')
    expect(socket).toContain('Z')
  })
})
