/**
 * Domain schemas — the SINGLE source of truth for every entity.
 *
 * The exact same zod schemas are reused by:
 *   - the Tool Registry (input validation)
 *   - the MCP layer (tool input schemas are derived from these)
 *   - the REST layer (body parsing)
 */
import { z } from "zod";

// --- Tasks -----------------------------------------------------------------
export const TaskStatus = z.enum(["todo", "in_progress", "done", "archived"]);
export const TaskPriority = z.number().int().min(0).max(5).default(0);

export const TaskInput = z.object({
  title: z.string().min(1).max(500),
  body: z.string().max(20_000).optional(),
  tags: z.array(z.string()).optional(),
  due: z.string().nullable().optional(), // ISO date
  eta: z.string().nullable().optional(), // estimated effort
  priority: TaskPriority.optional(),
  sort: z.number().int().optional(),
  status: taskStatusOptional(),
});
function taskStatusOptional() {
  return TaskStatus.optional();
}

export const Task = TaskInput.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Task = z.infer<typeof Task>;
export type TaskInput = z.infer<typeof TaskInput>;

// --- Habits ----------------------------------------------------------------
export const HabitPeriod = z.enum(["day", "week", "month"]);

export const HabitInput = z.object({
  name: z.string().min(1).max(120),
  target: z.number().int().positive().default(1),
  period: HabitPeriod.default("day"),
});

export const LogHabitInput = z.object({
  habit_id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  count: z.number().int().positive().default(1),
});

export const Habit = HabitInput.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  streak: z.number().int().default(0),
  log: z.array(z.object({ date: z.string(), count: z.number() })).default([]),
});
export type Habit = z.infer<typeof Habit>;
export type HabitInput = z.infer<typeof HabitInput>;

// --- Notes ----------------------------------------------------------------
export const NoteInput = z.object({
  title: z.string().min(1).max(300),
  body: z.string().max(100_000).default(""),
  tags: z.array(z.string()).optional(),
});
export const Note = NoteInput.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Note = z.infer<typeof Note>;
export type NoteInput = z.infer<typeof NoteInput>;

// --- Journal --------------------------------------------------------------
export const JournalInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  entry: z.string().max(50_000).default(""),
  mood: z.number().int().min(1).max(5).nullable().optional(),
});
export const Journal = JournalInput.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Journal = z.infer<typeof Journal>;
export type JournalInput = z.infer<typeof JournalInput>;

// --- Search / analytics ---------------------------------------------------
export const SearchQuery = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).default(20),
  entity: z.enum(["all", "task", "note"]).default("all"),
});

// --- Sync -----------------------------------------------------------------
export const SyncOp = z.enum(["add", "update", "delete"]);
export const SyncEntity = z.enum(["task", "habit", "note", "journal"]);

export const SyncPush = z.object({
  ops: z.array(
    z.object({
      op: SyncOp,
      entity: SyncEntity,
      entity_id: z.string(),
      payload: z.unknown().optional(),
      rev: z.string(),
      client_id: z.string().optional(),
    }),
  ).max(500),
});

export type SyncPush = z.infer<typeof SyncPush>;

// --- Who-am-I ------------------------------------------------------------
export const WhoAmI = z.object({
  sub: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});