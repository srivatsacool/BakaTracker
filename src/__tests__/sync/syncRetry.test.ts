import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Test the sync retry logic extracted from useStore.ts.
 *
 * Retry flow:
 * 1. Sync fails → syncPending = true + scheduleRetry()
 * 2. scheduleRetry() waits exponential backoff (1s, 2s, 4s, ... up to 30s)
 * 3. After backoff, executeSyncNow() fires
 * 4. On success: syncPending = false, retry counter reset
 * 5. On failure: schedule another retry with increased backoff
 * 6. After MAX_RETRY_ATTEMPTS (10): stop retrying
 * 7. On network reconnect: reset attempts + quick retry (500ms)
 */

// Reproduce the retry logic from useStore.ts
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryBackoffMs = 1000;
const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 30_000;
const MAX_RETRY_ATTEMPTS = 10;
let retryAttempt = 0;

let retryCallCount = 0;

function executeRetry() {
  retryCallCount++;
}

function scheduleRetry() {
  if (retryTimer !== null) clearTimeout(retryTimer);
  if (retryAttempt >= MAX_RETRY_ATTEMPTS) return;
  retryAttempt++;
  retryBackoffMs = Math.min(retryBackoffMs * 2, MAX_RETRY_MS);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    executeRetry();
  }, retryBackoffMs);
}

function onNetworkReconnect() {
  retryAttempt = 0;
  retryBackoffMs = INITIAL_RETRY_MS;
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    executeRetry();
  }, 500);
}

function resetRetry() {
  retryTimer = null;
  retryBackoffMs = INITIAL_RETRY_MS;
  retryAttempt = 0;
  retryCallCount = 0;
}

beforeEach(() => {
  vi.useFakeTimers();
  resetRetry();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sync retry', () => {
  it('schedules retry after failure', () => {
    scheduleRetry();
    expect(retryCallCount).toBe(0);
    vi.advanceTimersByTime(2000); // first backoff = 1000 * 2 = 2000ms
    expect(retryCallCount).toBe(1);
  });

  it('uses exponential backoff (2s, 4s, 8s, ...)', () => {
    scheduleRetry(); // 1000 * 2 = 2000ms
    vi.advanceTimersByTime(2000);
    expect(retryCallCount).toBe(1);

    scheduleRetry(); // 2000 * 2 = 4000ms
    vi.advanceTimersByTime(3999);
    expect(retryCallCount).toBe(1);
    vi.advanceTimersByTime(1);
    expect(retryCallCount).toBe(2);

    scheduleRetry(); // 4000 * 2 = 8000ms
    vi.advanceTimersByTime(7999);
    expect(retryCallCount).toBe(2);
    vi.advanceTimersByTime(1);
    expect(retryCallCount).toBe(3);
  });

  it('caps backoff at 30s', () => {
    // After enough doublings, backoff should cap at 30s
    for (let i = 0; i < 20; i++) {
      scheduleRetry();
      vi.advanceTimersByTime(1); // trigger the timer
    }
    // The last backoff should be 30s (capped)
    scheduleRetry();
    expect(retryBackoffMs).toBe(MAX_RETRY_MS);
  });

  it('stops after MAX_RETRY_ATTEMPTS', () => {
    for (let i = 0; i < MAX_RETRY_ATTEMPTS; i++) {
      scheduleRetry();
      vi.advanceTimersByTime(retryBackoffMs + 1);
    }
    // Next attempt should be blocked
    scheduleRetry();
    vi.advanceTimersByTime(60_000);
    expect(retryCallCount).toBe(MAX_RETRY_ATTEMPTS); // no more retries
  });

  it('network reconnect resets attempts and fires quickly', () => {
    // Exhaust retries
    for (let i = 0; i < MAX_RETRY_ATTEMPTS; i++) {
      scheduleRetry();
      vi.advanceTimersByTime(retryBackoffMs + 1);
    }
    expect(retryCallCount).toBe(MAX_RETRY_ATTEMPTS);

    // Reconnect resets and fires in 500ms
    onNetworkReconnect();
    vi.advanceTimersByTime(500);
    expect(retryCallCount).toBe(MAX_RETRY_ATTEMPTS + 1);
  });

  it('reconnect cancels pending backoff timer', () => {
    scheduleRetry(); // schedule at 1s
    vi.advanceTimersByTime(500); // halfway

    onNetworkReconnect(); // cancels, fires at 500ms from now
    vi.advanceTimersByTime(500);
    expect(retryCallCount).toBe(1); // reconnect fired
    expect(retryAttempt).toBe(0); // reset
  });

  it('success resets retry state', () => {
    scheduleRetry();
    vi.advanceTimersByTime(2000);
    expect(retryCallCount).toBe(1);

    // Simulate success — reset backoff and attempt counter
    retryBackoffMs = INITIAL_RETRY_MS;
    retryAttempt = 0;
    retryTimer = null;

    // After reset, next retry uses fresh backoff (1000 * 2 = 2000ms)
    scheduleRetry();
    expect(retryAttempt).toBe(1); // attempt counter reset and re-incremented
    vi.advanceTimersByTime(2000);
    expect(retryCallCount).toBe(2); // both retries fired
  });
});
