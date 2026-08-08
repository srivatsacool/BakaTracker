/**
 * Storage repositories — the ONLY layer tools may talk to (migration Rule 3:
 * "no Worker may access D1 directly; only repositories").
 *
 *   Tool → Repository → SQL (./db) → D1
 *
 * Construct one per request (cheap; the D1D handle is stateless), then hand
 * the typed aggregates to tools / sync / MCP / REST.
 */
import type { Task, Note, Habit, Journal } from "../../domain/schemas";
import { TaskRepository } from "./tasks";
import { HabitRepository } from "./habits";
import { NoteRepository } from "./notes";
import { JournalRepository } from "./journal";
import { StatsRepository, type AnalyticsRollup } from "./stats";

export interface Repositories {
  tasks: TaskRepository;
  habits: HabitRepository;
  notes: NoteRepository;
  journal: JournalRepository;
  stats: StatsRepository;
}

export function repositories(db: D1Database): Repositories {
  return {
    tasks: new TaskRepository(db),
    habits: new HabitRepository(db),
    notes: new NoteRepository(db),
    journal: new JournalRepository(db),
    stats: new StatsRepository(db),
  };
}

export {
  TaskRepository, HabitRepository, NoteRepository, JournalRepository, StatsRepository,
};
export type { AnalyticsRollup };
export type { Task, Note, Habit, Journal };