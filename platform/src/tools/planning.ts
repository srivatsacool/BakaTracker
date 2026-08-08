/**
 * AI / Planning module — leans on the AIProvider abstraction.
 * plan_day and weekly_review work ONLY if an AI provider is configured.
 */
import { z } from "zod";
import type { Tool } from "../registry";
import { AIUnavailableError } from "../ai/provider";

export const planDayTool: Tool = {
  name: "plan_day",
  description: "AI-assisted daily plan: pick the top N open tasks given priorities/due dates.",
  schema: z.object({ date: z.string().optional(), focus: z.string().max(200).optional() }),
  async handler(ctx, input) {
    if (!ctx.ai) throw new AIUnavailableError("none");
    const open = await ctx.repos.tasks.list(ctx.user.sub, "todo");
    const focus = input.focus ?? "the most important tasks";
    const taskListLines = open.slice(0, 25)
      .map((t, i) => `${i + 1}. [${t.priority ?? 0}] ${t.title}${t.due ? ` (due ${t.due})` : ""}`)
      .join("\n");

    const plan = await ctx.ai.chat([
      { role: "system", content: "You are a pragmatic daily planner. Return a numbered 3-6 item plan as plain text, no commentary beyond the plan." },
      { role: "user", content: `Focus: ${focus}\n\nOpen tasks:\n${taskListLines}\n\nProduce a focused plan for today.` },
    ], { temperature: 0.4, maxTokens: 700 });
    return { date: input.date, plan };
  },
};

export const weeklyReviewTool: Tool = {
  name: "weekly_review",
  description: "AI-written weekly review summarizing what happened and what's next (needs AI configured).",
  schema: z.object({}),
  async handler(ctx) {
    if (!ctx.ai) throw new AIUnavailableError("none");
    const [tasks, journal, habits] = await Promise.all([
      ctx.repos.tasks.list(ctx.user.sub),
      ctx.repos.journal.list(ctx.user.sub),
      ctx.repos.habits.list(ctx.user.sub),
    ]);
    const done = tasks.filter((t) => t.status === "done").map((t) => `- ${t.title}`).join("\n");
    const open = tasks.filter((t) => t.status !== "done" && t.status !== "archived").slice(0, 10).map((t) => `- ${t.title}`).join("\n");
    const momentum = habits.map((h) => `- ${h.name}: streak ${h.streak}`).join("\n");

    const review = await ctx.ai.chat([
      { role: "system", content: "You are a reflective productivity coach. Keep the review under 250 words, honest, no fluff." },
      { role: "user", content: `Done:\n${done || "nothing"}\n\nStill open (top):\n${open || "nothing"}\n\nHabit momentum:\n${momentum || "none"}\n\nWrite a short weekly review and suggest 3 focus points for next week.` },
    ], { temperature: 0.6, maxTokens: 600 });
    return { review };
  },
};