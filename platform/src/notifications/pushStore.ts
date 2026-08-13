/**
 * Push subscription store — per-device Web Push registrations for a user.
 *
 * A user may register push on multiple devices (laptop, phone, …). Each
 * browser subscription is keyed by its unique `endpoint` (the W3C Push API
 * guarantees endpoint uniqueness per subscription). We store all of a user's
 * subscriptions in a single KV record, bounded to MAX_SUBSCRIPTIONS_PER_USER,
 * so delivery loops over the list and stale endpoints expire themselves (the
 * delivery layer deletes 404/410 endpoints on send).
 *
 * Key convention (mirrors policy.ts `baka:notif:state:${sub}`):
 *   `baka:push:subs:${sub}` → { subscriptions: PushSubscription[] }
 *
 * Secrets (VAPID) live in `env`, never here.
 */
import type { PushSubscription } from "@block65/webcrypto-web-push";

const SUBS_KEY = (sub: string) => `baka:push:subs:${sub}`;
/** Bound KV writes + delivery fan-out. Five devices is generous for one user. */
export const MAX_SUBSCRIPTIONS_PER_USER = 5;

interface SubscriptionRecord {
  subscriptions: PushSubscription[];
}

function isPushSubscription(v: unknown): v is PushSubscription {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  if (typeof s.endpoint !== "string") return false;
  try {
    const url = new URL(s.endpoint);
    if (url.protocol !== "https:") return false;
  } catch {
    return false;
  }
  const keys = s.keys;
  if (typeof keys !== "object" || keys === null) return false;
  const k = keys as Record<string, unknown>;
  // p256dh + auth are base64url-encoded curve keys; presence + string-ness is
  // enough for a transport-time validation — the crypto layer will reject bad
  // keys at send time.
  return typeof k.auth === "string" && k.auth.length > 0 && typeof k.p256dh === "string" && k.p256dh.length > 0;
}

export async function listSubscriptions(kv: KVNamespace, userId: string): Promise<PushSubscription[]> {
  const raw = await kv.get(SUBS_KEY(userId));
  if (!raw) return [];
  try {
    const rec = JSON.parse(raw) as SubscriptionRecord;
    if (!Array.isArray(rec.subscriptions)) return [];
    // Defensive: drop anything that no longer matches the shape (KV drift).
    return rec.subscriptions.filter(isPushSubscription);
  } catch {
    return [];
  }
}

/**
 * Register (upsert) a subscription. Returns "created" | "updated" | "rejected".
 * An endpoint already present is replaced (new keys, e.g. after re-subscribe).
 * When at the cap, the oldest registration is evicted to make room (LRU by
 * insertion order — we append, so index 0 is oldest).
 */
export async function putSubscription(
  kv: KVNamespace,
  userId: string,
  sub: unknown,
): Promise<"created" | "updated" | "rejected"> {
  if (!isPushSubscription(sub)) return "rejected";

  const subs = await listSubscriptions(kv, userId);
  const idx = subs.findIndex((s) => s.endpoint === sub.endpoint);
  if (idx >= 0) {
    subs[idx] = sub;
    await kv.put(SUBS_KEY(userId), JSON.stringify({ subscriptions: subs } satisfies SubscriptionRecord));
    return "updated";
  }

  subs.push(sub);
  while (subs.length > MAX_SUBSCRIPTIONS_PER_USER) subs.shift();
  await kv.put(SUBS_KEY(userId), JSON.stringify({ subscriptions: subs } satisfies SubscriptionRecord));
  return "created";
}

/** Delete one device's subscription (by endpoint). Returns true if something was removed. */
export async function deleteSubscription(kv: KVNamespace, userId: string, endpoint: string): Promise<boolean> {
  const subs = await listSubscriptions(kv, userId);
  const next = subs.filter((s) => s.endpoint !== endpoint);
  if (next.length === subs.length) return false;
  await kv.put(SUBS_KEY(userId), JSON.stringify({ subscriptions: next } satisfies SubscriptionRecord));
  return true;
}

/** Remove every subscription for a user (sign-out-from-all-devices / opt-out). */
export async function deleteAllSubscriptions(kv: KVNamespace, userId: string): Promise<void> {
  await kv.delete(SUBS_KEY(userId));
}
