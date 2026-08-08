/**
 * REST API — a THIN pass-through over the Tool Registry (v2.0 philosophy:
 * never UI → REST → business logic → MCP → business logic again).
 *
 * The registry is the single business logic; REST just parses HTTP, calls the
 * same tools, and serializes results.
 *
 * AUTH: requests are authenticated with the OAuth access token issued by the
 * Worker's own OAuth provider (Authorization: Bearer <token>). The token is
 * unwrapped with `unwrapToken` and the decrypted Props (sub/name/email) become
 * the request user. No token → 401.
 *
 * LOCAL DEV ONLY: set `REST_DEV_BYPASS=1` (e.g. in .dev.vars) to trust an
 * `X-User-Sub` header so the React app can exercise the API before OAuth is
 * wired into the UI. Never set this in production.
 */
import { Hono } from "hono";
import type { Env } from "../env";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { ToolRegistry, ToolRegistryError } from "../registry";
import { registerAll } from "../tools";
import { makeAIProvider } from "../ai";
import { repositories } from "../storage/repositories";
import { applySyncPush, pullOps } from "../storage/sync";
import { SyncPush } from "../domain/schemas";
import type { Props } from "../auth/props";

export const REST_PREFIX = "/api/v1";

interface RESTVariables {
  user: { sub: string; name?: string | null; email?: string | null };
}

type RESTBindings = Env & { OAUTH_PROVIDER: OAuthHelpers };

export function buildRestApp(): Hono<{ Bindings: RESTBindings; Variables: RESTVariables }> {
  const app = new Hono<{ Bindings: RESTBindings; Variables: RESTVariables }>();

  // --- auth guard ----------------------------------------------------------
  app.use("*", async (c, next) => {
    // 1) Production path: Bearer token issued by this Worker's OAuth provider.
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (token) {
      const summary = await c.env.OAUTH_PROVIDER.unwrapToken<Props>(token);
      const props = summary?.grant?.props;
      if (props?.sub) {
        c.set("user", { sub: props.sub, name: props.name ?? null, email: props.email ?? null });
        await next();
        return;
      }
      return c.json({ error: "unauthorized", hint: "invalid or expired token" }, 401);
    }

    // 2) Local-dev bridge (explicit opt-in, never on in production).
    if (c.env.REST_DEV_BYPASS === "1") {
      const sub = c.req.header("X-User-Sub");
      if (sub) {
        c.set("user", { sub, name: null, email: null });
        await next();
        return;
      }
    }

    return c.json({ error: "unauthorized", hint: "missing bearer token" }, 401);
  });

  // --- registry introspection ----------------------------------------------
  app.get("/registry", async (c) => {
    const registry = new ToolRegistry();
    registerAll(registry);
    return c.json({
      tools: registry.list().map((t) => ({ name: t.name, description: t.description, schema: (t.schema as any).shape })),
    });
  });

  // --- generic tool call (the one true path) --------------------------------
  app.post("/tools/:name", async (c) => {
    const registry = new ToolRegistry();
    registerAll(registry);
    const user = c.get("user") as { sub: string; name?: string | null; email?: string | null };
    const input = await c.req.json().catch(() => ({}));
    try {
      const result = await registry.call(c.req.param("name"), input, {
        env: c.env,
        user,
        ai: makeAIProvider(c.env),
        cache: c.env.OAUTH_KV,
        repos: repositories(c.env.BAKA_DB),
      });
      return c.json({ ok: true, result });
    } catch (e) {
      // Validation/user errors are 4xx; unexpected failures are 500.
      if (e instanceof ToolRegistryError) {
        const status = e.code === "invalid_input" || e.code === "unknown_tool" ? 400 : 500;
        return c.json({ ok: false, error: e.code, message: e.message }, status);
      }
      return c.json({ ok: false, error: "internal", message: (e as Error).message }, 500);
    }
  });

  // --- sync -----------------------------------------------------------------
  app.post("/sync/push", async (c) => {
    const user = c.get("user") as { sub: string };
    const body = await c.req.json();
    const parsed = SyncPush.safeParse(body);
    if (!parsed.success) return c.json({ error: "invalid_push", detail: parsed.error.message }, 400);
    const result = await applySyncPush(c.env.BAKA_DB, user.sub, parsed.data);
    return c.json(result);
  });

  app.get("/sync/pull", async (c) => {
    const user = c.get("user") as { sub: string };
    const cursor = c.req.query("cursor");
    const result = await pullOps(c.env.BAKA_DB, user.sub, cursor ?? undefined);
    return c.json(result);
  });

  app.get("/whoami", async (c) => c.json(c.get("user")));

  return app;
}
