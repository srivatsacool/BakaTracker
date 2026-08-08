/**
 * KV — sessions, cache, feature flags, OAuth state (per v2.0 architecture).
 * Thin typed helpers; the OAuth state helpers live in auth/oauth-utils.ts.
 */
export const kv = {
  async get<T>(ns: KVNamespace, key: string): Promise<T | null> {
    const raw = await ns.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
  },
  async set<T>(ns: KVNamespace, key: string, value: T, ttlSeconds?: number): Promise<void> {
    await ns.put(key, JSON.stringify(value), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
  },
  async del(ns: KVNamespace, key: string): Promise<void> {
    await ns.delete(key);
  },
};

/** Feature-flag helper: `baka:feature:<name>` → boolean. */
export async function featureFlag(ns: KVNamespace, name: string, fallback = true): Promise<boolean> {
  const v = await ns.get(`baka:feature:${name}`);
  return v === null ? fallback : v === "1";
}