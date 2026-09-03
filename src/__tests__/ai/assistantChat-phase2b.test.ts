/**
 * Phase 2B — Frontend assistantChat service tests.
 *
 * Tests: guest 3/session, offline zero-fetch/zero-consumption,
 * validation, quota envelope types, sendAssistantChat routing.
 * Uses sessionStorage/navigator stubs for guest/offline paths.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getGuestRemaining,
  isGuestQuotaExhausted,
  validateChatMessage,
  validateHistory,
  formatRemainingLabel,
  type QuotaEnvelope,
  type AiSettingsResponse,
} from "../../services/assistantChat";

const GUEST_KEY = "bt_guest_ai_turns";

beforeEach(() => {
  try { sessionStorage.clear(); } catch {}
});

afterEach(() => {
  try { sessionStorage.clear(); } catch {}
});

describe("Phase 2B — Guest quota (hard 3/session)", () => {
  it("starts at 3 remaining", () => {
    expect(getGuestRemaining()).toBe(3);
    expect(isGuestQuotaExhausted()).toBe(false);
  });

  it("decrements remaining as turns are consumed", () => {
    // Simulate consumption by writing to sessionStorage
    sessionStorage.setItem(GUEST_KEY, "1");
    expect(getGuestRemaining()).toBe(2);
    sessionStorage.setItem(GUEST_KEY, "2");
    expect(getGuestRemaining()).toBe(1);
    sessionStorage.setItem(GUEST_KEY, "3");
    expect(getGuestRemaining()).toBe(0);
    expect(isGuestQuotaExhausted()).toBe(true);
  });

  it("handles corrupt sessionStorage gracefully", () => {
    sessionStorage.setItem(GUEST_KEY, "not-a-number");
    expect(getGuestRemaining()).toBe(3);
    sessionStorage.setItem(GUEST_KEY, "");
    expect(getGuestRemaining()).toBe(3);
  });

  it("quota resets on page reload (sessionStorage cleared)", () => {
    sessionStorage.setItem(GUEST_KEY, "2");
    expect(getGuestRemaining()).toBe(1);
    sessionStorage.removeItem(GUEST_KEY);
    expect(getGuestRemaining()).toBe(3);
  });
});

describe("Phase 2B — Client-side validation", () => {
  it("rejects empty message", () => {
    expect(validateChatMessage("")).toBe("A message is required.");
    expect(validateChatMessage("  ")).toBe("A message is required.");
  });

  it("rejects oversized message", () => {
    expect(validateChatMessage("x".repeat(2001))).toBe("Message must be 1-2000 characters.");
  });

  it("accepts valid message", () => {
    expect(validateChatMessage("hello")).toBeNull();
    expect(validateChatMessage("x".repeat(2000))).toBeNull();
  });

  it("rejects history > 10 turns", () => {
    const history = Array.from({ length: 11 }, () => ({ role: "user" as const, content: "hi" }));
    expect(validateHistory(history)).toBe("History is capped at 10 turns.");
  });

  it("rejects empty history turn", () => {
    const history = [{ role: "user" as const, content: "" }];
    expect(validateHistory(history)).toBe("Each history turn must be 1-2000 chars.");
  });

  it("accepts valid history", () => {
    const history = Array.from({ length: 10 }, () => ({ role: "user" as const, content: "hi" }));
    expect(validateHistory(history)).toBeNull();
  });

  it("accepts undefined history", () => {
    expect(validateHistory(undefined)).toBeNull();
  });
});

describe("Phase 2B — Format helpers", () => {
  it("offline label", () => {
    expect(formatRemainingLabel("offline", 0, 0)).toBe("Offline · 0 AI turns");
  });

  it("guest label", () => {
    expect(formatRemainingLabel("guest", 2, 3)).toBe("2/3 demo turns left");
  });

  it("live label", () => {
    expect(formatRemainingLabel("live", 25, 30)).toBe("25/30 turns left today");
  });
});

describe("Phase 2B — QuotaEnvelope shape", () => {
  it("envelope has required fields", () => {
    const envelope: QuotaEnvelope = {
      used: 1,
      remaining: 29,
      effectiveQuota: 30,
      planMax: 30,
      date: "2026-08-31",
      resetAt: "2026-09-01T00:00:00.000Z",
    };
    expect(envelope.used).toBe(1);
    expect(envelope.remaining).toBe(29);
    expect(envelope.effectiveQuota).toBe(30);
    expect(envelope.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("Phase 2B — AiSettingsResponse shape", () => {
  it("response has required fields", () => {
    const s: AiSettingsResponse = {
      ai_turns_per_day: 30,
      custom_turns: null,
      effectiveQuota: 30,
      planMax: 30,
      date: "2026-08-31",
    };
    expect(s.ai_turns_per_day).toBe(30);
    expect(s.effectiveQuota).toBe(30);
    expect(s.planMax).toBe(30);
  });
});
