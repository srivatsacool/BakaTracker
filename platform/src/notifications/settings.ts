/**
 * Notification settings — user-scoped preferences stored in the EXISTING
 * user-scoped KV mechanism (OAUTH_KV, `baka:notif:settings:{sub}`). No new
 * infrastructure; no D1 migration.
 *
 * Personality changes WORDING only (the `tone`); business rules (what fires,
 * caps, quiet hours) are fixed by the policy engine.
 */
import { z } from "zod";
import { NOTIF_TONES, NOTIF_CATEGORIES } from "./types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const NotificationSettingsSchema = z.object({
  /** Master opt-in/opt-out for proactive notifications. */
  enabled: z.boolean().default(true),
  /** BakaSur personality — wording only, never business rules. */
  tone: z.enum(NOTIF_TONES).default("gentle"),
  /** IANA timezone for quiet hours + "today" computations. */
  timezone: z.string().min(1).max(64).default("UTC"),
  quiet_hours: z
    .object({
      enabled: z.boolean().default(false),
      start: z.string().regex(TIME_RE, "HH:MM").default("22:00"),
      end: z.string().regex(TIME_RE, "HH:MM").default("07:00"),
    })
    .default({ enabled: false, start: "22:00", end: "07:00" }),
  /** Hard daily cap on AI-generated notifications (0 = none at all). */
  max_per_day: z.number().int().min(0).max(20).default(3),
  /** Per-category opt-out. */
  categories: z
    .record(z.enum(NOTIF_CATEGORIES), z.boolean())
    .default({
      overdue_task: true,
      deadline_approaching: true,
      streak_at_risk: true,
      streak_milestone: true,
    }),
});
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

export const DEFAULT_SETTINGS: NotificationSettings = NotificationSettingsSchema.parse({});

const SETTINGS_KEY = (sub: string) => `baka:notif:settings:${sub}`;

export async function loadSettings(kv: KVNamespace, sub: string): Promise<NotificationSettings> {
  const raw = await kv.get(SETTINGS_KEY(sub));
  if (!raw) return DEFAULT_SETTINGS;
  const parsed = NotificationSettingsSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(kv: KVNamespace, sub: string, settings: NotificationSettings): Promise<void> {
  await kv.put(SETTINGS_KEY(sub), JSON.stringify(settings));
}
