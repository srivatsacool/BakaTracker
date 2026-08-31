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
import { makeAIProvider, type AiService } from "../ai";
import { repositories, FileError } from "../storage/repositories";
import type { Note } from "../domain/schemas";
import { applySyncPush, pullOps } from "../storage/sync";
import { SyncPush } from "../domain/schemas";
import { MAX_FILE_SIZE, NotebookInput, CreatePageInput, UpdatePageInput, ReorderPageInput, SaveSceneInput, PAGE_SCENE_MAX_BYTES, PAGE_POSITION_STEP } from "../domain/schemas";
import type { Props } from "../auth/props";
import { cors } from "hono/cors";
import { isAllowedCorsOrigin, isLocalDevOrigin } from "../auth/app-origin";
import { handleNoteSummarize, handleNoteExplain, handleNoteAsk, handleNoteExtractTasks, handleNoteExtractConcepts, handleNoteGenerateQuestions, buildAiService } from "./notes-ai";
import { handleAssistantChat, handleGetAiSettings, handlePutAiSettings, handleGetQuota } from "./assistant";
import { handleGetSettings, handlePutSettings } from "./notifications";
import { handlePostSubscription, handleDeleteSubscription } from "./push";
import { nowISO } from "../shared/util";
import { PageSaveConflictError, PageNotFoundError } from "../storage/repositories/notes";

export const REST_PREFIX = "/api/v1";

interface RESTVariables {
  user: { sub: string; name?: string | null; email?: string | null };
}

type RESTBindings = Env & { OAUTH_PROVIDER: OAuthHelpers };

export interface RestAppOptions {
  /** Test seam: inject a fake AiService so AI tests need no live inference.
   * When omitted, the request-scoped service is built from the environment. */
  aiService?: AiService;
}

export function buildRestApp(options: RestAppOptions = {}): Hono<{ Bindings: RESTBindings; Variables: RESTVariables }> {
  const app = new Hono<{ Bindings: RESTBindings; Variables: RESTVariables }>();

  // --- CORS ----------------------------------------------------------------
  // The OAuthProvider shell adds CORS only to /token, /register, /mcp and the
  // metadata endpoint — the default handler (this REST API) passes through
  // untouched. A browser UI (Vite dev :5173 → Worker :8787, or Pages → Worker)
  // would be blocked on every call without these headers.
  //
  // Security: the allowlist is EXPLICIT — the configured APP_ORIGIN plus any
  // extra origins in CORS_ALLOWED_ORIGINS (comma-separated). No wildcard, no
  // reflection of arbitrary origins (a reflected origin would let any site
  // issue bearer-authenticated reads against the API). Auth is bearer-token,
  // not cookies, so `credentials` stays false — nothing to send cross-origin.
  // Requests with no Origin header (curl, MCP, same-origin fetches) pass
  // through CORS untouched.
  app.use(
    "*",
    cors({
      origin: (origin, c) =>
        isAllowedCorsOrigin(origin, c.env.APP_ORIGIN, c.env.CORS_ALLOWED_ORIGINS) ? origin : undefined,
      allowHeaders: ["Authorization", "Content-Type", "X-User-Sub"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      maxAge: 86400,
    }),
  );

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
    // Defense in depth: even if REST_DEV_BYPASS is accidentally set on a
    // deployed Worker, the bridge only honors the header when APP_ORIGIN is a
    // loopback origin — local `wrangler dev` is the only environment where
    // that is true. No legacy auth path exists in production.
    if (c.env.REST_DEV_BYPASS === "1" && isLocalDevOrigin(c.env.APP_ORIGIN)) {
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
        repos: repositories(c.env.BAKA_DB, c.env.R2_BUCKET),
      });
      return c.json({ ok: true, result });
    } catch (e) {
      // Validation/user errors are 4xx; unexpected failures are 500.
      if (e instanceof ToolRegistryError) {
        const status =
          e.code === "invalid_input" || e.code === "unknown_tool" ? 400
          : e.code === "not_found" ? 404
          : e.code === "not_configured" ? 501
          : 500;
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

  // --- files (R2 attachments) ------------------------------------------------
  // Dedicated routes: uploads are multipart and downloads are raw bytes, which
  // a JSON tool call cannot carry. Both paths hit the SAME FileRepository as
  // the registry tools (file_upload / file_list / file_get / file_delete) —
  // one business logic, two thin transports.
  //
  // SECURITY: the user is whatever the bearer token says (c.get("user").sub).
  // No user_id is ever read from the request body/query — R2 keys and D1 rows
  // are scoped by the authenticated identity only.

  app.post("/files", async (c) => {
    const user = c.get("user") as { sub: string };
    try {
      const form = await c.req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return c.json({ ok: false, error: "invalid_input", message: "Missing multipart field `file`." }, 400);
      }
      const body = await file.arrayBuffer();
      if (body.byteLength > MAX_FILE_SIZE) {
        return c.json(
          { ok: false, error: "too_large", message: `File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)} MiB upload limit.` },
          413,
        );
      }
      const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
      const meta = await repos.files.upload(user.sub, {
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        body,
      });
      return c.json({ ok: true, file: meta }, 201);
    } catch (e) {
      if (e instanceof FileError) {
        const status = e.code === "too_large" ? 413 : e.code === "not_configured" ? 501 : 400;
        return c.json({ ok: false, error: e.code, message: e.message }, status);
      }
      return c.json({ ok: false, error: "internal", message: (e as Error).message }, 500);
    }
  });

  app.get("/files", async (c) => {
    const user = c.get("user") as { sub: string };
    const limit = Number(c.req.query("limit") ?? 100);
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const files = await repos.files.list(user.sub, Number.isFinite(limit) ? limit : 100);
    return c.json({ ok: true, files });
  });

  // GET /files/:id — raw binary download (Content-Type + attachment filename).
  app.get("/files/:id", async (c) => {
    const user = c.get("user") as { sub: string };
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const file = await repos.files.get(user.sub, c.req.param("id"));
    if (!file) return c.json({ ok: false, error: "not_found", message: "File not found." }, 404);
    const disposition = `attachment; filename="${file.meta.filename.replace(/["\\]/g, "")}"`;
    return new Response(file.body, {
      headers: {
        "Content-Type": file.meta.mime_type,
        "Content-Disposition": disposition,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });

  app.delete("/files/:id", async (c) => {
    const user = c.get("user") as { sub: string };
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const removed = await repos.files.delete(user.sub, c.req.param("id"));
    if (!removed) return c.json({ ok: false, error: "not_found", message: "File not found." }, 404);
    return c.json({ ok: true, removed: true });
  });

  app.get("/whoami", async (c) => c.json(c.get("user")));

  // --- Notes AI actions (v2.1 contract; only `summarize` this phase) --------
  // Same global auth guard as everything above. The AI service is injected
  // for tests; in production it is built per request from the environment
  // (no binding locally → deterministic 503 ai_unavailable).
  app.post("/notes/:id/ai/summarize", async (c) => {
    const ai = options.aiService ?? buildAiService(c.env);
    return handleNoteSummarize(c, ai);
  });

  // --- Notes AI actions (v2.1 track 3C: read-only page interpretation) ------
  // All five are READ-ONLY: ownership → bounded input → structured generation.
  // For excalidraw pages the model sees the interpreted page representation
  // (metadata + text only), never the raw scene JSON.
  app.post("/notes/:id/ai/explain", async (c) => {
    const ai = options.aiService ?? buildAiService(c.env);
    return handleNoteExplain(c, ai);
  });

  app.post("/notes/:id/ai/ask", async (c) => {
    const ai = options.aiService ?? buildAiService(c.env);
    return handleNoteAsk(c, ai);
  });

  app.post("/notes/:id/ai/extract-tasks", async (c) => {
    const ai = options.aiService ?? buildAiService(c.env);
    return handleNoteExtractTasks(c, ai);
  });

  app.post("/notes/:id/ai/extract-concepts", async (c) => {
    const ai = options.aiService ?? buildAiService(c.env);
    return handleNoteExtractConcepts(c, ai);
  });

  app.post("/notes/:id/ai/generate-questions", async (c) => {
    const ai = options.aiService ?? buildAiService(c.env);
    return handleNoteGenerateQuestions(c, ai);
  });

  // --- v2.2: BakaSur global chat ---------------------------------------------
  // The UI has called this endpoint since the frontend completion plan; the
  // contract lands here now. Same injected-AiService pattern as notes AI.
  // Phase 2B: server-authoritative quota (effective = min(selected, planMax, hostCap)).
  app.post("/assistant/chat", async (c) => {
    const ai = options.aiService ?? buildAiService(c.env);
    return handleAssistantChat(c, ai);
  });
  app.get("/assistant/quota", handleGetQuota);
  app.get("/assistant/settings", handleGetAiSettings);
  app.put("/assistant/settings", handlePutAiSettings);

  // --- v2.1 Notebooks + Pages (Visual Notes persistence) ---------------------
  // Thin REST transport over the same Tool Registry tools — one business logic
  // layer, many transports. Auth guard above applies; user is ctx.user.sub only.
  // (The global auth middleware at app.use("*") already protects these routes.)

  // Notebooks: list + create + delete
  app.get("/notebooks", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    return c.json({ ok: true, notebooks: await repos.notebooks.list(user.sub) });
  });

  app.post("/notebooks", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const body = await c.req.json().catch(() => null);
    const parsed = NotebookInput.safeParse(body ?? {});
    if (!parsed.success) return c.json({ ok: false, error: "invalid_input", message: parsed.error.message }, 400);
    const now = nowISO();
    const count = await repos.notebooks.count(user.sub);
    const nb = {
      id: parsed.data.name === "Personal" && count === 0 ? "notebook_personal" : `notebook_${crypto.randomUUID()}`,
      user_id: user.sub,
      name: parsed.data.name,
      position: parsed.data.position ?? count * PAGE_POSITION_STEP,
      created_at: now,
      updated_at: now,
    };
    await repos.notebooks.upsert(nb);
    return c.json({ ok: true, notebook: nb }, 201);
  });

  app.delete("/notebooks/:id", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const nbId = c.req.param("id");
    // Reassign any pages in this notebook to the default notebook before deletion.
    const pages = await repos.notes.listPages(user.sub, nbId);
    if (pages.length > 0) {
      const defaultId = (await ensureDefaultNotebookRest(repos, user.sub)) ?? nbId;
      for (const p of pages) {
        await repos.notes.updatePageMeta(user.sub, p.id, { notebook_id: defaultId });
      }
    }
    const removed = await repos.notebooks.delete(user.sub, nbId);
    if (!removed) return c.json({ ok: false, error: "not_found", message: "Notebook not found." }, 404);
    return c.json({ ok: true, removed: true });
  });

  // Pages: create + list
  app.get("/notebooks/:id/pages", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const nbId = c.req.param("id");
    // Ownership gate — cross-user notebooks are indistinguishable from missing
    // (no existence oracle): 404 either way.
    const nb = await repos.notebooks.get(user.sub, nbId);
    if (!nb) return c.json({ ok: false, error: "not_found", message: "Notebook not found." }, 404);
    return c.json({ ok: true, pages: await repos.notes.listPages(user.sub, nbId) });
  });

  app.post("/pages", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const body = await c.req.json().catch(() => null);
    const parsed = CreatePageInput.safeParse(body ?? {});
    if (!parsed.success) return c.json({ ok: false, error: "invalid_input", message: parsed.error.message }, 400);
    // If a notebook_id is provided, verify ownership (no existence oracle for
    // other users' notebooks → 404 when it doesn't belong to the caller).
    let notebookId = parsed.data.notebook_id ?? c.req.query("notebook_id") ?? null;
    if (notebookId) {
      const nb = await repos.notebooks.get(user.sub, notebookId);
      if (!nb) return c.json({ ok: false, error: "not_found", message: "Notebook not found." }, 404);
      notebookId = nb.id;
    } else {
      notebookId = await ensureDefaultNotebookRest(repos, user.sub);
    }
    const page = await repos.notes.createPage(user.sub, {
      notebookId: notebookId ?? null,
      title: parsed.data.title,
      kind: parsed.data.kind,
    });
    return c.json({ ok: true, page }, 201);
  });

  // Pages: get + update + delete + duplicate + restore
  app.get("/pages/:id", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const page = await repos.notes.get(user.sub, c.req.param("id"));
    if (!page) return c.json({ ok: false, error: "not_found", message: "Page not found." }, 404);
    return c.json({ ok: true, page: toPageResponse(page) });
  });

  app.patch("/pages/:id", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const body = await c.req.json().catch(() => null);
    const parsed = UpdatePageInput.safeParse({ id: c.req.param("id"), ...(body ?? {}) });
    if (!parsed.success) return c.json({ ok: false, error: "invalid_input", message: parsed.error.message }, 400);
    const updated = await repos.notes.updatePageMeta(user.sub, parsed.data.id, {
      title: parsed.data.title,
      notebook_id: parsed.data.notebook_id,
      position: parsed.data.position,
    });
    if (!updated) return c.json({ ok: false, error: "not_found", message: "Page not found." }, 404);
    return c.json({ ok: true, page: toPageResponse(updated) });
  });

  app.delete("/pages/:id", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const archived = await repos.notes.archive(user.sub, c.req.param("id"));
    if (!archived) return c.json({ ok: false, error: "not_found", message: "Page not found." }, 404);
    return c.json({ ok: true, archived: true });
  });

  app.post("/pages/:id/duplicate", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const copy = await repos.notes.duplicatePage(user.sub, c.req.param("id"));
    if (!copy) return c.json({ ok: false, error: "not_found", message: "Page not found." }, 404);
    return c.json({ ok: true, page: toPageResponse(copy) }, 201);
  });

  app.post("/pages/:id/restore", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const restored = await repos.notes.restore(user.sub, c.req.param("id"));
    if (!restored) return c.json({ ok: false, error: "not_found", message: "Page not found or not archived." }, 404);
    return c.json({ ok: true, restored: true });
  });

  app.post("/pages/:id/archive", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const archived = await repos.notes.archive(user.sub, c.req.param("id"));
    if (!archived) return c.json({ ok: false, error: "not_found", message: "Page not found or already archived." }, 404);
    return c.json({ ok: true, archived: true });
  });

  // Pages: reorder + scene save
  app.post("/pages/reorder", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const body = await c.req.json().catch(() => null);
    const parsed = ReorderPageInput.safeParse(body ?? {});
    if (!parsed.success) return c.json({ ok: false, error: "invalid_input", message: parsed.error.message }, 400);
    const notebookId = c.req.query("notebook_id") ?? null;
    await repos.notes.reorder(user.sub, notebookId, parsed.data.order);
    return c.json({ ok: true, reordered: parsed.data.order.length });
  });

  app.put("/pages/:id/scene", async (c) => {
    const repos = repositories(c.env.BAKA_DB, c.env.R2_BUCKET);
    const user = c.get("user") as RESTVariables["user"];
    const body = await c.req.json().catch(() => null);
    const parsed = SaveSceneInput.safeParse({ id: c.req.param("id"), ...(body ?? {}) });
    if (!parsed.success) return c.json({ ok: false, error: "invalid_input", message: parsed.error.message }, 400);
    if (parsed.data.scene.length > PAGE_SCENE_MAX_BYTES) {
      return c.json({ ok: false, error: "too_large", message: `Scene exceeds the ${PAGE_SCENE_MAX_BYTES / (1024 * 1024)} MiB cap.` }, 413);
    }
    try {
      const revision = await repos.notes.saveScene(
        user.sub, parsed.data.id, parsed.data.scene, null, parsed.data.expected_revision,
      );
      return c.json({ ok: true, revision });
    } catch (e) {
      if (e instanceof PageSaveConflictError) {
        return c.json(
          { ok: false, error: "conflict", currentRevision: e.currentRevision,
            message: `Stale revision: expected ${parsed.data.expected_revision}, found ${e.currentRevision}.` },
          409,
        );
      }
      if (e instanceof PageNotFoundError) {
        return c.json({ ok: false, error: "not_found", message: "Page not found." }, 404);
      }
      return c.json({ ok: false, error: "internal", message: (e as Error).message }, 500);
    }
  });

  // --- Notification settings (proactive BakaSur preferences) ----------------
  app.get("/notifications/settings", handleGetSettings);
  app.put("/notifications/settings", handlePutSettings);

  // --- Web Push subscription registration (device ↔ user) ------------------
  app.post("/push/subscription", handlePostSubscription);
  app.delete("/push/subscription", handleDeleteSubscription);

  return app;
}

// --- v2.1 helpers ----------------------------------------------------------
/** Ensure the caller has a default "Personal" notebook; returns its id. */
async function ensureDefaultNotebookRest(
  repos: ReturnType<typeof repositories>, userId: string,
): Promise<string | null> {
  const nb = await repos.notebooks.get(userId, "notebook_personal");
  if (nb) return nb.id;
  const now = nowISO();
  const defaultNb = {
    id: "notebook_personal",
    user_id: userId,
    name: "Personal",
    position: 0,
    created_at: now,
    updated_at: now,
  };
  await repos.notebooks.upsert(defaultNb);
  return defaultNb.id;
}

/** Shape a Note row into the REST page response (strip internal columns). */
function toPageResponse(note: Note): Record<string, unknown> {
  return {
    id: note.id,
    user_id: note.user_id,
    title: note.title,
    body: note.body,
    kind: note.kind ?? "text",
    scene: note.scene ?? null,
    notebook_id: note.notebook_id ?? null,
    position: note.position ?? 0,
    archived_at: note.archived_at ?? null,
    revision: note.revision ?? 0,
    tags: note.tags ?? [],
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
}
