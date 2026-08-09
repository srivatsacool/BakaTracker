/**
 * Tools — aggregator. Registers every module into the Tool Registry.
 *
 * This file is the ONLY place tools are wired, so the MCP server and the REST
 * layer both surface an identical capability set.
 */
import type { Registry } from "../registry";
import {
  createTaskTool, updateTaskTool, deleteTaskTool, listTasksTool,
} from "./tasks";
import { createHabitTool, logHabitTool, listHabitsTool } from "./habits";
import {
  createNoteTool, getNoteTool, updateNoteTool, deleteNoteTool,
  listNotesTool, searchNotesTool,
} from "./notes";
import { journalTodayTool, getJournalTool, listJournalTool } from "./journal";
import { analyticsTool } from "./analytics";
import { planDayTool, weeklyReviewTool } from "./planning";
import { rememberTool, recallTool } from "./memory";
import { resetAccountTool } from "./reset-account";
import { fileUploadTool, fileListTool, fileGetTool, fileDeleteTool } from "./files";

export function registerAll(registry: import("../registry").Registry): void {
  registry.registerMany([
    // Core
    createTaskTool, updateTaskTool, deleteTaskTool, listTasksTool,
    createHabitTool, logHabitTool, listHabitsTool,
    createNoteTool, getNoteTool, updateNoteTool, deleteNoteTool, listNotesTool, searchNotesTool,
    journalTodayTool, getJournalTool, listJournalTool,
    // Files (R2 attachments)
    fileUploadTool, fileListTool, fileGetTool, fileDeleteTool,
    // Knowledge / AI / system
    analyticsTool, planDayTool, weeklyReviewTool, rememberTool, recallTool,
    // Data management
    resetAccountTool,
  ]);
}