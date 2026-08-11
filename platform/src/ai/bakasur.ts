/**
 * BakaSur — controlled tool registry allowlist (v1, read-first).
 *
 * When the agent loop lands, BakaSur may ONLY request tools in this
 * allowlist, and every call must pass `assertBakasurAllowed(name)` before
 * `registry.call(name, input, ctx)` with the authenticated user's context.
 *
 * The registry already provides the rest of the contract:
 *   - schema validation (zod) at `registry.call`
 *   - authorization — `ctx.user.sub` scopes every repository call
 *   - bounded arguments (schemas cap lengths/lists)
 *   - structured results (tools return plain JSON)
 *   - existing business-service invocation (tools call repositories, never D1/R2)
 *
 * The model NEVER gets direct D1/R2 access, never generates SQL, and never
 * executes arbitrary Worker code. Mutations stay disabled until the
 * validation path is proven end-to-end in a real agent loop.
 */
import { ToolRegistryError } from "../registry";

/**
 * v1 read-first allowlist — maps BakaSur's conceptual tools to the existing
 * registry tool names (one registry, many clients).
 */
export const BAKASUR_ALLOWED_TOOLS: ReadonlySet<string> = new Set([
  "list_tasks", // get_tasks
  "list_habits", // get_habits
  "list_notes", // get_notes
  "get_note", // get_note (single note by id)
  "get_journal", // get_journal (by date)
  "list_journal", // get_journal (range)
  "search_notes", // search_notes (lexical LIKE v1; Vectorize later)
  "file_list", // get_file_metadata (names/types/sizes — no binary bodies)
  "file_get", // get_file_metadata (single; metadata only unless explicitly requested)
]);

/** Denied in v1 even though registered: mutations stay disabled until proven. */
export const BAKASUR_DENIED_TOOLS: readonly string[] = [
  "create_task", "update_task", "delete_task",
  "create_habit", "log_habit",
  "create_note", "update_note", "delete_note",
  "journal_today",
  "file_upload", "file_delete",
  "remember", // memory writes
  "reset_account", // destructive
  "plan_day", "weekly_review", // AI-generation tools, not data reads
];

/** Throws when `name` is not on the BakaSur allowlist. */
export function assertBakasurAllowed(name: string): void {
  if (!BAKASUR_ALLOWED_TOOLS.has(name)) {
    throw new ToolRegistryError(
      "tool_denied",
      `Tool "${name}" is not in the BakaSur v1 allowlist (read-first).`,
    );
  }
}
