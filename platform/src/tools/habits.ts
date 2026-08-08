/** Habits tools. */
import { z } from "zod";
import type { Tool } from "../registry";
import { HabitInput, LogHabitInput, Habit } from "../domain/schemas";
import { nowISO, todayISO, id } from "../shared/util";

function bumpStreak(log: Habit["log"], period: string): number {
  const dates = new Set(log.map((l) => l.date));
  if (period === "day") {
    // consecutive-day streak ending today or yesterday
    let streak = 0;
    const cursor = new Date(todayISO());
    for (;;) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (dates.has(iso)) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else if (streak === 0 && !dates.has(iso)) { cursor.setDate(cursor.getDate() - 1); if (!dates.has(iso)) break; }
      else break;
    }
    return streak;
  }
  return dates.size; // week/month: simple count
}

export const createHabitTool: Tool<typeof HabitInput> = {
  name: "create_habit",
  description: "Create a new habit with a target and period (day/week/month).",
  schema: HabitInput,
  async handler(ctx, input) {
    const habit = {
      ...input,
      id: id("habit"), user_id: ctx.user.sub,
      created_at: nowISO(), updated_at: nowISO(),
      streak: 0, log: [],
    };
    await ctx.repos.habits.upsert(habit);
    return habit;
  },
};

export const logHabitTool: Tool<typeof LogHabitInput> = {
  name: "log_habit",
  description: "Log a completed instance of a habit for a date (defaults to today).",
  schema: LogHabitInput,
  async handler(ctx, input) {
    const habit = await ctx.repos.habits.get(ctx.user.sub, input.habit_id);
    if (!habit) throw new Error(`Habit "${input.habit_id}" not found`);
    const date = input.date ?? todayISO();
    const log = [...habit.log.filter((l) => l.date !== date), { date, count: input.count ?? 1 }];
    const updated = { ...habit, log, updated_at: nowISO(), streak: bumpStreak(log, habit.period) };
    await ctx.repos.habits.upsert(updated);
    return updated;
  },
};

export const listHabitsTool: Tool = {
  name: "list_habits",
  description: "List the user's habits with current streaks.",
  schema: z.object({}),
  async handler(ctx) {
    return ctx.repos.habits.list(ctx.user.sub);
  },
};