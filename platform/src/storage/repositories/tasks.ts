/**
 * Tasks repository — the aggregate access point for task persistence.
 *
 * Layering (v2.0 migration rules): Tool → Repository → SQL (db.ts) → D1.
 * Tools never touch SQL or the D1 handle directly; they only see this class.
 */
import type { Task } from "../../domain/schemas";
import {
  taskUpsert, taskDelete, taskGet, taskList,
} from "../db";

export class TaskRepository {
  constructor(private readonly db: D1Database) {}

  async upsert(task: Task): Promise<void> {
    await taskUpsert(this.db, task);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return taskDelete(this.db, userId, id);
  }

  async get(userId: string, id: string): Promise<Task | null> {
    return taskGet(this.db, userId, id);
  }

  async list(userId: string, status?: string, limit = 200): Promise<Task[]> {
    return taskList(this.db, userId, status, limit);
  }
}