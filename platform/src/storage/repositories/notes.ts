/**
 * Notes repository (notes + cross-entity search) — Tool → Repository → SQL → D1.
 */
import type { Note } from "../../domain/schemas";
import { noteUpsert, noteDelete, noteGet, noteList, searchNotes, noteDeleteAllForUser } from "../db";

export class NoteRepository {
  constructor(private readonly db: D1Database) {}

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
}