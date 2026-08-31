/**
 * Phase 2B — per-user AI settings (userSelectedQuota).
 *
 * The user controls their daily AI turn budget via Settings; the server
 * stores it in KV (OAUTH_KV) under `baka:ai:settings:{sub}` and enforces
 * `effective = min(selected, planMax, hostCap)`. Default is 30.
 *
 * Server is authoritative: the value is read only from KV, never from the
 * request body. The PUT endpoint validates and clamps; the chat endpoint
 * reads the stored value.
 */
import { z } from "zod";

export const AiSettingsSchema = z.object({
  /** Daily AI turns the user wants (1..500, clamped by plan/host on read). */
  ai_turns_per_day: z.number().int().min(1).max(500).default(30),
});

export type AiSettings = z.infer<typeof AiSettingsSchema>;

export const DEFAULT_AI_SETTINGS: AiSettings = { ai_turns_per_day: 30 };

const AI_SETTINGS_KEY = (sub: string) => `baka:ai:settings:${sub}`;

export async function loadAiSettings(kv: KVNamespace, sub: string): Promise<AiSettings> {
  const raw = await kv.get(AI_SETTINGS_KEY(sub));
  if (!raw) return DEFAULT_AI_SETTINGS;
  try {
    const parsed = AiSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_AI_SETTINGS;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export async function saveAiSettings(kv: KVNamespace, sub: string, settings: AiSettings): Promise<AiSettings> {
  const parsed = AiSettingsSchema.parse(settings);
  await kv.put(AI_SETTINGS_KEY(sub), JSON.stringify(parsed));
  return parsed;
}
