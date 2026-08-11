/**
 * Notification settings REST surface — user-scoped preferences for the
 * proactive BakaSur engine. Thin pass-through to the settings service
 * (KV-backed, no new infrastructure).
 *
 *   GET /api/v1/notifications/settings → { ok, settings }
 *   PUT /api/v1/notifications/settings → { ok, settings } (validated; missing
 *       fields fall back to defaults — full-replace semantics)
 *
 * The AI never changes these: only the authenticated user (or the UI on
 * their behalf) can. The notification engine reads the same KV records.
 */
import type { Context } from "hono";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { Env } from "../env";
import { loadSettings, saveSettings, NotificationSettingsSchema } from "../notifications/settings";

/** Structurally identical to rest.ts's RESTBindings (no import cycle). */
type RESTBindings = Env & { OAUTH_PROVIDER: OAuthHelpers };
interface RESTVariables {
  user: { sub: string; name?: string | null; email?: string | null };
}

export async function handleGetSettings(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
): Promise<Response> {
  const user = c.get("user");
  const settings = await loadSettings(c.env.OAUTH_KV, user.sub);
  return c.json({ ok: true, settings });
}

export async function handlePutSettings(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
): Promise<Response> {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = NotificationSettingsSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return c.json({ ok: false, error: "invalid_input", message: parsed.error.message }, 400);
  }
  await saveSettings(c.env.OAUTH_KV, user.sub, parsed.data);
  return c.json({ ok: true, settings: parsed.data });
}
