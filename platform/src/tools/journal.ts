/** Journal module: daily reflection. */
import { z } from "zod";
import type { Tool } from "../registry";
import { JournalInput } from "../domain/schemas";
import { nowISO, todayISO, id } from "../shared/util";

export const journalTodayTool: Tool<typeof JournalInput> = {
  name: "journal_today",
  description: "Write or update today's journal entry. Returns the entry.",
  schema: JournalInput,
  async handler(ctx, input) {
    const date = input.date ?? todayISO();
    const existing = await ctx.repos.journal.get(ctx.user.sub, date);
    const journal = {
      id: existing?.id ?? id("journal"),
      user_id: ctx.user.sub,
      date,
      entry: input.entry ?? existing?.entry ?? "",
      mood: input.mood ?? existing?.mood ?? null,
      created_at: existing?.created_at ?? nowISO(),
      updated_at: nowISO(),
    };
    await ctx.repos.journal.upsert(journal as any);
    return journal;
  },
};

export const getJournalTool: Tool = {
  name: "get_journal",
  description: "Get a journal entry for a date (YYYY-MM-DD, defaults to today).",
  schema: z.object({ date: z.string().optional() }),
  async handler(ctx, input) {
    return ctx.repos.journal.get(ctx.user.sub, input.date ?? todayISO());
  },
};

export const listJournalTool: Tool = {
  name: "list_journal",
  description: "List journal entries within an optional date range.",
  schema: z.object({ from: z.string().optional(), to: z.string().optional() }),
  async handler(ctx, input) {
    return ctx.repos.journal.list(ctx.user.sub, input.from, input.to);
  },
};