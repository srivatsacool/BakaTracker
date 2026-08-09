/**
 * Habits repository — Tool → Repository → SQL → D1.
 */
import type { Habit } from "../../domain/schemas";
import { habitUpsert, habitGet, habitList, habitDeleteAllForUser } from "../db";

export class HabitRepository {
  constructor(private readonly db: D1Database) {}

  async upsert(habit: Habit): Promise<void> {
    await habitUpsert(this.db, habit);
  }

  async get(userId: string, id: string): Promise<Habit | null> {
    return habitGet(this.db, userId, id);
  }

  /** Remove every habit row for one user (reset_account; scoped, never global). */
  async deleteAll(userId: string): Promise<number> {
    return habitDeleteAllForUser(this.db, userId);
  }

  async list(userId: string): Promise<Habit[]> {
    return habitList(this.db, userId);
  }
}