/** Notes module: markdown-first knowledge capture + search. */
import { z } from "zod";
import type { Tool } from "../registry";
import { NoteInput, SearchQuery, Note } from "../domain/schemas";
import { nowISO, id } from "../shared/util";

export const createNoteTool: Tool<typeof NoteInput> = {
  name: "create_note",
  description: "Create a markdown note. Returns the note.",
  schema: NoteInput,
  async handler(ctx, input) {
    const note: Note = { ...input, id: id("note"), user_id: ctx.user.sub, created_at: nowISO(), updated_at: nowISO() };
    await ctx.repos.notes.upsert(note);
    return note;
  },
};

export const getNoteTool: Tool = {
  name: "get_note",
  description: "Fetch a note by id.",
  schema: z.object({ id: z.string() }),
  async handler(ctx, input) {
    return ctx.repos.notes.get(ctx.user.sub, input.id);
  },
};

export const updateNoteTool: Tool = {
  name: "update_note",
  description: "Update a note's title/body/tags by id.",
  schema: NoteInput.extend({ id: z.string() }),
  async handler(ctx, input) {
    const existing = await ctx.repos.notes.get(ctx.user.sub, input.id);
    if (!existing) throw new Error(`Note "${input.id}" not found`);
    const updated = { ...existing, ...input, updated_at: nowISO() };
    await ctx.repos.notes.upsert(updated);
    return updated;
  },
};

export const deleteNoteTool: Tool = {
  name: "delete_note",
  description: "Delete a note by id.",
  schema: z.object({ id: z.string() }),
  async handler(ctx, input) {
    const removed = await ctx.repos.notes.delete(ctx.user.sub, input.id);
    return { removed };
  },
};

export const listNotesTool: Tool = {
  name: "list_notes",
  description: "List recent notes.",
  schema: z.object({}),
  async handler(ctx) {
    return ctx.repos.notes.list(ctx.user.sub);
  },
};

export const searchNotesTool: Tool<typeof SearchQuery> = {
  name: "search_notes",
  description: "Keyword search across notes and tasks.",
  schema: SearchQuery,
  async handler(ctx, input) {
    return ctx.repos.notes.search(ctx.user.sub, input.query, input.entity, input.limit);
  },
};