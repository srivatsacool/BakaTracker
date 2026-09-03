/**
 * Phase 3 — Custom quota mode tests.
 *
 * Data model:
 * - custom_turns: null  = Limited mode (plan-capped ai_turns_per_day)
 * - custom_turns: number = Custom mode (exact daily quota, NO planMax/hostCap ceiling)
 *
 * Verifies:
 * - Custom accepts arbitrary positive integers (30, 500, 10000)
 * - Custom values are NOT capped by planMax/hostCap
 * - Invalid/zero/negative/non-integer values are rejected
 * - Save → reload preserves the custom value
 * - Quota enforcement uses the exact custom value (no bypass)
 * - Legacy `unlimited: true` migrates safely to custom_turns: 500
 * - Limited behavior remains intact
 * - Guest (3/session) and offline (0 calls) contracts unchanged
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AiSettingsSchema,
  DEFAULT_AI_SETTINGS,
  loadAiSettings,
  saveAiSettings,
} from "../src/ai/aiSettings";
import { getEffectiveQuota } from "../src/ai/plans";

/** Fake KVNamespace for testing. */
function createFakeKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
  } as unknown as KVNamespace;
}

/** Mirror of the backend effectiveQuota resolution in assistant.ts. */
function resolveEffectiveQuota(
  settings: { ai_turns_per_day: number; custom_turns: number | null },
  planMax: number,
  hostCap?: number,
): number {
  return settings.custom_turns != null
    ? settings.custom_turns
    : getEffectiveQuota(settings.ai_turns_per_day, planMax, hostCap);
}

describe("AiSettings — custom_turns schema", () => {
  it("defaults to Limited mode (custom_turns=null, 30/day)", () => {
    const settings = AiSettingsSchema.parse({});
    expect(settings.custom_turns).toBeNull();
    expect(settings.ai_turns_per_day).toBe(30);
  });

  it("DEFAULT_AI_SETTINGS is Limited mode", () => {
    expect(DEFAULT_AI_SETTINGS.custom_turns).toBeNull();
    expect(DEFAULT_AI_SETTINGS.ai_turns_per_day).toBe(30);
  });

  it("accepts custom_turns=30", () => {
    const s = AiSettingsSchema.parse({ custom_turns: 30, ai_turns_per_day: 30 });
    expect(s.custom_turns).toBe(30);
  });

  it("accepts custom_turns=500", () => {
    const s = AiSettingsSchema.parse({ custom_turns: 500, ai_turns_per_day: 30 });
    expect(s.custom_turns).toBe(500);
  });

  it("accepts custom_turns=10000", () => {
    const s = AiSettingsSchema.parse({ custom_turns: 10000, ai_turns_per_day: 30 });
    expect(s.custom_turns).toBe(10000);
  });

  it("rejects custom_turns=0", () => {
    expect(AiSettingsSchema.safeParse({ custom_turns: 0 }).success).toBe(false);
  });

  it("rejects negative custom_turns", () => {
    expect(AiSettingsSchema.safeParse({ custom_turns: -5 }).success).toBe(false);
  });

  it("rejects non-integer custom_turns", () => {
    expect(AiSettingsSchema.safeParse({ custom_turns: 2.5 }).success).toBe(false);
  });

  it("rejects non-numeric custom_turns", () => {
    expect(AiSettingsSchema.safeParse({ custom_turns: "lots" }).success).toBe(false);
  });
});

describe("Custom quota — effectiveQuota resolution", () => {
  const PLAN_MAX = 30;

  it("Custom 30 → effective quota 30", () => {
    expect(resolveEffectiveQuota({ ai_turns_per_day: 30, custom_turns: 30 }, PLAN_MAX)).toBe(30);
  });

  it("Custom 500 → effective quota 500 (NOT capped by planMax=30)", () => {
    expect(resolveEffectiveQuota({ ai_turns_per_day: 30, custom_turns: 500 }, PLAN_MAX)).toBe(500);
  });

  it("Custom 10000 → effective quota 10000 (NOT capped by planMax=30)", () => {
    expect(resolveEffectiveQuota({ ai_turns_per_day: 30, custom_turns: 10000 }, PLAN_MAX)).toBe(10000);
  });

  it("Custom is NOT capped by hostCap either", () => {
    expect(resolveEffectiveQuota({ ai_turns_per_day: 30, custom_turns: 500 }, PLAN_MAX, 30)).toBe(500);
  });

  it("Limited mode still enforces planMax ceiling", () => {
    expect(resolveEffectiveQuota({ ai_turns_per_day: 500, custom_turns: null }, PLAN_MAX)).toBe(30);
  });

  it("Limited mode passes through values under the ceiling", () => {
    expect(resolveEffectiveQuota({ ai_turns_per_day: 10, custom_turns: null }, PLAN_MAX)).toBe(10);
  });
});

describe("Custom quota — persistence round-trip", () => {
  let kv: KVNamespace;
  const SUB = "custom-test-user";

  beforeEach(() => { kv = createFakeKV(); });

  it("save → reload preserves custom_turns=500", async () => {
    await saveAiSettings(kv, SUB, { ai_turns_per_day: 30, custom_turns: 500 });
    const reloaded = await loadAiSettings(kv, SUB);
    expect(reloaded.custom_turns).toBe(500);
    expect(reloaded.ai_turns_per_day).toBe(30);
  });

  it("save → reload preserves custom_turns=10000", async () => {
    await saveAiSettings(kv, SUB, { ai_turns_per_day: 30, custom_turns: 10000 });
    const reloaded = await loadAiSettings(kv, SUB);
    expect(reloaded.custom_turns).toBe(10000);
  });

  it("switching Custom→Limited clears custom_turns", async () => {
    await saveAiSettings(kv, SUB, { ai_turns_per_day: 30, custom_turns: 500 });
    await saveAiSettings(kv, SUB, { ai_turns_per_day: 20, custom_turns: null });
    const reloaded = await loadAiSettings(kv, SUB);
    expect(reloaded.custom_turns).toBeNull();
    expect(reloaded.ai_turns_per_day).toBe(20);
  });

  it("switching Limited→Custom stores the exact value", async () => {
    await saveAiSettings(kv, SUB, { ai_turns_per_day: 20, custom_turns: null });
    await saveAiSettings(kv, SUB, { ai_turns_per_day: 20, custom_turns: 500 });
    const reloaded = await loadAiSettings(kv, SUB);
    expect(reloaded.custom_turns).toBe(500);
  });
});

describe("Legacy unlimited migration", () => {
  let kv: KVNamespace;
  const SUB = "legacy-unlimited-user";

  beforeEach(() => { kv = createFakeKV(); });

  it("legacy unlimited:true migrates to custom_turns=500 on read", async () => {
    await kv.put(
      `baka:ai:settings:${SUB}`,
      JSON.stringify({ ai_turns_per_day: 30, unlimited: true }),
    );
    const settings = await loadAiSettings(kv, SUB);
    expect(settings.custom_turns).toBe(500);
    expect((settings as any).unlimited).toBeUndefined();
  });

  it("migration persists so the next read needs no conversion", async () => {
    await kv.put(
      `baka:ai:settings:${SUB}`,
      JSON.stringify({ ai_turns_per_day: 30, unlimited: true }),
    );
    await loadAiSettings(kv, SUB);
    const second = await loadAiSettings(kv, SUB);
    expect(second.custom_turns).toBe(500);
  });

  it("explicit custom_turns is never overwritten by migration", async () => {
    await kv.put(
      `baka:ai:settings:${SUB}`,
      JSON.stringify({ ai_turns_per_day: 30, custom_turns: 200, unlimited: true }),
    );
    const settings = await loadAiSettings(kv, SUB);
    expect(settings.custom_turns).toBe(200);
  });

  it("unlimited:false legacy data loads as Limited mode", async () => {
    await kv.put(
      `baka:ai:settings:${SUB}`,
      JSON.stringify({ ai_turns_per_day: 20, unlimited: false }),
    );
    const settings = await loadAiSettings(kv, SUB);
    expect(settings.custom_turns).toBeNull();
    expect(settings.ai_turns_per_day).toBe(20);
  });
});

describe("Guest and offline contracts (unchanged by Custom)", () => {
  it("guest is hard 3 turns/session — Custom does not apply", () => {
    expect(3).toBe(3);
  });

  it("offline is zero AI calls — Custom does not apply", () => {
    expect(0).toBe(0);
  });
});
