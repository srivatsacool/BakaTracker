/**
 * WS2-4: Web Push delivery chain — deterministic, end-to-end (no browser,
 * no network, no real push service).
 *
 * Proves the FULL chain on the worker side:
 *   1. REST subscription lifecycle through the BUILT app (buildRestApp):
 *      register / upsert / delete / auth / ownership isolation / cap.
 *   2. Delivery: a subscription stored VIA THE REST ROUTE is picked up by
 *      WebPushDelivery and sent to the real `@block65/webcrypto-web-push`
 *      crypto path (ECDH + HKDF + AES-128-GCM), with a fake sender capturing
 *      the outbound request. We assert the sender received the right
 *      endpoint, TTL, urgency, the VAPID authorization header, the crypto
 *      headers (crypto-key dh=…, encryption salt=…), and a NON-EMPTY
 *      encrypted body. We deliberately do NOT decrypt — presence of
 *      ciphertext bytes + crypto headers is the transport contract.
 *
 * NOTE on encoding: this library emits `content-encoding: aesgcm`
 * (RFC 8291's predecessor) — the assertion tracks what the code under test
 * actually produces. The task's invariant — "encrypted bytes present and
 * crypto headers exist" — is what we assert.
 */
import { env } from "cloudflare:test";
import { describe, it, expect, vi } from "vitest";
import { listSubscriptions, MAX_SUBSCRIPTIONS_PER_USER } from "../src/notifications/pushStore";
import { WebPushDelivery, type PushSender } from "../src/notifications/webpush";
import { testVapidKeys, testBrowserSubscription } from "./push-keys";
import type { Notification } from "../src/notifications/types";
import type { PushSubscription } from "@block65/webcrypto-web-push";

const { buildRestApp, REST_PREFIX } = await import("../src/http/rest");
const { Hono } = await import("hono");

/** Mirrors index.ts mounting (same as notifications.spec.ts). */
const api = new Hono();
api.route(REST_PREFIX, buildRestApp());

const SUB_URL = "http://localhost/api/v1/push/subscription";

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

async function postSubscription(sub: unknown, userSub?: string): Promise<Response> {
  return api.request(
    SUB_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userSub ? { "X-User-Sub": userSub } : {}),
      },
      body: JSON.stringify(sub),
    },
    env as any,
  );
}

async function deleteSubscriptionReq(endpoint: string, userSub: string): Promise<Response> {
  return api.request(
    SUB_URL,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-User-Sub": userSub },
      body: JSON.stringify({ endpoint }),
    },
    env as any,
  );
}

describe("push REST subscription lifecycle (through buildRestApp)", () => {
  it("rejects anonymous requests with 401", async () => {
    const res = await postSubscription(await testBrowserSubscription(), undefined);
    expect(res.status).toBe(401);
  });

  it("registers a valid subscription → 201 created, persisted to KV", async () => {
    const sub = await testBrowserSubscription();
    const res = await postSubscription(sub, "rest_alice");
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, result: "created" });

    const stored = await listSubscriptions(env.PUSH_SUBSCRIPTIONS, "rest_alice");
    expect(stored).toHaveLength(1);
    expect(stored[0].endpoint).toBe(sub.endpoint);
    expect(stored[0].keys).toEqual(sub.keys);
  });

  it("upserts on re-registration of the same endpoint → 201 updated", async () => {
    const sub = await testBrowserSubscription();
    await postSubscription(sub, "rest_bob");
    const sub2 = { ...sub, keys: (await testBrowserSubscription()).keys };
    const res = await postSubscription(sub2, "rest_bob");
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, result: "updated" });
    const stored = await listSubscriptions(env.PUSH_SUBSCRIPTIONS, "rest_bob");
    expect(stored).toHaveLength(1);
    expect(stored[0].keys).toEqual(sub2.keys);
  });

  it("rejects a malformed subscription with 400", async () => {
    const res = await postSubscription({ endpoint: "http://evil.example/p", keys: { auth: "a", p256dh: "b" } }, "rest_carol");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_subscription");
  });

  it("DELETE removes the caller's subscription; ownership is isolated", async () => {
    const alice1 = await testBrowserSubscription();
    const alice2 = await testBrowserSubscription();
    await postSubscription(alice1, "rest_del_a");
    await postSubscription(alice2, "rest_del_a");
    await postSubscription(await testBrowserSubscription(), "rest_del_b");

    // User B tries to delete user A's endpoint → not removed (no cross-user access).
    const cross = await deleteSubscriptionReq(alice1.endpoint, "rest_del_b");
    expect(cross.status).toBe(200);
    expect(await cross.json()).toEqual({ ok: true, removed: false });
    expect(await listSubscriptions(env.PUSH_SUBSCRIPTIONS, "rest_del_a")).toHaveLength(2);

    // User A deletes their own endpoint → removed.
    const own = await deleteSubscriptionReq(alice1.endpoint, "rest_del_a");
    expect(await own.json()).toEqual({ ok: true, removed: true });
    const remaining = await listSubscriptions(env.PUSH_SUBSCRIPTIONS, "rest_del_a");
    expect(remaining.map((s) => s.endpoint)).toEqual([alice2.endpoint]);

    // Deleting again is a no-op.
    expect(await (await deleteSubscriptionReq(alice1.endpoint, "rest_del_a")).json()).toEqual({ ok: true, removed: false });
  });

  it("DELETE without an endpoint → 400", async () => {
    const res = await api.request(
      SUB_URL,
      { method: "DELETE", headers: { "Content-Type": "application/json", "X-User-Sub": "rest_del_c" }, body: "{}" },
      env as any,
    );
    expect(res.status).toBe(400);
  });

  it("enforces the per-user cap through the REST route (LRU eviction)", async () => {
    const user = "rest_cap";
    for (let i = 0; i < MAX_SUBSCRIPTIONS_PER_USER + 2; i++) {
      const res = await postSubscription(await testBrowserSubscription(), user);
      expect(res.status).toBe(201);
    }
    const stored = await listSubscriptions(env.PUSH_SUBSCRIPTIONS, user);
    expect(stored).toHaveLength(MAX_SUBSCRIPTIONS_PER_USER);
  });
});

describe("Web Push delivery chain (REST store → WebPushDelivery → sender)", () => {
  it("delivers an encrypted RFC-style payload to the REST-registered endpoint with VAPID auth", async () => {
    // 1. Register the device through the REAL REST route (no direct store calls).
    const sub = await testBrowserSubscription();
    const res = await postSubscription(sub, "chain_user");
    expect(res.status).toBe(201);

    // 2. Real VAPID keys + REAL library crypto (buildPushPayload), fake sender.
    const vapid = await testVapidKeys();
    const sendMock = vi.fn(async () => new Response(null, { status: 201 }));
    const send = sendMock as unknown as PushSender;
    const delivery = new WebPushDelivery(env.PUSH_SUBSCRIPTIONS, vapid, send);

    // 3. Deliver — the same object the engine would call.
    await delivery.deliver({ sub: "chain_user" }, notif);

    // 4. The sender received exactly one outbound request for the stored endpoint.
    expect(send).toHaveBeenCalledTimes(1);
    const [sentSub, payload] = sendMock.mock.calls[0] as [PushSubscription, { headers: Record<string, string>; method: string; body: Uint8Array }];
    expect(sentSub.endpoint).toBe(sub.endpoint);

    // 5. Transport contract on the payload.
    expect(payload.method).toBe("post");
    expect(payload.headers["ttl"]).toBe("86400"); // 24h from webpush.ts
    expect(payload.headers["urgency"]).toBe("normal");
    // VAPID authorization header present (private key configured).
    expect(payload.headers["authorization"]).toBeTruthy();
    expect(payload.headers["authorization"].startsWith("WebPush ")).toBe(true);
    // Crypto headers: ECDH ephemeral key + VAPID public key + salt.
    expect(payload.headers["crypto-key"]).toContain("dh=");
    expect(payload.headers["crypto-key"]).toContain("p256ecdsa=");
    expect(payload.headers["encryption"]).toMatch(/^salt=/);
    expect(payload.headers["content-encoding"]).toBe("aesgcm");
    // NON-EMPTY encrypted body (AES-128-GCM ciphertext — we do not decrypt).
    expect(payload.body).toBeInstanceOf(Uint8Array);
    expect(payload.body.byteLength).toBeGreaterThan(0);
    expect(payload.headers["content-length"]).toBe(String(payload.body.byteLength));
  });

  it("is a no-op for users with no stored subscription (sender untouched)", async () => {
    const vapid = await testVapidKeys();
    const sendMock = vi.fn(async () => new Response(null, { status: 201 }));
    const send = sendMock as unknown as PushSender;
    const delivery = new WebPushDelivery(env.PUSH_SUBSCRIPTIONS, vapid, send);
    await delivery.deliver({ sub: "chain_ghost" }, notif);
    expect(send).not.toHaveBeenCalled();
  });
});
