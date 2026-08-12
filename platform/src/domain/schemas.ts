/**
 * Domain schemas — the SINGLE source of truth for every entity.
 *
 * The exact same zod schemas are reused by:
 *   - the Tool Registry (input validation)
 *   - the MCP layer (tool input schemas are derived from these)
 *   - the REST layer (body parsing)
 */
import { z } from "zod";

// --- Tasks -----------------------------------------------------------------
export const TaskStatus = z.enum(["todo", "in_progress", "done", "archived"]);
export const TaskPriority = z.number().int().min(0).max(5).default(0);

export const TaskInput = z.object({
  title: z.string().min(1).max(500),
  body: z.string().max(20_000).optional(),
  tags: z.array(z.string()).optional(),
  due: z.string().nullable().optional(), // ISO date
  eta: z.string().nullable().optional(), // estimated effort
  priority: TaskPriority.optional(),
  sort: z.number().int().optional(),
  status: taskStatusOptional(),
});
function taskStatusOptional() {
  return TaskStatus.optional();
}

export const Task = TaskInput.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Task = z.infer<typeof Task>;
export type TaskInput = z.infer<typeof TaskInput>;

// --- Habits ----------------------------------------------------------------
export const HabitPeriod = z.enum(["day", "week", "month"]);

export const HabitInput = z.object({
  name: z.string().min(1).max(120),
  target: z.number().int().positive().default(1),
  period: HabitPeriod.default("day"),
});

export const LogHabitInput = z.object({
  habit_id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  count: z.number().int().positive().default(1),
});

export const Habit = HabitInput.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  streak: z.number().int().default(0),
  log: z.array(z.object({ date: z.string(), count: z.number() })).default([]),
});
export type Habit = z.infer<typeof Habit>;
export type HabitInput = z.infer<typeof HabitInput>;

// --- Notes ----------------------------------------------------------------
export const NoteInput = z.object({
  title: z.string().min(1).max(300),
  body: z.string().max(100_000).default(""),
  tags: z.array(z.string()).optional(),
});
export const Note = NoteInput.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  kind: z.enum(["text", "excalidraw"]).optional().default("text"),
  scene: z.string().nullable().optional(),
  notebook_id: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional().default(0),
  archived_at: z.string().nullable().optional(),
  revision: z.number().int().nonnegative().optional().default(0),
});
export type Note = z.infer<typeof Note>;
export type NoteInput = z.infer<typeof NoteInput>;

// --- Notebooks (v2.1: Notebook → Pages, Excalidraw workspace) --------------
export const NotebookInput = z.object({
  name: z.string().min(1).max(200).default("Personal"),
  position: z.number().int().nonnegative().optional().default(0),
});
export const Notebook = NotebookInput.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Notebook = z.infer<typeof Notebook>;
export type NotebookInput = z.infer<typeof NotebookInput>;

// --- Page inputs (v2.1 notebook/page CRUD + versioned scene save) ----------
// Page IDs and notebook IDs follow the existing deterministic prefix convention
// (see util.id): `note_<uuid>` and `notebook_<uuid>`.
export const PAGE_KIND = z.enum(["text", "excalidraw"]).default("excalidraw");
export const PAGE_KIND_VALUES: ReadonlyArray<string> = ["text", "excalidraw"];
export type PageKind = (typeof PAGE_KIND_VALUES)[number];

/** Title bound for pages (shared with note title). */
export const PAGE_TITLE_MAX = 300;
/** Scene JSON size cap — bounded so D1 rows stay small (Excalidraw scenes are
 * typically a few hundred KB; 2 MiB keeps D1 row sizes sane per the storage rules). */
export const PAGE_SCENE_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB
/** Max pages returned in a single list call. */
export const PAGE_LIST_MAX = 500;
/** Sparse-integer spacing between positions (reorder only touches the moved range). */
export const PAGE_POSITION_STEP = 1000;

export const CreatePageInput = z.object({
  notebook_id: z.string().optional(),
  title: z.string().min(1).max(PAGE_TITLE_MAX),
  kind: PAGE_KIND.optional(),
});
export type CreatePageInput = z.infer<typeof CreatePageInput>;

export const UpdatePageInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(PAGE_TITLE_MAX).optional(),
  notebook_id: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
});
export type UpdatePageInput = z.infer<typeof UpdatePageInput>;

export const ReorderPageInput = z.object({
  /** Ordered list of page ids; positions are recomputed 0..N*step. */
  order: z.array(z.string()).min(1).max(PAGE_LIST_MAX),
});
export type ReorderPageInput = z.infer<typeof ReorderPageInput>;

export const SaveSceneInput = z.object({
  id: z.string(),
  // No `.max()` here — the byte cap is enforced explicitly by each transport
  // (REST → 413 too_large, tool → byte-cap error) so clients get the contract
  // error code instead of a generic zod 400.
  scene: z.string().min(1),
  /** Client's expected revision; must match server revision to save (409 otherwise). */
  expected_revision: z.number().int().nonnegative(),
});
export type SaveSceneInput = z.infer<typeof SaveSceneInput>;

/** The canonical page read model returned by GET page / list pages. */
export const Page = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  body: z.string().default(""),
  kind: z.enum(["text", "excalidraw"]).default("excalidraw"),
  scene: z.string().nullable(),
  notebook_id: z.string().nullable(),
  position: z.number().int().nonnegative().default(0),
  archived_at: z.string().nullable(),
  revision: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Page = z.infer<typeof Page>;

// --- Journal --------------------------------------------------------------
export const JournalInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  entry: z.string().max(50_000).default(""),
  mood: z.number().int().min(1).max(5).nullable().optional(),
});
export const Journal = JournalInput.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Journal = z.infer<typeof Journal>;
export type JournalInput = z.infer<typeof JournalInput>;

// --- Files (R2 attachments) -------------------------------------------------
// Binaries live in R2, keyed `users/{user_id}/files/{file_id}`. This schema is
// the D1 metadata mirror ONLY. `r2_key` is intentionally NOT exposed to
// clients — it is server-derived from the authenticated identity.
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MiB (v2.0 cap)

/** MIME allowlist for uploads (v2.0: images, PDFs, text/docs, audio, video, archives). */
export const ALLOWED_MIME_TYPES = new Set([
  // images
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/svg+xml",
  // documents
  "application/pdf",
  "text/plain", "text/markdown", "text/csv", "text/html",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  // audio / video
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4",
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  // archives
  "application/zip", "application/gzip",
]);

export const FileMeta = z.object({
  id: z.string(),
  user_id: z.string(),
  filename: z.string().min(1).max(255),
  mime_type: z.string(),
  size: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type FileMeta = z.infer<typeof FileMeta>;

export const FileUploadInput = z.object({
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1),
  /** Base64-encoded binary payload (JSON-friendly transport for tools/MCP). */
  data_base64: z.string().min(1),
});

// --- Search / analytics ---------------------------------------------------
export const SearchQuery = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(50).default(20),
  entity: z.enum(["all", "task", "note"]).default("all"),
});

// --- Sync -----------------------------------------------------------------
export const SyncOp = z.enum(["add", "update", "delete"]);
export const SyncEntity = z.enum(["task", "habit", "note", "journal"]);

export const SyncPush = z.object({
  ops: z.array(
    z.object({
      op: SyncOp,
      entity: SyncEntity,
      entity_id: z.string(),
      payload: z.unknown().optional(),
      rev: z.string(),
      client_id: z.string().optional(),
    }),
  ).max(500),
});

export type SyncPush = z.infer<typeof SyncPush>;

// --- Who-am-I ------------------------------------------------------------
export const WhoAmI = z.object({
  sub: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});