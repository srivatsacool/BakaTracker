/** reset_account — deletes the authenticated user's data across every entity. */
import { z } from "zod";
import type { Tool } from "../registry";

const ResetAccountInput = z.object({
  // Safety gate: the caller must affirm intent. Prevents a stray AI/MCP call
  // from erasing a user's data by mis-firing. `confirm` must equal "DELETE".
  confirm: z.literal("DELETE"),
});

export const resetAccountTool: Tool<typeof ResetAccountInput> = {
  name: "reset_account",
  description:
    "Delete ALL of the calling user's data (tasks, habits, notes, journal) from the account. " +
    "Requires { confirm: \"DELETE\" }. Never affects other users; auth/session state is untouched.",
  schema: ResetAccountInput,
  async handler(ctx, input) {
    // The schema already guarantees input.confirm === "DELETE".
    void input;
    const { tasks, habits, notes, journal } = ctx.repos;
    const userId = ctx.user.sub;

    const [tasksDeleted, habitsDeleted, notesDeleted, journalDeleted] = await Promise.all([
      tasks.deleteAll(userId),
      habits.deleteAll(userId),
      notes.deleteAll(userId),
      journal.deleteAll(userId),
    ]);

    return {
      ok: true,
      userId,
      deleted: {
        tasks: tasksDeleted,
        habits: habitsDeleted,
        notes: notesDeleted,
        journal: journalDeleted,
      },
      // Owner/auth state intentionally NOT deleted: sessions, OAuth grants
      // and the account itself remain intact.
      note: "Authentication and session state were preserved.",
    };
  },
};