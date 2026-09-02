/**
 * Phase 3 — Soul persistence, ownership isolation, sanitization, and size limits.
 *
 * Tests the Soul storage module (platform/src/soul.ts) which manages
 * per-user identity context via KV (OAUTH_KV).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadSoul,
  saveSoul,
  deleteSoul,
  sanitizeSoulContent,
  SoulSchema,
  DEFAULT_SOUL,
  SOUL_MAX_CHARS,
} from "../src/soul";

/** Fake KVNamespace for testing. */
function createFakeKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
  } as unknown as KVNamespace;
}

describe("Soul storage", () => {
  let kv: KVNamespace;
  const USER_A = "user-a-123";
  const USER_B = "user-b-456";

  beforeEach(() => {
    kv = createFakeKV();
  });

  describe("loadSoul", () => {
    it("returns DEFAULT_SOUL when no Soul exists", async () => {
      const soul = await loadSoul(kv, USER_A);
      expect(soul).toEqual(DEFAULT_SOUL);
    });

    it("loads existing Soul from KV", async () => {
      const content = "## Identity\n\nName: Alice";
      await kv.put(`baka:soul:${USER_A}`, JSON.stringify({ content, updated_at: "2026-09-01T00:00:00Z" }));
      const soul = await loadSoul(kv, USER_A);
      expect(soul.content).toBe(content);
      expect(soul.updated_at).toBe("2026-09-01T00:00:00Z");
    });

    it("returns DEFAULT_SOUL for corrupted JSON", async () => {
      await kv.put(`baka:soul:${USER_A}`, "not valid json{{{");
      const soul = await loadSoul(kv, USER_A);
      expect(soul).toEqual(DEFAULT_SOUL);
    });
  });

  describe("saveSoul", () => {
    it("saves Soul with sanitized content and timestamp", async () => {
      const soul = await saveSoul(kv, USER_A, { content: "Hello world", updated_at: "" });
      expect(soul.content).toBe("Hello world");
      expect(soul.updated_at).toBeTruthy();
      expect(kv.put).toHaveBeenCalled();
    });

    it("sanitizes control characters", async () => {
      const soul = await saveSoul(kv, USER_A, { content: "Hello\x00\x07world\x0Btest", updated_at: "" });
      expect(soul.content).toBe("Helloworldtest");
    });

    it("preserves newlines and tabs", async () => {
      const soul = await saveSoul(kv, USER_A, { content: "Line 1\nLine 2\tTab", updated_at: "" });
      expect(soul.content).toBe("Line 1\nLine 2\tTab");
    });

    it("clamps content to SOUL_MAX_CHARS", async () => {
      const longContent = "x".repeat(SOUL_MAX_CHARS + 1000);
      const soul = await saveSoul(kv, USER_A, { content: longContent, updated_at: "" });
      expect(soul.content.length).toBeLessThanOrEqual(SOUL_MAX_CHARS);
    });

    it("trims leading/trailing whitespace", async () => {
      const soul = await saveSoul(kv, USER_A, { content: "  Hello world  ", updated_at: "" });
      expect(soul.content).toBe("Hello world");
    });
  });

  describe("ownership isolation", () => {
    it("different users have isolated Souls", async () => {
      await saveSoul(kv, USER_A, { content: "Alice's Soul", updated_at: "" });
      await saveSoul(kv, USER_B, { content: "Bob's Soul", updated_at: "" });

      const soulA = await loadSoul(kv, USER_A);
      const soulB = await loadSoul(kv, USER_B);

      expect(soulA.content).toBe("Alice's Soul");
      expect(soulB.content).toBe("Bob's Soul");
    });

    it("deleting one user's Soul does not affect another", async () => {
      await saveSoul(kv, USER_A, { content: "Alice", updated_at: "" });
      await saveSoul(kv, USER_B, { content: "Bob", updated_at: "" });
      await deleteSoul(kv, USER_A);

      const soulA = await loadSoul(kv, USER_A);
      const soulB = await loadSoul(kv, USER_B);

      expect(soulA).toEqual(DEFAULT_SOUL);
      expect(soulB.content).toBe("Bob");
    });
  });

  describe("deleteSoul", () => {
    it("removes Soul from KV", async () => {
      await saveSoul(kv, USER_A, { content: "test", updated_at: "" });
      await deleteSoul(kv, USER_A);
      const soul = await loadSoul(kv, USER_A);
      expect(soul).toEqual(DEFAULT_SOUL);
    });
  });

  describe("schema validation", () => {
    it("accepts valid Soul", () => {
      const result = SoulSchema.safeParse({ content: "Hello", updated_at: "2026-09-01" });
      expect(result.success).toBe(true);
    });

    it("defaults empty content", () => {
      const result = SoulSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("");
      }
    });

    it("rejects content exceeding max length", () => {
      const result = SoulSchema.safeParse({ content: "x".repeat(SOUL_MAX_CHARS + 1) });
      expect(result.success).toBe(false);
    });
  });
});

describe("sanitizeSoulContent", () => {
  it("strips control characters", () => {
    expect(sanitizeSoulContent("Hello\x00\x07World")).toBe("HelloWorld");
  });

  it("preserves newlines and tabs", () => {
    expect(sanitizeSoulContent("Line 1\nLine 2\tTab")).toBe("Line 1\nLine 2\tTab");
  });

  it("trims and clamps", () => {
    const result = sanitizeSoulContent("  " + "x".repeat(SOUL_MAX_CHARS + 100) + "  ");
    expect(result.length).toBeLessThanOrEqual(SOUL_MAX_CHARS);
    expect(result.startsWith("x")).toBe(true);
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeSoulContent("")).toBe("");
  });
});
