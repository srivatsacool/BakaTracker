/**
 * Notebooks repository — Tool → Repository → SQL → D1.
 */
import type { Notebook } from "../../domain/schemas";
import {
  notebookUpsert, notebookGet, notebookList, notebookDelete, notebookCountForUser,
} from "../db";

export class NotebookRepository {
  constructor(private readonly db: D1Database) {}

  async upsert(nb: Notebook): Promise<void> {
    await notebookUpsert(this.db, nb);
  }

  async get(userId: string, id: string): Promise<Notebook | null> {
    return notebookGet(this.db, userId, id);
  }

  async list(userId: string): Promise<Notebook[]> {
    return notebookList(this.db, userId);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return notebookDelete(this.db, userId, id);
  }

  async count(userId: string): Promise<number> {
    return notebookCountForUser(this.db, userId);
  }
}
