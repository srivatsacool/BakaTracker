/**
 * Unit tests for the Web Push delivery backend (no Worker runtime needed).
 * These exercise the pure logic in pushStore + WebPushDelivery with an
 * in-memory KV shim and a fake sender, keeping them fast + deterministic.
 */
import { describe, it, expect, vi } from "vitest";
import {
  listSubscriptions,
  putSubscription,
  deleteSubscription,
  deleteAllSubscriptions,
  MAX_SUBSCRIPTIONS_PER_USER,
} from "../src/notifications/pushStore";
import { WebPushDelivery, type PushSender } from "../src/notifications/webpush";
import type { PushSubscription, Notification } from "@block65/webcrypto-web-push";

/** Minimal in-memory KVNamespace for tests. */
function memoryKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => void store.set(k, v),
    delete: async (k: string) => void store.delete(k),
  } as unknown as KVNamespace;
}

function sub(endpoint: string, suffix = "a"): PushSubscription {
  return {
    endpoint,
    expirationTime: null,
    keys: { auth: `auth${suffix}`, p256dh: `p256dh${suffix}` },
  };
}

const notif: Notification = {
  id: "notif_1",
  user_id: "user_1",
  type: "overdue_task",
  priority: 2,
  entity_id: "task_42",
  tone: "gentle",
  message: "Your task is overdue!",
  created_at: new Date().toISOString(),
  context: {},
};

describe("pushStore validation", () => {
  it("rejects a non-https endpoint", async () => {
    const kv = memoryKv();
    expect(await putSubscription(kv, "u", { endpoint: "http://evil.example/p", keys: { auth: "a", p256dh: "b" } })).toBe("rejected");
    expect(await listSubscriptions(kv, "u")).toHaveLength(0);
  });

  it("rejects missing keys", async () => {
    const kv = memoryKv();
    expect(await putSubscription(kv, "u", { endpoint: "https://a.example/p" })).toBe("rejected");
  });

  it("stores a valid subscription and upserts by endpoint", async () => {
    const kv = memoryKv();
    expect(await putSubscription(kv, "u", sub("https://a.example/1"))).toBe("created");
    expect(await putSubscription(kv, "u", sub("https://a.example/1", "b"))).toBe("updated");
    const all = await listSubscriptions(kv, "u");
    expect(all).toHaveLength(1);
    expect(all[0].keys.auth).toBe("authb");
  });

  it("evicts oldest when over the per-user cap (LRU)", async () => {
    const kv = memoryKv();
    for (let i = 0; i < MAX_SUBSCRIPTIONS_PER_USER + 2; i++) {
      await putSubscription(kv, "u", sub(`https://a.example/${i}`));
    }
    const all = await listSubscriptions(kv, "u");
    expect(all).toHaveLength(MAX_SUBSCRIPTIONS_PER_USER);
    // Oldest (index 0) was evicted.
    expect(all.some((s) => s.endpoint === "https://a.example/0")).toBe(false);
    expect(all.some((s) => s.endpoint === `https://a.example/${MAX_SUBSCRIPTIONS_PER_USER + 1}`)).toBe(true);
  });

  it("deleteSubscription removes only the matching endpoint", async () => {
    const kv = memoryKv();
    await putSubscription(kv, "u", sub("https://a.example/1"));
    await putSubscription(kv, "u", sub("https://a.example/2"));
    expect(await deleteSubscription(kv, "u", "https://a.example/1")).toBe(true);
    expect(await deleteSubscription(kv, "u", "https://a.example/1")).toBe(false);
    expect(await listSubscriptions(kv, "u")).toHaveLength(1);
  });

  it("deleteAllSubscriptions clears the user", async () => {
    const kv = memoryKv();
    await putSubscription(kv, "u", sub("https://a.example/1"));
    await deleteAllSubscriptions(kv, "u");
    expect(await listSubscriptions(kv, "u")).toHaveLength(0);
  });
});

describe("WebPushDelivery", () => {
  const vapid = { subject: "mailto:test@x", publicKey: "pk", privateKey: "sk" };

  it("no-ops when the user has no subscriptions", async () => {
    const kv = memoryKv();
    const send = vi.fn() as unknown as PushSender;
    const d = new WebPushDelivery(kv, vapid, send);
    await expect(d.deliver({ sub: "u" }, notif)).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it("sends to every subscription and GCs expired (404/410) endpoints", async () => {
    const kv = memoryKv();
    await putSubscription(kv, "u", sub("https://a.example/live"));
    await putSubscription(kv, "u", sub("https://a.example/dead"));

    const send = vi.fn(async (s: PushSubscription) => {
      const expired = s.endpoint.includes("dead");
      return { status: expired ? 410 : 200, ok: !expired } as Response;
    }) as unknown as PushSender;

    const fakeBuild = (async () => ({ headers: {}, method: "POST", body: new Uint8Array() })) as unknown as import("../src/notifications/webpush").BuildPayload;
    const d = new WebPushDelivery(kv, vapid, send, fakeBuild);
    await d.deliver({ sub: "u" }, notif);

    expect(send).toHaveBeenCalledTimes(2);
    // The dead endpoint should have been garbage-collected.
    const remaining = await listSubscriptions(kv, "u");
    expect(remaining.map((r) => r.endpoint)).toEqual(["https://a.example/live"]);
  });

  it("isConfigured is false unless all three VAPID vars are present", () => {
    expect(WebPushDelivery.isConfigured({})).toBe(false);
    expect(WebPushDelivery.isConfigured({ VAPID_PUBLIC_KEY: "x", VAPID_PRIVATE_KEY: "y" })).toBe(false);
    expect(WebPushDelivery.isConfigured({ VAPID_PUBLIC_KEY: "x", VAPID_PRIVATE_KEY: "y", VAPID_SUBJECT: "z" })).toBe(true);
  });

  it("isolates failures: one throwing endpoint doesn't block others", async () => {
    const kv = memoryKv();
    await putSubscription(kv, "u", sub("https://a.example/ok"));
    await putSubscription(kv, "u", sub("https://a.example/boom"));
    const send = vi.fn(async (s: PushSubscription) => {
      if (s.endpoint.includes("boom")) throw new Error("crypto boom");
      return { status: 200, ok: true } as Response;
    }) as unknown as PushSender;
    const fakeBuild = (async (_message: unknown, s: PushSubscription) => {
      if (s.endpoint.includes("boom")) throw new Error("crypto boom");
      return { headers: {}, method: "POST", body: new Uint8Array() };
    }) as unknown as import("../src/notifications/webpush").BuildPayload;
    await expect(new WebPushDelivery(kv, vapid, send, fakeBuild).deliver({ sub: "u" }, notif)).resolves.toBeUndefined();
    // Only the non-boom endpoint reaches the sender; boom fails at crypto.
    expect(send).toHaveBeenCalledTimes(1);
    expect(await listSubscriptions(kv, "u")).toHaveLength(2); // boom stays (not a 404/410)
  });
});
