import type { ZodTypeAny } from "zod";
import { Registry, Tool, ToolContext, ToolRegistryError } from "./types";

/**
 * Shared in-memory Tool Registry. One instance is built per Worker request
 * (per-user tools depend on the authenticated identity injected via ctx).
 */
export class ToolRegistry implements Registry {
  tools = new Map<string, Tool<any>>();

  register(tool: Tool<any>): void {
    if (this.tools.has(tool.name)) {
      throw new ToolRegistryError("duplicate_tool", `Tool "${tool.name}" already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  registerMany(toolList: Tool<any>[]): void {
    for (const t of toolList) this.register(t);
  }

  get(name: string): Tool<any> | undefined {
    return this.tools.get(name);
  }

  list(): Tool<any>[] {
    return [...this.tools.values()];
  }

  async call(name: string, input: unknown, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolRegistryError(
        "unknown_tool",
        `No tool named "${name}" is registered. Available: ${this.list().map((t) => t.name).join(", ")}`,
      );
    }
    // Validate against the tool's zod schema.
    let parsed: any;
    try {
      parsed = tool.schema.parse(input ?? {});
    } catch (e) {
      throw new ToolRegistryError("invalid_input", `Invalid input for "${name}": ${(e as Error).message}`);
    }
    return tool.handler(ctx, parsed);
  }
}

// Re-export so the rest of the codebase can describe types without importing
// the class path directly.
export { ToolRegistryError };
export type { Registry, Tool, ToolContext } from "./types";