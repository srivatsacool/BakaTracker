import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useProactiveChecker, useBakaSurProactive, proactiveFreqToMs } from '../../hooks/useBakaSurProactive'
import { useStore } from '../../store/useStore'

// Mock zustand store
vi.mock('../../store/useStore', () => ({
  useStore: vi.fn(),
}))

// Mock baksurPreferences with a stable snapshot reference to avoid useSyncExternalStore infinite loops
vi.mock('../../lib/baksurPreferences', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../lib/baksurPreferences')>()
  // Must be a STABLE reference — useSyncExternalStore re-renders when reference changes
  const stableSnapshot = { ...real.DEFAULT_PREFERENCES }
  return {
    ...real,
    subscribeBakaSurPreferences: (_fn: () => void) => () => undefined,
    getBakaSurPreferencesSnapshot: () => stableSnapshot,
    loadBakaSurPreferences: () => stableSnapshot,
  }
})

// Mock Date.now and timers
const mockNow = 1700000000000

describe('useProactiveChecker (Phase 2A)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
    sessionStorage.clear()
    
    // Default store state
    vi.mocked(useStore).mockReturnValue({
      habits: [],
      habitLogs: [],
      tasks: [],
      journal: [],
      stats: { xp: 0 },
      settings: { xp_per_level: 1500 },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('respects 30-second boot silence before evaluating', () => {
    const { result } = renderHook(() => useProactiveChecker(false))
    
    // Immediately after mount, lastProactive should be null
    expect(result.current.lastProactive).toBeNull()

    // Fast-forward 29 seconds - still null
    act(() => {
      vi.advanceTimersByTime(29000)
    })
    expect(result.current.lastProactive).toBeNull()

    // After 30s, the first tick fires (30000ms)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
  })

  it('triggers level_up_available when xp >= xp_per_level', () => {
    vi.mocked(useStore).mockReturnValue({
      habits: [], habitLogs: [], tasks: [], journal: [],
      stats: { xp: 1600 },
      settings: { xp_per_level: 1500 },
    })

    const { result } = renderHook(() => useProactiveChecker(false))
    
    act(() => {
      vi.advanceTimersByTime(30000) // 30s boot silence tick
    })

    expect(result.current.lastProactive).toEqual({
      intent: 'level_up_available',
      messageIntent: 'ask_stats',
      priority: 90
    })
  })

  it('persists and respects cooldown per intent', () => {
    vi.mocked(useStore).mockReturnValue({
      habits: [], habitLogs: [], tasks: [], journal: [],
      stats: { xp: 1600 },
      settings: { xp_per_level: 1500 },
    })

    const { result, unmount } = renderHook(() => useProactiveChecker(false))
    
    act(() => {
      vi.advanceTimersByTime(30000) // first tick at 30s
    })
    expect(result.current.lastProactive?.intent).toBe('level_up_available')

    unmount()

    // Verify sessionStorage was updated (timestamp should be mockNow + 30000)
    const saved = JSON.parse(sessionStorage.getItem('bt_bakasur_proactive_v1') || '{}')
    expect(saved.level_up_available).toBe(mockNow + 30000)

    // Re-mount (simulating reload)
    const hook2 = renderHook(() => useProactiveChecker(false))
    
    // Fast-forward 15s for next tick (45000ms total from beginning of test, i.e., 15s since lastProactive fired)
    act(() => {
      vi.advanceTimersByTime(15000)
    })
    
    // Should be null because it's on cooldown (30s)
    expect(hook2.result.current.lastProactive).toBeNull()
  })

  it('suppresses proactive checks on focus routes', () => {
    vi.mocked(useStore).mockReturnValue({
      habits: [], habitLogs: [], tasks: [], journal: [],
      stats: { xp: 1600 },
      settings: { xp_per_level: 1500 },
    })

    const { result } = renderHook(() => useProactiveChecker(true)) // isFocusRoute = true
    
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    // Should not trigger because it is a focus route
    expect(result.current.lastProactive).toBeNull()
  })
})

describe('useBakaSurProactive integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
    sessionStorage.clear()
    
    vi.mocked(useStore).mockReturnValue({
      habits: [], habitLogs: [], tasks: [], journal: [],
      stats: { xp: 1600 },
      settings: { xp_per_level: 1500 },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('clears message after 10 seconds (DISPLAY_DURATION_MS)', () => {
    const { result } = renderHook(() => useBakaSurProactive('live', false))

    act(() => {
      vi.advanceTimersByTime(30000) // first tick triggers it
    })

    // Message should be set
    expect(result.current.message).toBeTruthy()
    expect(result.current.intent).toBe('level_up_available')

    act(() => {
      vi.advanceTimersByTime(9900) // almost 10 seconds
    })
    expect(result.current.message).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(100) // exactly 10 seconds
    })
    
    // Message should fade/clear
    expect(result.current.message).toBeNull()
    expect(result.current.intent).toBeNull()
  })
})

describe('proactiveFreqToMs', () => {
  it('maps each frequency key to the correct ms value', () => {
    expect(proactiveFreqToMs('10s')).toBe(10_000)
    expect(proactiveFreqToMs('30s')).toBe(30_000)
    expect(proactiveFreqToMs('1m')).toBe(60_000)
    expect(proactiveFreqToMs('5m')).toBe(300_000)
    expect(proactiveFreqToMs('off')).toBe(Infinity)
  })

  it('returns Infinity for off (isOnCooldown always true = no messages)', () => {
    expect(isFinite(proactiveFreqToMs('off'))).toBe(false)
  })
})
