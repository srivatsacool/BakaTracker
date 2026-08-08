/**
 * Tool Registry — the single business-logic surface. THIS is "the OS".
 *
 * Every capability (create_task, log_habit, journal_today, search_notes, …)
 * is a registered Tool. The React UI, the AI Assistant, MCP clients, and the
 * REST API all call the exact same tools. No duplicated logic.
 */
import type { ZodType, ZodTypeAny } from "zod";
import type { Env } from "../env";
import type { Repositories } from "../storage/repositories";

export interface ToolContext {
  env: Env;
  /** Authenticated identity (from Google OAuth `sub`). */
  user: { sub: string; name?: string | null; email?: string | null };
  /** Request-generated context (AI provider, cache, …). */
  ai?: import("../ai/provider").AIProvider;
  cache: KVNamespace;
  /**
   * Storage repositories — the ONLY data-access surface tools may touch
   * (v2 migration Rule 3: no tool reaches D1 directly).
   */
  repos: Repositories;
}

/** A registry tool — schema + handler, framework-agnostic. */
export interface Tool<
  S extends ZodTypeAny = ZodTypeAny,
  O = unknown,
> {
  name: string;
  description: string;
  /** zod schema for the (already-partial-parsed) input object. */
  schema: S;
  handler(ctx: ToolContext, input: any): Promise<O>;
  /** Human-friendly markdown of what the tool does (fed to MCP + docs). */
  examples?: string[];
}

/**
 * Maps a zod **object** schema into the plain-object-shape that
 * @modelcontextprotocol/sdk's `server.tool()` expects.
 * MCP wants `{ field: zodType }`, not a wrapped `z.object({...})`.
 */
export type ObjectSchema = ZodType<Record<string, unknown>>;

export interface Registry {
  tools: Map<string, Tool<any>>;
  register(tool: Tool<any>): void;
  registerMany(tools: Tool<any>[]): void;
  get(name: string): Tool<any> | undefined;
  list(): Tool<any>[];
  /** Validate + run a tool by name. Throws ToolRegistryError on unknown/malformed. */
  call(name: string, input: unknown, ctx: ToolContext): Promise<unknown>;
}

export class ToolRegistryError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ToolRegistryError";
  }
}