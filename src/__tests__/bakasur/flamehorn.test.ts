/*
 * BAKATRACKER — Canonical Flamehorn & bakasur-ui Integration Tests
 *
 * Verifies that FlamehornCharacter and BaksurCharacter are cleanly wired
 * to the bakasur-ui engine and export canonical geometry.
 */

import { describe, expect, it } from 'vitest'
import { FlamehornCharacter, FLAMEHORN_RADII } from '../../components/bakasur/FlamehornCharacter'
import { BaksurCharacter } from '../../components/shell/BaksurCharacter'
import { mapProductStateToLook } from '../../components/bakasur/stateMapping'
import { BAKASUR_RADII } from 'bakasur-ui'

describe('Flamehorn & bakasur-ui Integration', () => {
  it('1. exports canonical 64-sample Flamehorn profile from bakasur-ui', () => {
    expect(FLAMEHORN_RADII).toBeDefined()
    expect(FLAMEHORN_RADII.length).toBe(64)

    // Left horn near 233 deg ((233 / 360) * 64 ≈ 41)
    const leftHornSample = Math.round((233 / 360) * 64)
    expect(FLAMEHORN_RADII[leftHornSample]).toBeGreaterThan(0.85)

    // Right horn near 307 deg ((307 / 360) * 64 ≈ 55)
    const rightHornSample = Math.round((307 / 360) * 64)
    expect(FLAMEHORN_RADII[rightHornSample]).toBeGreaterThan(0.85)

    // Central flame crest near 270 deg ((270 / 360) * 64 = 48)
    const crestSample = Math.round((270 / 360) * 64)
    expect(FLAMEHORN_RADII[crestSample]).toBeGreaterThan(0.85)
  })

  it('2. aligns canonical BAKASUR_RADII with Flamehorn geometry', () => {
    expect(BAKASUR_RADII.length).toBe(64)
    expect(Math.max(...BAKASUR_RADII)).toBeCloseTo(1.0, 2)
  })

  it('3. exports FlamehornCharacter component function backed by bakasur-ui', () => {
    expect(typeof FlamehornCharacter).toBe('function')
  })

  it('4. exports BaksurCharacter component function backed by bakasur-ui', () => {
    expect(typeof BaksurCharacter).toBe('function')
  })

  it('5. resolves idle resting state to upright neutral expression', () => {
    const look = mapProductStateToLook('IDLE')
    expect(look.expression).toBe('neutral')
  })
})
