/**
 * Notification domain types — proactive BakaSur foundation (v2.1).
 *
 * Separation of concerns (docs/ai/notifications.md):
 *   NotificationCandidate  → deterministic "something meaningful happened"
 *   NotificationPolicy     → should we tell the user? (cost-free KV checks)
 *   AIMessageGenerator     → how to phrase it (Workers AI, bounded)
 *   NotificationDelivery   → how to reach the user (abstraction; Web Push later)
 *
 * The model only ever sees the bounded `context` object below. It never sees
 * D1/R2, never decides WHETHER to notify, and can never change policy.
 */

export const NOTIF_TONES = ["gentle", "motivational", "funny", "tsundere", "savage", "celebratory"] as const;
export type NotifTone = (typeof NOTIF_TONES)[number];

export const NOTIF_CATEGORIES = [
  "overdue_task",
  "deadline_approaching",
  "streak_at_risk",
  "streak_milestone",
] as const;
export type NotifCategory = (typeof NOTIF_CATEGORIES)[number];

/** Priority: higher = more urgent. Drives per-run candidate ordering. */
export type NotifPriority = 1 | 2 | 3;

/** A deterministic, structured "something meaningful happened" event. */
export interface NotificationCandidate {
  type: NotifCategory;
  priority: NotifPriority;
  entity_id: string;
  user_id: string;
  /** Minimal, structured facts the AI may use to phrase the message.
   *  Titles are the user's own data; no ids, no emails, no raw bodies. */
  context: Record<string, string | number>;
}

/** A fully generated, policy-approved, deliverable notification. */
export interface Notification {
  id: string;
  user_id: string;
  type: NotifCategory;
  priority: NotifPriority;
  entity_id: string;
  tone: NotifTone;
  message: string;
  created_at: string;
  /** Structured facts that produced this notification (history/UI use). */
  context: Record<string, string | number>;
}

/** Delivery abstraction — notification DECISION vs GENERATION vs DELIVERY
 * stay separate so email/mobile/Web Push can be added without touching the
 * intelligence. Web Push is NOT built this phase (no existing infra). */
export interface NotificationDelivery {
  readonly name: string;
  deliver(user: { sub: string; name?: string | null; email?: string | null }, notif: Notification): Promise<void>;
}
