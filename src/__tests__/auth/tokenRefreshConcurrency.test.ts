import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('OAuth Token Refresh Concurrency', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('coalesces concurrent token refresh requests into a single network call', async () => {
    let networkCallCount = 0;
    let tokenRefreshInFlight: Promise<string> | null = null;

    // Simulate token refresh worker endpoint
    const mockFetch = vi.fn().mockImplementation(async () => {
      networkCallCount++;
      // Add slight delay to simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 30));
      return {
        ok: true,
        json: async () => ({
          access_token: 'new_refreshed_token_' + networkCallCount,
          expires_in: 3600,
        }),
      };
    });

    const getAccessToken = async (): Promise<string> => {
      if (tokenRefreshInFlight) {
        return tokenRefreshInFlight;
      }

      const doRefresh = async (): Promise<string> => {
        const res = await mockFetch();
        const data = await res.json();
        return data.access_token;
      };

      tokenRefreshInFlight = doRefresh().finally(() => {
        tokenRefreshInFlight = null;
      });

      return tokenRefreshInFlight;
    };

    // Fire 5 concurrent requests simultaneously
    const results = await Promise.all([
      getAccessToken(),
      getAccessToken(),
      getAccessToken(),
      getAccessToken(),
      getAccessToken(),
    ]);

    // Exactly ONE network call must have occurred
    expect(networkCallCount).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // All callers receive the exact same new token
    for (const token of results) {
      expect(token).toBe('new_refreshed_token_1');
    }

    // Subsequent call after resolution executes a new single-flight refresh
    const secondWave = await getAccessToken();
    expect(networkCallCount).toBe(2);
    expect(secondWave).toBe('new_refreshed_token_2');
  });
});
