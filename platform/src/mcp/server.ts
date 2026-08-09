/**
 * MCP server — the native remote MCP surface of BakaTracker.
 *
 * The McpAgent runs in a Durable Object. At init() it registers EVERY tool from
 * the shared Tool Registry, so MyMCP is just a thin transport that funnels MCP
 * tool calls into the same registry the REST API, UI, and future clients use.
 * One business logic → infinite interfaces.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import { McpAgent } from "agents/mcp";
import type { Env } from "../env";
import type { Props } from "../auth/props";
import { ToolRegistry } from "../registry";
import { registerAll } from "../tools";
import { makeAIProvider } from "../ai";
import { repositories } from "../storage/repositories";

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer(
    { name: "BakaTracker", version: "0.2.0" },
    // Edge runtime: the default Ajv validator is CJS-only and breaks in
    // workerd; CfWorkerJsonSchemaValidator is built for Workers.
    { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() },
  );

  async init() {
    const registry = new ToolRegistry();
    registerAll(registry);

    for (const tool of registry.list()) {
      // Peel the zod object schema into MCP's expected `{ field: ZodType }` shape.
      const shape = (tool.schema as any).shape ?? {};

      this.server.tool(
        tool.name,
        tool.description,
        shape,
        async (input: any) => {
          const out = await registry.call(tool.name, (input ?? {}) as Record<string, unknown>, {
            env: this.env,
            user: propsToUser(this.props),
            ai: makeAIProvider(this.env),
            cache: this.env.OAUTH_KV,
            repos: repositories(this.env.BAKA_DB, this.env.R2_BUCKET),
          });
          return {
            content: [{ type: "text" as const, text: JSON.stringify(out) }],
          };
        },
      );
    }
  }
}

/** The authenticated identity arrives as `this.props` (decrypted OAuth token). */
function propsToUser(p?: Props) {
  return { sub: p?.sub ?? "anonymous", name: p?.name ?? null, email: p?.email ?? null };
}