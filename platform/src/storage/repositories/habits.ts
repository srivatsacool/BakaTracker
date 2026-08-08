/**
 * Habits repository — Tool → Repository → SQL → D1.
 */
import type { Habit } from "../../domain/schemas";
import { habitUpsert, habitGet, habitList } from "../db";

export class HabitRepository {
  constructor(private readonly db: D1Database) {}

  async upsert(habit: Habit): Promise<void> {
    await habitUpsert(this.db, habit);
  }

  async get(userId: string, id: string): Promise<Habit | null> {
    return habitGet(this.db, userId, id);
  }

  async list(userId: string): Promise<Habit[]> {
    return habitList(this.db, userId);
  }
}