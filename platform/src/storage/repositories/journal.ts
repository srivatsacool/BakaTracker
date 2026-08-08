/**
 * Journal repository — Tool → Repository → SQL → D1.
 */
import type { Journal } from "../../domain/schemas";
import { journalUpsert, journalGet, journalList } from "../db";

export class JournalRepository {
  constructor(private readonly db: D1Database) {}

  async upsert(entry: Journal): Promise<void> {
    await journalUpsert(this.db, entry);
  }

  async get(userId: string, date: string): Promise<Journal | null> {
    return journalGet(this.db, userId, date);
  }

  async list(userId: string, from?: string, to?: string): Promise<Journal[]> {
    return journalList(this.db, userId, from, to);
  }
}