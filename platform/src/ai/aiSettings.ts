/**
 * Phase 2B+3 — per-user AI settings (userSelectedQuota + custom_turns).
 *
 * The user controls their daily AI turn budget via Settings; the server
 * stores it in KV (OAUTH_KV) under `baka:ai:settings:{sub}` and enforces
 * `effective = min(selected, planMax, hostCap)` for Limited mode.
 *
 * Phase 3 adds Custom mode: when custom_turns is set (not null), the
 * effective daily quota is exactly that value with NO planMax/hostCap ceiling.
 * This replaces the previous Unlimited feature.
 *
 * Migration: existing `unlimited: true` settings are migrated to
 * custom_turns: 500 on first read. The `unlimited` field is removed
 * from the schema after migration.
 *
 * Server is authoritative: the value is read only from KV, never from the
 * request body. The PUT endpoint validates and stores; the chat endpoint
 * reads the stored value.
 */
import { z } from "zod";

export const AiSettingsSchema = z.object({
  /** Daily AI turns the user wants in Limited mode (1..500, clamped by plan/host). */
  ai_turns_per_day: z.number().int().min(1).max(500).default(30),
  /** Phase 3: custom daily turn count. When not null, overrides ai_turns_per_day
   *  with NO planMax/hostCap ceiling. Null = Limited mode. */
  custom_turns: z.number().int().min(1).max(100000).nullable().default(null),
  /** Legacy field — migrated away on read. Ignored in current logic. */
  unlimited: z.boolean().optional(),
});

export type AiSettings = z.infer<typeof AiSettingsSchema>;

export const DEFAULT_AI_SETTINGS: AiSettings = { ai_turns_per_day: 30, custom_turns: null };

const AI_SETTINGS_KEY = (sub: string) => `baka:ai:settings:${sub}`;

/** Migration value when unlimited: true is found in legacy settings. */
const UNLIMITED_MIGRATION_CUSTOM = 500;

export async function loadAiSettings(kv: KVNamespace, sub: string): Promise<AiSettings> {
  const raw = await kv.get(AI_SETTINGS_KEY(sub));
  if (!raw) return DEFAULT_AI_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    // Migration: convert legacy unlimited: true → custom_turns: 500
    if (parsed.unlimited === true && parsed.custom_turns == null) {
      parsed.custom_turns = UNLIMITED_MIGRATION_CUSTOM;
      delete parsed.unlimited;
      // Persist migration immediately
      await kv.put(AI_SETTINGS_KEY(sub), JSON.stringify({ ai_turns_per_day: parsed.ai_turns_per_day ?? 30, custom_turns: parsed.custom_turns }));
    }
    const result = AiSettingsSchema.safeParse(parsed);
    return result.success ? result.data : DEFAULT_AI_SETTINGS;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export async function saveAiSettings(kv: KVNamespace, sub: string, settings: AiSettings): Promise<AiSettings> {
  // Strip legacy unlimited field before saving
  const { unlimited: _, ...clean } = settings as any;
  const parsed = AiSettingsSchema.parse(clean);
  await kv.put(AI_SETTINGS_KEY(sub), JSON.stringify(parsed));
  return parsed;
}
