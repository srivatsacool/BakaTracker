/**
 * Storage repositories — the ONLY layer tools may talk to (migration Rule 3:
 * "no Worker may access D1 directly; only repositories").
 *
 *   Tool → Repository → SQL (./db) → D1
 *   Tool → Repository → FileStore (./files-store) → R2
 *
 * Construct one per request (cheap; the D1D handle is stateless), then hand
 * the typed aggregates to tools / sync / MCP / REST. `bucket` is optional:
 * instances deployed without `--with-r2` simply have file uploads disabled
 * with a clear error.
 */
import type { Task, Note, Habit, Journal, FileMeta } from "../../domain/schemas";
import { TaskRepository } from "./tasks";
import { HabitRepository } from "./habits";
import { NoteRepository } from "./notes";
import { JournalRepository } from "./journal";
import { StatsRepository, type AnalyticsRollup } from "./stats";
import { FileRepository } from "./files";

export interface Repositories {
  tasks: TaskRepository;
  habits: HabitRepository;
  notes: NoteRepository;
  journal: JournalRepository;
  stats: StatsRepository;
  files: FileRepository;
}

export function repositories(db: D1Database, bucket?: R2Bucket): Repositories {
  return {
    tasks: new TaskRepository(db),
    habits: new HabitRepository(db),
    notes: new NoteRepository(db),
    journal: new JournalRepository(db),
    stats: new StatsRepository(db),
    files: new FileRepository(db, bucket),
  };
}

export {
  TaskRepository, HabitRepository, NoteRepository, JournalRepository, StatsRepository, FileRepository,
};
export type { AnalyticsRollup, FileMeta };
export type { Task, Note, Habit, Journal };
export { FileError } from "./files";