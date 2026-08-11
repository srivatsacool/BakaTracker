/**
 * Notification delivery — the final, replaceable transport.
 *
 * Web Push / email / mobile are NOT built this phase (no existing push
 * infrastructure in the PWA; the spec forbids introducing large push infra
 * without need). Instead, delivery is an interface + two safe implementations:
 *
 *   - `LogDelivery` (default): deterministic, leak-free-ish preview used by
 *     dev and the scheduled handler today. Logs ids + type + tone + message.
 *   - `NullDelivery`: for tests / explicit no-op.
 *
 * Decision (candidates) → Policy → AI message → Delivery stay separate, so a
 * future Web Push or email transport is a new class, not a rewrite.
 */
import type { Notification, NotificationDelivery } from "./types";

/** Deterministic default delivery: writes to the worker's structured logs.
 * NOTE: a future production delivery (Web Push) must NOT log message bodies —
 * this stub logs them because in dev they ARE the preview. */
export class LogDelivery implements NotificationDelivery {
  readonly name = "log";
  async deliver(
    user: { sub: string; name?: string | null; email?: string | null },
    notif: Notification,
  ): Promise<void> {
    console.log(
      `[baka:notif] deliver=${notif.id} user=${user.sub} type=${notif.type} tone=${notif.tone} message="${notif.message}"`,
    );
  }
}

/** No-op delivery (tests, feature-flag "evaluate only"). */
export class NullDelivery implements NotificationDelivery {
  readonly name = "null";
  async deliver(): Promise<void> {
    /* intentionally nothing */
  }
}
