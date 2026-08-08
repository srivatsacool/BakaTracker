/** Memory module — KV-backed personal scratchpad the AI has read/write access to. */
import { z } from "zod";
import type { Tool } from "../registry";

const TIMEOUT = 365 * 24 * 60 * 60; // 1y

export const rememberTool: Tool = {
  name: "remember",
  description: "Store a personal fact in BakaTracker memory (KV-backed).",
  schema: z.object({ key: z.string().min(1).max(120), value: z.string().max(5000) }),
  async handler(ctx, input) {
    await ctx.cache.put(`baka:mem:${ctx.user.sub}:${input.key}`, input.value, { expirationTtl: kvTTL() });
    return { remembered: input.key };
  },
};

export const recallTool: Tool = {
  name: "recall",
  description: "Retrieve a stored memory fact for the user.",
  schema: z.object({ key: z.string().min(1).max(120) }),
  async handler(ctx, input) {
    const value = await ctx.cache.get(`baka:mem:${ctx.user.sub}:${input.key}`);
    return value === null ? null : { key: input.key, value };
  },
};

function kvTTL(): number {
  return 365 * 24 * 60 * 60;
}