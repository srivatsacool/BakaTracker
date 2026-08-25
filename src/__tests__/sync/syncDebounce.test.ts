import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Test the sync debounce logic extracted from useStore.ts.
 *
 * The debounce works by:
 * 1. scheduleSync() sets a 500ms timer
 * 2. If called again within 500ms, the previous timer is cancelled
 * 3. After 500ms of inactivity, executeSyncNow() fires
 * 4. executeSyncNow() reads the latest state and sends it to the Worker
 */

// Reproduce the debounce logic from useStore.ts
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 500;

let syncCallCount = 0;
let lastSyncState: Record<string, unknown> | null = null;

function executeSyncNow(state: Record<string, unknown>) {
  syncCallCount++;
  lastSyncState = state;
}

function scheduleSync(state: Record<string, unknown>) {
  if (syncDebounceTimer !== null) {
    clearTimeout(syncDebounceTimer);
  }
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    executeSyncNow(state);
  }, SYNC_DEBOUNCE_MS);
}

beforeEach(() => {
  vi.useFakeTimers();
  syncCallCount = 0;
  lastSyncState = null;
  syncDebounceTimer = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sync debounce', () => {
  it('fires sync after 500ms of inactivity', () => {
    scheduleSync({ tasks: [1] });
    expect(syncCallCount).toBe(0);

    vi.advanceTimersByTime(500);
    expect(syncCallCount).toBe(1);
    expect(lastSyncState).toEqual({ tasks: [1] });
  });

  it('cancels previous sync when called again within 500ms', () => {
    scheduleSync({ tasks: [1] });
    vi.advanceTimersByTime(200);

    scheduleSync({ tasks: [2] }); // cancels first
    vi.advanceTimersByTime(200); // 400ms total — first would have fired
    expect(syncCallCount).toBe(0);

    vi.advanceTimersByTime(300); // 500ms since second call
    expect(syncCallCount).toBe(1);
    expect(lastSyncState).toEqual({ tasks: [2] }); // latest state wins
  });

  it('collapses 5 rapid mutations into 1 sync', () => {
    for (let i = 1; i <= 5; i++) {
      scheduleSync({ counter: i });
      vi.advanceTimersByTime(100); // 100ms between each
    }
    // 500ms since last call
    vi.advanceTimersByTime(500);
    expect(syncCallCount).toBe(1);
    expect(lastSyncState).toEqual({ counter: 5 }); // latest wins
  });

  it('does not fire before 500ms', () => {
    scheduleSync({ tasks: [1] });
    vi.advanceTimersByTime(499);
    expect(syncCallCount).toBe(0);
  });

  it('fires exactly at 500ms', () => {
    scheduleSync({ tasks: [1] });
    vi.advanceTimersByTime(500);
    expect(syncCallCount).toBe(1);
  });

  it('multiple independent syncs after timeout', () => {
    scheduleSync({ tasks: [1] });
    vi.advanceTimersByTime(500);
    expect(syncCallCount).toBe(1);

    scheduleSync({ tasks: [2] });
    vi.advanceTimersByTime(500);
    expect(syncCallCount).toBe(2);
    expect(lastSyncState).toEqual({ tasks: [2] });
  });
});
