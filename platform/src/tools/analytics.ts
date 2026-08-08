/** Analytics module — rollups via the StatsRepository (Tool → Repository → D1). */
import { z } from "zod";
import type { Tool } from "../registry";

export const analyticsTool: Tool = {
  name: "analytics",
  description: "Compute productivity rollups (open tasks, completed today, notes, streak summary) for the user.",
  schema: z.object({ days: z.number().int().min(1).max(365).default(7) }),
  async handler(ctx, input) {
    return ctx.repos.stats.rollup(ctx.user.sub, input.days);
  },
};