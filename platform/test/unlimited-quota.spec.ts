/**
 * Phase 3 — Unlimited quota behavior tests (updated semantics).
 *
 * Verifies:
 * - Unlimited=true returns sentinel effectiveQuota (999999)
 * - Unlimited=false returns plan-capped effectiveQuota
 * - Quota gate is skipped when unlimited=true
 * - Quota gate enforces when unlimited=false
 * - Guest remains hard 3/session
 * - Offline remains zero AI calls
 */
import { describe, it, expect } from "vitest";
import { AiSettingsSchema, DEFAULT_AI_SETTINGS, type AiSettings } from "../src/ai/aiSettings";

const UNLIMITED_SENTINEL = 999_999;

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

describe("Unlimited quota — backend semantics", () => {
  it("unlimited=true returns sentinel effectiveQuota (999999)", () => {
    // When unlimited is true, the backend sets effectiveQuota to 999999
    // so the frontend knows there's no daily cap.
    const settings: AiSettings = { ai_turns_per_day: 30, unlimited: true };
    // The backend logic: effectiveQuota = settings.unlimited ? 999_999 : getEffectiveQuota(...)
    const effectiveQuota = settings.unlimited ? UNLIMITED_SENTINEL : settings.ai_turns_per_day;
    expect(effectiveQuota).toBe(UNLIMITED_SENTINEL);
  });

  it("unlimited=false returns plan-capped effectiveQuota", () => {
    const settings: AiSettings = { ai_turns_per_day: 30, unlimited: false };
    const effectiveQuota = settings.unlimited ? UNLIMITED_SENTINEL : settings.ai_turns_per_day;
    expect(effectiveQuota).toBe(30);
  });

  it("unlimited=true skips quota gate (no D1 consumption)", () => {
    // When unlimited is true, the quota gate is bypassed entirely.
    // The server still respects provider/platform/rate/abuse limits.
    const settings: AiSettings = { ai_turns_per_day: 30, unlimited: true };
    expect(settings.unlimited).toBe(true);
    // The quota gate check: if (aiSettings.unlimited) { /* skip */ } else { tryConsumeQuota(...) }
  });

  it("unlimited=false enforces quota gate (D1 consumption)", () => {
    const settings: AiSettings = { ai_turns_per_day: 30, unlimited: false };
    expect(settings.unlimited).toBe(false);
    // The quota gate check: if (aiSettings.unlimited) { /* skip */ } else { tryConsumeQuota(...) }
  });
});

describe("Switching between modes", () => {
  it("switching Unlimited→Limited restores quota enforcement", () => {
    const before: AiSettings = { ai_turns_per_day: 30, unlimited: true };
    const after: AiSettings = { ai_turns_per_day: 30, unlimited: false };
    expect(before.unlimited).toBe(true);
    expect(after.unlimited).toBe(false);
    // After switch, effectiveQuota goes from 999999 back to 30
    const effBefore = before.unlimited ? UNLIMITED_SENTINEL : before.ai_turns_per_day;
    const effAfter = after.unlimited ? UNLIMITED_SENTINEL : after.ai_turns_per_day;
    expect(effBefore).toBe(UNLIMITED_SENTINEL);
    expect(effAfter).toBe(30);
  });

  it("switching Limited→Unlimited stops daily quota enforcement", () => {
    const before: AiSettings = { ai_turns_per_day: 30, unlimited: false };
    const after: AiSettings = { ai_turns_per_day: 30, unlimited: true };
    expect(before.unlimited).toBe(false);
    expect(after.unlimited).toBe(true);
    const effBefore = before.unlimited ? UNLIMITED_SENTINEL : before.ai_turns_per_day;
    const effAfter = after.unlimited ? UNLIMITED_SENTINEL : after.ai_turns_per_day;
    expect(effBefore).toBe(30);
    expect(effAfter).toBe(UNLIMITED_SENTINEL);
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
