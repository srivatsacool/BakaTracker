/**
 * Core: Tasks tools. First-class citizens of the single Tool Registry.
 *
 * Every handler receives a ToolContext with `env` + authenticated `user`.
 * These are the SAME functions the MCP server, REST API, and future UI/AI
 * clients invoke through the registry — no duplicated logic.
 */
import { z } from "zod";
import type { Tool } from "../registry";
import { Task, TaskInput, TaskStatus } from "../domain/schemas";
import { nowISO, id } from "../shared/util";

const CreateTaskInput = TaskInput;
/** Partial update: only the provided fields change; `id` is required. */
const UpdateTaskInput = Task.omit({ id: true }).partial().extend({ id: z.string() });
const ListTasksInput = z.object({ status: TaskStatus.optional(), limit: z.number().int().min(1).max(500).optional() });

export const createTaskTool: Tool<typeof CreateTaskInput> = {
  name: "create_task",
  description: "Create a new task. Returns the created task entity.",
  schema: CreateTaskInput,
  examples: ["create_task({ title: 'Ship BakaTracker v2', tags: ['oss','core'] })"],
  async handler(ctx, input): Promise<unknown> {
    const task: z.infer<typeof Task> = {
      ...input,
      id: id("task"),
      user_id: ctx.user.sub,
      created_at: nowISO(),
      updated_at: nowISO(),
      status: input.status ?? "todo",
    };
    await ctx.repos.tasks.upsert(task);
    return task;
  },
};

export const updateTaskTool: Tool<typeof UpdateTaskInput> = {
  name: "update_task",
  description: "Update an existing task (title, body, tags, status, due, priority, sort).",
  schema: UpdateTaskInput,
  examples: ["update_task({ id: 'task_…', status: 'done' })"],
  async handler(ctx, input): Promise<unknown> {
    const existing = await ctx.repos.tasks.get(ctx.user.sub, input.id);
    if (!existing) throw new Error(`Task "${input.id}" not found`);
    const updated: Task = { ...existing, ...input, updated_at: nowISO() };
    await ctx.repos.tasks.upsert(updated);
    return updated;
  },
};

export const deleteTaskTool: Tool = {
  name: "delete_task",
  description: "Delete a task by id (soft-removes from the mirror index).",
  schema: z.object({ id: z.string() }),
  async handler(ctx, input): Promise<unknown> {
    const removed = await ctx.repos.tasks.delete(ctx.user.sub, input.id);
    return { removed };
  },
};

export const listTasksTool: Tool = {
  name: "list_tasks",
  description: "List the user's tasks, optionally filtered by status.",
  schema: ListTasksInput,
  async handler(ctx, input): Promise<unknown> {
    return ctx.repos.tasks.list(ctx.user.sub, input.status, input.limit ?? 200);
  },
};