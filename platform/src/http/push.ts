/**
 * Push subscription REST surface — where the PWA registers/unregisters its
 * Web Push `PushSubscription` (obtained from `pushManager.subscribe()`).
 *
 *   POST /api/v1/push/subscription  → register (upsert) the caller's device
 *   DELETE /api/v1/push/subscription → remove one device (by endpoint)
 *
 * Thin pass-through to pushStore (KV-backed). Auth is the SAME Bearer guard
 * as the rest of the REST app (rest.ts `app.use("*")`); the authenticated
 * user's `sub` scopes every subscription so one user can never read/overwrite
 * another's push endpoints.
 */
import type { Context } from "hono";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { Env } from "../env";
import { putSubscription, deleteSubscription } from "../notifications/pushStore";

type RESTBindings = Env & { OAUTH_PROVIDER: OAuthHelpers };
interface RESTVariables {
  user: { sub: string; name?: string | null; email?: string | null };
}

export async function handlePostSubscription(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
): Promise<Response> {
  const user = c.get("user");
  if (!c.env.PUSH_SUBSCRIPTIONS) {
    return c.json({ ok: false, error: "push_unavailable", message: "Push is not configured on this server." }, 503);
  }
  const body = await c.req.json().catch(() => null);
  const result = await putSubscription(c.env.PUSH_SUBSCRIPTIONS, user.sub, body);
  if (result === "rejected") {
    return c.json({ ok: false, error: "invalid_subscription", message: "Malformed PushSubscription." }, 400);
  }
  return c.json({ ok: true, result }, 201);
}

export async function handleDeleteSubscription(
  c: Context<{ Bindings: RESTBindings; Variables: RESTVariables }>,
): Promise<Response> {
  const user = c.get("user");
  if (!c.env.PUSH_SUBSCRIPTIONS) {
    return c.json({ ok: false, error: "push_unavailable", message: "Push is not configured on this server." }, 503);
  }
  const body = await c.req.json().catch(() => null);
  const endpoint = (body as { endpoint?: unknown } | null)?.endpoint;
  if (typeof endpoint !== "string" || endpoint.length === 0) {
    return c.json({ ok: false, error: "invalid_input", message: "Missing `endpoint`." }, 400);
  }
  const removed = await deleteSubscription(c.env.PUSH_SUBSCRIPTIONS, user.sub, endpoint);
  return c.json({ ok: true, removed });
}
