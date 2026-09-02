/**
 * Phase 3 — per-user Soul (BakaSur identity context).
 *
 * The Soul is a user-authored markdown document that gives BakaSur
 * persistent knowledge about the user: their goals, work style, preferences,
 * communication boundaries, and current context.
 *
 * Storage: KV (OAUTH_KV) under `baka:soul:{sub}` — same pattern as
 * aiSettings. Server-authoritative: never trust client-supplied sub.
 *
 * Security:
 *   - Soul content is treated as DATA by the AI pipeline, never as
 *     higher-priority instructions than the immutable system prompt.
 *   - Size limit: 8KB (prevents abuse, fits comfortably in KV).
 *   - Sanitization: strip control chars (except newline/tab), clamp length.
 *   - Ownership: server derives sub from auth token exclusively.
 *   - No secrets/credentials — template warns users explicitly.
 */
import { z } from "zod";

/** Maximum Soul content size in characters (8 KB). */
export const SOUL_MAX_CHARS = 8_000;

/**
 * Stored Soul shape. Content is raw markdown — the AI pipeline
 * sanitizes it before injection into the system prompt.
 */
export const SoulSchema = z.object({
  /** User-authored markdown describing who they are. */
  content: z.string().max(SOUL_MAX_CHARS).default(""),
  /** ISO timestamp of last update. */
  updated_at: z.string().default(""),
});

export type Soul = z.infer<typeof SoulSchema>;

export const DEFAULT_SOUL: Soul = { content: "", updated_at: "" };

const SOUL_KEY = (sub: string) => `baka:soul:${sub}`;

/**
 * Sanitize raw user text for storage: strip control chars (keep
 * newline/tab), trim, clamp to SOUL_MAX_CHARS.
 */
export function sanitizeSoulContent(raw: string): string {
  const cleaned = raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .trim();
  if (cleaned.length <= SOUL_MAX_CHARS) return cleaned;
  return cleaned.slice(0, SOUL_MAX_CHARS).trimEnd();
}

/** Load a user's Soul from KV. Returns DEFAULT_SOUL if none exists. */
export async function loadSoul(kv: KVNamespace, sub: string): Promise<Soul> {
  const raw = await kv.get(SOUL_KEY(sub));
  if (!raw) return DEFAULT_SOUL;
  try {
    const parsed = SoulSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_SOUL;
  } catch {
    return DEFAULT_SOUL;
  }
}

/** Save a user's Soul to KV. Content is sanitized before storage. */
export async function saveSoul(kv: KVNamespace, sub: string, soul: Soul): Promise<Soul> {
  const sanitized: Soul = {
    content: sanitizeSoulContent(soul.content),
    updated_at: new Date().toISOString(),
  };
  await kv.put(SOUL_KEY(sub), JSON.stringify(soulSchemaValidated(sanitized)));
  return sanitized;
}

/** Delete a user's Soul from KV. */
export async function deleteSoul(kv: KVNamespace, sub: string): Promise<void> {
  await kv.delete(SOUL_KEY(sub));
}

function soulSchemaValidated(s: Soul): Soul {
  const parsed = SoulSchema.safeParse(s);
  return parsed.success ? parsed.data : DEFAULT_SOUL;
}
