/**
 * Pages tools — notebook page CRUD, scene autosave, ordering, duplication.
 *
 * v2.1 Visual Notes backend foundation. Pages ARE notes (same `notes` table,
 * now carrying kind/scene/notebook_id/position/archived_at/revision). The
 * tool layer sits on top of NoteRepository + NotebookRepository, which sit on
 * top of db.ts SQL. No direct D1 access.
 *
 * Every handler enforces user ownership through ctx.user.sub.
 */
import { z } from "zod";
import type { Tool } from "../registry";
import { ToolRegistryError } from "../registry";
import type { Notebook, Note } from "../domain/schemas";
import {
  NotebookInput, CreatePageInput, UpdatePageInput, ReorderPageInput, SaveSceneInput,
  PAGE_POSITION_STEP, PAGE_LIST_MAX, PAGE_SCENE_MAX_BYTES,
} from "../domain/schemas";
import { PageSaveConflictError, PageNotFoundError } from "../storage/repositories/notes";
import { nowISO } from "../shared/util";

// --- Notebooks --------------------------------------------------------------

export const createNotebookTool: Tool<typeof NotebookInput> = {
  name: "create_notebook",
  description: "Create a notebook (default 'Personal' if name omitted). Returns the notebook.",
  schema: NotebookInput,
  async handler(ctx, input) {
    const now = nowISO();
    let position = input.position ?? 0;
    if (position === 0) {
      // Default: append to user's notebook list.
      const count = await ctx.repos.notebooks.count(ctx.user.sub);
      position = count * PAGE_POSITION_STEP;
    }
    const nb: Notebook = {
      id: input.name === "Personal" && position === 0 ? "notebook_personal" : `notebook_${crypto.randomUUID()}`,
      user_id: ctx.user.sub,
      name: input.name,
      position,
      created_at: now,
      updated_at: now,
    };
    await ctx.repos.notebooks.upsert(nb);
    return nb;
  },
};

export const listNotebooksTool: Tool = {
  name: "list_notebooks",
  description: "List the user's notebooks, ordered by position.",
  schema: z.object({}),
  async handler(ctx) {
    return ctx.repos.notebooks.list(ctx.user.sub);
  },
};

export const deleteNotebookTool: Tool = {
  name: "delete_notebook",
  description: "Delete a notebook by id. Returns {removed}.",
  schema: z.object({ id: z.string() }),
  async handler(ctx, input) {
    // Move any pages in this notebook to the default notebook before deletion.
    const pages = await ctx.repos.notes.listPages(ctx.user.sub, input.id);
    if (pages.length > 0) {
      const defaultId = (await ensureDefaultNotebook(ctx)) ?? input.id;
      for (const p of pages) {
        await ctx.repos.notes.updatePageMeta(ctx.user.sub, p.id, { notebook_id: defaultId });
      }
    }
    const removed = await ctx.repos.notebooks.delete(ctx.user.sub, input.id);
    return { removed };
  },
};

// --- Pages ------------------------------------------------------------------

/** Ensure the user has a default "Personal" notebook (id = notebook_personal). */
async function ensureDefaultNotebook(ctx: { repos: import("../storage/repositories").Repositories; user: { sub: string } }): Promise<string> {
  const nb = await ctx.repos.notebooks.get(ctx.user.sub, "notebook_personal");
  if (nb) return nb.id;
  const now = nowISO();
  const defaultNb: Notebook = {
    id: "notebook_personal",
    user_id: ctx.user.sub,
    name: "Personal",
    position: 0,
    created_at: now,
    updated_at: now,
  };
  await ctx.repos.notebooks.upsert(defaultNb);
  return defaultNb.id;
}

export const createPageTool: Tool<typeof CreatePageInput> = {
  name: "create_page",
  description:
    "Create a note page in a notebook (defaults to the user's 'Personal' notebook). " +
    "Returns the created page with its initial revision.",
  schema: CreatePageInput,
  async handler(ctx, input) {
    const notebookId = input.notebook_id ?? (await ensureDefaultNotebook(ctx)) ?? null;
    const page = await ctx.repos.notes.createPage(ctx.user.sub, {
      notebookId,
      title: input.title,
      kind: input.kind,
      scene: null,
      body: "",
      tags: [],
    });
    return page;
  },
};

export const listPagesTool: Tool = {
  name: "list_pages",
  description: "List the user's active pages, optionally scoped to a notebook.",
  schema: z.object({ notebook_id: z.string().optional() }),
  async handler(ctx, input) {
    const notebookId = input.notebook_id;
    return ctx.repos.notes.listPages(ctx.user.sub, notebookId ?? null);
  },
};

export const getPageTool: Tool = {
  name: "get_page",
  description: "Fetch a page by id. Returns null if not owned by the caller.",
  schema: z.object({ id: z.string() }),
  async handler(ctx, input) {
    return ctx.repos.notes.get(ctx.user.sub, input.id);
  },
};

export const updatePageTool: Tool<typeof UpdatePageInput> = {
  name: "update_page",
  description: "Update a page's metadata (title / notebook / position). Does not touch the scene.",
  schema: UpdatePageInput,
  async handler(ctx, input) {
    const { id, ...patch } = input;
    const updated = await ctx.repos.notes.updatePageMeta(ctx.user.sub, id, patch);
    if (!updated) throw new ToolRegistryError("not_found", `Page "${id}" not found`);
    return updated;
  },
};

export const deletePageTool: Tool = {
  name: "delete_page",
  description: "Archive (soft-delete) a page. Returns {archived}.",
  schema: z.object({ id: z.string() }),
  async handler(ctx, input) {
    const archived = await ctx.repos.notes.archive(ctx.user.sub, input.id);
    return { archived };
  },
};

export const restorePageTool: Tool = {
  name: "restore_page",
  description: "Restore a previously-archived page. Returns {restored}.",
  schema: z.object({ id: z.string() }),
  async handler(ctx, input) {
    const restored = await ctx.repos.notes.restore(ctx.user.sub, input.id);
    return { restored };
  },
};

export const duplicatePageTool: Tool = {
  name: "duplicate_page",
  description: "Duplicate a page (copies scene/title/body/tags/kind; new id).",
  schema: z.object({ id: z.string() }),
  async handler(ctx, input) {
    const copy = await ctx.repos.notes.duplicatePage(ctx.user.sub, input.id);
    if (!copy) throw new ToolRegistryError("not_found", `Page "${input.id}" not found`);
    return copy;
  },
};

export const reorderPagesTool: Tool<typeof ReorderPageInput> = {
  name: "reorder_pages",
  description: "Reorder pages within the user's notebook (or globally if no notebook_id).",
  schema: z.object({
    order: z.array(z.string()).min(1).max(PAGE_LIST_MAX),
    notebook_id: z.string().nullable().optional(),
  }),
  async handler(ctx, input) {
    const notebookId = input.notebook_id ?? null;
    await ctx.repos.notes.reorder(ctx.user.sub, notebookId, input.order);
    return { reordered: input.order.length };
  },
};

export const savePageSceneTool: Tool<typeof SaveSceneInput> = {
  name: "save_page_scene",
  description:
    "Save an Excalidraw scene to a page with optimistic concurrency. " +
    "If `expected_revision` does not match the server's current revision, " +
    "throws a conflict error with the current revision.",
  schema: SaveSceneInput,
  async handler(ctx, input) {
    if (input.scene.length > PAGE_SCENE_MAX_BYTES) {
      throw new ToolRegistryError(
        "invalid_input",
        `Scene exceeds the ${PAGE_SCENE_MAX_BYTES} byte cap.`,
      );
    }
    try {
      const newRevision = await ctx.repos.notes.saveScene(
        ctx.user.sub, input.id, input.scene, null, input.expected_revision,
      );
      return { revision: newRevision };
    } catch (e) {
      if (e instanceof PageSaveConflictError) {
        throw new ToolRegistryError(
          "conflict",
          `Stale revision for page "${input.id}": expected ${input.expected_revision}, found ${e.currentRevision}`,
        );
      }
      if (e instanceof PageNotFoundError) {
        throw new ToolRegistryError("not_found", `Page "${input.id}" not found`);
      }
      throw e;
    }
  },
};
