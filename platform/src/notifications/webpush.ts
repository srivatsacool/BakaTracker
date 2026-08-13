/**
 * Web Push delivery — the production transport for the proactive BakaSur
 * notification engine (checkpoint v2.1B + Phase 9 track 3E).
 *
 * Implements the existing `NotificationDelivery` seam (types.ts) so the engine
 * (engine.ts) stays unaware of HOW the user is reached. The engine's
 * decision (candidates/policy) and phrasing (AI message) are untouched; this
 * class only adds WHERE (Web Push).
 *
 * Uses `@block65/webcrypto-web-push` — the Cloudflare-Workers-compatible
 * variant of the `web-push` library. The popular `web-push` npm package relies
 * on Node's `crypto`, which is unavailable in the Workers runtime, so it cannot
 * run here. `@block65/webcrypto-web-push` exposes `buildPushPayload()`, which
 * returns the signed headers + encrypted body; we then POST that body to the
 * subscription endpoint using the Workers `fetch`.
 *
 * Personalization invariants preserved:
 *   - WHETHER (should we notify?)  → policy engine, never this file.
 *   - HOW    (what do we say?)     → AI message generator, never this file.
 *   - WHERE  (reach the user)      → this file.
 */
import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { PushSubscription } from "@block65/webcrypto-web-push";
import type { Notification, NotificationDelivery } from "./types";
import { listSubscriptions, deleteSubscription } from "./pushStore";

export interface VapidConfig {
  subject: string;
  publicKey: string;
  privateKey: string;
}

/** Thin seam so unit tests inject a fake sender (no real network/crypto). */
export interface PushSender {
  (subscription: PushSubscription, payload: { headers: Record<string, string>; method: string; body: Uint8Array }): Promise<Response>;
}

/** Default sender: POST the encrypted payload to the browser's push endpoint. */
const defaultSender: PushSender = async (subscription, payload) => {
  return fetch(subscription.endpoint, {
    method: payload.method,
    headers: payload.headers,
    body: payload.body,
  });
};

/**
 * The crypto step (ECDH + VAPID signing) is its own seam so tests can stub it
 * without generating real curve keys. Production uses the library's
 * `buildPushPayload`; tests inject a deterministic stand-in.
 */
export type BuildPayload = (
  message: { data: unknown; options?: { urgency?: "low" | "normal" | "high"; ttl?: number } },
  subscription: PushSubscription,
  vapid: VapidConfig,
) => Promise<{ headers: Record<string, string>; method: string; body: Uint8Array }>;

const defaultBuildPayload: BuildPayload = (message, subscription, vapid) =>
  buildPushPayload(
    // The library requires `Jsonifiable` data; our payloads are always plain
    // JSON objects built inline, so the cast is safe.
    message as Parameters<typeof buildPushPayload>[0],
    subscription,
    {
      subject: vapid.subject,
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
    },
  );

export class WebPushDelivery implements NotificationDelivery {
  readonly name = "webpush";

  constructor(
    private readonly kv: KVNamespace,
    private readonly vapid: VapidConfig,
    /** Override for tests; normally posts to the real endpoint. */
    private readonly sender: PushSender = defaultSender,
    /** Override for tests; normally the real crypto from the library. */
    private readonly buildPayload: BuildPayload = defaultBuildPayload,
  ) {}

  /** Whether VAPID + a subscription KV are configured. Engine checks this. */
  static isConfigured(env: { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string; VAPID_SUBJECT?: string }): boolean {
    return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
  }

  async deliver(user: { sub: string; name?: string | null; email?: string | null }, notif: Notification): Promise<void> {
    const subs = await listSubscriptions(this.kv, user.sub);
    if (subs.length === 0) return; // Nothing to deliver to — not an error.

    // Derive a human title from the category/tone; body is the AI phrasing.
    const title = titleFor(notif);
    const url = deepLinkFor(notif);
    const message = { title, body: notif.message, tag: notif.type, url };

    const vapid = { subject: this.vapid.subject, publicKey: this.vapid.publicKey, privateKey: this.vapid.privateKey };

    // Send to each device independently; one bad endpoint must not block others.
    let expired: string[] = [];
    await Promise.all(
      subs.map(async (sub) => {
        try {
          // The library's `options` is `RequireAtLeastOne<{ttl,topic,urgency}>`;
          // a plain object literal with both isn't accepted by the narrowed
          // type, so construct + cast. `urgency:"normal"` alone satisfies it.
          const payload = await this.buildPayload(
            { data: message, options: { urgency: "normal" as const, ttl: 60 * 60 * 24 } as { urgency: "normal" } },
            sub,
            vapid,
          );
          const res = await this.sender(sub, payload);
          // 404/410 = subscription no longer valid (unsubscribed / expired).
          if (res.status === 404 || res.status === 410) {
            expired.push(sub.endpoint);
          } else if (!res.ok) {
            console.warn(`[baka:push] send failed sub=${sub.endpoint} status=${res.status}`);
          }
        } catch (err) {
          // Crypto failure (bad keys) or network — log, keep going.
          console.warn(`[baka:push] send error sub=${sub.endpoint}: ${(err as Error).message}`);
        }
      }),
    );

    // Garbage-collect expired endpoints so the list stays small + deliverable.
    for (const endpoint of expired) {
      await deleteSubscription(this.kv, user.sub, endpoint).catch(() => {});
    }
  }
}

const TITLE_BY_TYPE: Record<string, string> = {
  overdue_task: "Baka says: task overdue 🐾",
  deadline_approaching: "Heads up — deadline near 🐾",
  streak_at_risk: "Don't break the streak! 🔥",
  streak_milestone: "Streak milestone! 🎉",
};

function titleFor(notif: Notification): string {
  return TITLE_BY_TYPE[notif.type] ?? "BakaTracker";
}

/** Deep-link into the app. Tasks carry an entity_id we can jump to. */
function deepLinkFor(notif: Notification): string {
  if (notif.entity_id) return `/tasks/${notif.entity_id}`;
  return "/";
}
