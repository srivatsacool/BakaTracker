/**
 * Notes repository (notes + cross-entity search) — Tool → Repository → SQL → D1.
 *
 * v2.1: notes double as pages. The `Note` type now carries `kind`, `scene`,
 * `notebook_id`, `position`, `archived_at`, `revision`. The existing `upsert`,
 * `get`, `list`, `search`, `delete`, `deleteAll` operations remain backward
 * compatible; they transparently persist/restore the new columns.
 */
import type { Note } from "../../domain/schemas";
import { nowISO } from "../../shared/util";
import { id as makeId } from "../../shared/util";
import {
  noteUpsert, noteDelete, noteGet, noteList, searchNotes, noteDeleteAllForUser,
  noteListPages, noteListAllPages, notePageCount, noteSaveScene,
  noteArchive, noteRestore, noteReorder,
} from "../db";
import { PAGE_POSITION_STEP, PAGE_LIST_MAX } from "../../domain/schemas";

export class PageSaveConflictError extends Error {
  public readonly currentRevision: number;
  constructor(message: string, currentRevision: number) {
    super(message);
    this.name = "PageSaveConflictError";
    this.currentRevision = currentRevision;
  }
}

/** Page not found (or not owned by the caller) — transports map this to 404. */
export class PageNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageNotFoundError";
  }
}

export class NoteRepository {
  constructor(private readonly db: D1Database) {}

  // --- existing operations (backward compatible) ---------------------------
  async upsert(note: Note): Promise<void> {
    await noteUpsert(this.db, note);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return noteDelete(this.db, userId, id);
  }

  async get(userId: string, id: string): Promise<Note | null> {
    return noteGet(this.db, userId, id);
  }

  /** Remove every note row for one user (reset_account; scoped, never global). */
  async deleteAll(userId: string): Promise<number> {
    return noteDeleteAllForUser(this.db, userId);
  }

  async list(userId: string): Promise<Note[]> {
    return noteList(this.db, userId);
  }

  async search(
    userId: string, query: string, entity: "all" | "task" | "note" = "all", limit = 20,
  ): Promise<Array<{ entity: string; id: string; title: string; body: string }>> {
    return searchNotes(this.db, userId, query, entity, limit);
  }

  // --- v2.1 page operations --------------------------------------------------
  /** Create a new page (note row) in a notebook, with sparse position spacing. */
  async createPage(userId: string, input: {
    notebookId: string | null;
    title: string;
    kind?: "text" | "excalidraw";
    scene?: string | null;
    body?: string;
    tags?: string[];
  }): Promise<Note> {
    const now = nowISO();
    const position = await this.nextPosition(userId, input.notebookId);
    const page: Note = {
      id: makeId("note"),
      user_id: userId,
      title: input.title,
      body: input.body ?? "",
      tags: input.tags ?? [],
      created_at: now,
      updated_at: now,
      kind: input.kind ?? "excalidraw",
      scene: input.scene ?? null,
      notebook_id: input.notebookId,
      position,
      archived_at: null,
      revision: 0,
    };
    await noteUpsert(this.db, page);
    return page;
  }

  /** List a user's active pages, optionally within a notebook. */
  async listPages(userId: string, notebookId: string | null): Promise<Note[]> {
    if (notebookId !== null) {
      return noteListPages(this.db, userId, notebookId, PAGE_LIST_MAX);
    }
    return noteListAllPages(this.db, userId, PAGE_LIST_MAX);
  }

  /** Total count of active pages for a user. */
  async pageCount(userId: string): Promise<number> {
    return notePageCount(this.db, userId);
  }

  /** Update a page's metadata (title / notebook / position). Never touches scene.
   * Undefined patch keys are ignored (sparse PATCH semantics) so partial
   * updates never bind `undefined` into D1. */
  async updatePageMeta(userId: string, id: string, patch: {
    title?: string;
    notebook_id?: string | null;
    position?: number;
  }): Promise<Note | null> {
    const existing = await this.get(userId, id);
    if (!existing) return null;
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    const updated: Note = { ...existing, ...cleanPatch, updated_at: nowISO() };
    await noteUpsert(this.db, updated);
    return updated;
  }

  /** Versioned scene save. Throws PageSaveConflictError on stale revision (409),
   * PageNotFoundError when the page doesn't exist or isn't the caller's (404). */
  async saveScene(
    userId: string, id: string, scene: string, body: string | null, expectedRevision: number,
  ): Promise<number> {
    // Ownership check first — if the page isn't theirs, treat as not-found.
    const page = await this.get(userId, id);
    if (!page) throw new PageNotFoundError(`Page "${id}" not found`);

    const result = await noteSaveScene(this.db, userId, id, scene, body, expectedRevision);
    if (result === null) {
      throw new PageSaveConflictError(
        `Stale revision for page "${id}": expected ${expectedRevision}, found ${page.revision}`, page.revision,
      );
    }
    return result;
  }

  /** Soft-delete (archive) a page. */
  async archive(userId: string, id: string): Promise<boolean> {
    return noteArchive(this.db, userId, id);
  }

  /** Restore an archived page. */
  async restore(userId: string, id: string): Promise<boolean> {
    return noteRestore(this.db, userId, id);
  }

  /** Duplicate a page — copies scene/title/body/tags/kind, new id, bumped to max+step. */
  async duplicatePage(userId: string, id: string): Promise<Note | null> {
    const src = await this.get(userId, id);
    if (!src) return null;
    const now = nowISO();
    const position = await this.nextPosition(userId, src.notebook_id ?? null);
    const copy: Note = {
      ...src,
      id: makeId("note"),
      title: `${src.title} (copy)`,
      created_at: now,
      updated_at: now,
      position,
      revision: 0,
    };
    await noteUpsert(this.db, copy);
    return copy;
  }

  /** Hard-delete a page (used by reset_account; permanent purge). */
  async hardDelete(userId: string, id: string): Promise<boolean> {
    return noteDelete(this.db, userId, id);
  }

  /** Reorder pages within a notebook (or globally if notebookId is null). */
  async reorder(userId: string, notebookId: string | null, order: string[]): Promise<void> {
    await noteReorder(this.db, userId, notebookId, order, PAGE_POSITION_STEP);
  }

  private async nextPosition(userId: string, notebookId: string | null): Promise<number> {
    const pages = await this.listPages(userId, notebookId);
    if (pages.length === 0) return 0;
    const maxPos = pages.reduce((m, p) => Math.max(m, p.position ?? 0), 0);
    return maxPos + PAGE_POSITION_STEP;
  }
}
