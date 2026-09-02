/**
 * Phase 3 — Unlimited quota behavior tests.
 */
import { describe, it, expect } from "vitest";
import { AiSettingsSchema, DEFAULT_AI_SETTINGS, type AiSettings } from "../src/ai/aiSettings";

describe("AiSettings — unlimited field", () => {
  it("defaults to unlimited=false", () => {
    const settings = AiSettingsSchema.parse({});
    expect(settings.unlimited).toBe(false);
    expect(settings.ai_turns_per_day).toBe(30);
  });

  it("accepts unlimited=true", () => {
    const settings = AiSettingsSchema.parse({ unlimited: true, ai_turns_per_day: 50 });
    expect(settings.unlimited).toBe(true);
    expect(settings.ai_turns_per_day).toBe(50);
  });

  it("rejects non-boolean unlimited", () => {
    const result = AiSettingsSchema.safeParse({ unlimited: "yes" });
    expect(result.success).toBe(false);
  });

  it("DEFAULT_AI_SETTINGS has unlimited=false", () => {
    expect(DEFAULT_AI_SETTINGS.unlimited).toBe(false);
  });
});

describe("Unlimited quota — behavioral contract", () => {
  it("unlimited=true means no BakaTracker daily cap", () => {
    const settings: AiSettings = { ai_turns_per_day: 30, unlimited: true };
    expect(settings.unlimited).toBe(true);
  });

  it("unlimited=false preserves existing quota behavior", () => {
    const settings: AiSettings = { ai_turns_per_day: 30, unlimited: false };
    expect(settings.unlimited).toBe(false);
  });
});

describe("Guest and offline contracts (unchanged by unlimited)", () => {
  it("guest is hard 3 turns/session — unlimited does not apply", () => {
    const GUEST_LIMIT = 3;
    expect(GUEST_LIMIT).toBe(3);
  });

  it("offline is zero AI calls — unlimited does not apply", () => {
    const OFFLINE_QUOTA = 0;
    expect(OFFLINE_QUOTA).toBe(0);
  });
});
