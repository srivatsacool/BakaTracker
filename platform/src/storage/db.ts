/**
 * Storage — D1 data access for the Tool Registry.
 *
 * The client (IndexedDB) is the AUTHORITATIVE write model and works offline.
 * D1 mirrors data for cross-device search, analytics, and the sync ledger.
 * All access is user-scoped by the Google `sub`.
 */
import type { Task, Note, Notebook, Habit, Journal } from "../domain/schemas";
import { nowISO, todayISO } from "../shared/util";

// --- JSON-column hydration helpers -----------------------------------------

function unwrapTask(r: any): Task {
  return { ...r, tags: Array.isArray(r.tags) ? r.tags : r.tags ? JSON.parse(r.tags) : [] };
}
function unwrapHabit(r: any): Habit {
  return {
    ...r,
    log: Array.isArray(r.log) ? r.log : r.log ? JSON.parse(r.log) : [],
    target: r.target ?? 1,
    period: r.period ?? "day",
    streak: r.streak ?? 0,
    user_id: r.user_id ?? "",
    created_at: r.created_at ?? "",
    updated_at: r.updated_at ?? "",
  };
}
function unwrapNote(r: any): Note {
  return {
    ...r,
    body: r.body ?? "",
    kind: r.kind ?? "text",
    scene: r.scene ?? null,
    notebook_id: r.notebook_id ?? null,
    position: r.position ?? 0,
    archived_at: r.archived_at ?? null,
    revision: r.revision ?? 0,
    tags: Array.isArray(r.tags) ? r.tags : r.tags ? JSON.parse(r.tags) : [],
  };
}

// --- TASKS -----------------------------------------------------------------
export async function taskUpsert(db: D1Database, t: Task): Promise<void> {
  await db
    .prepare(
      `INSERT INTO tasks (id, user_id, created_at, updated_at, eta, status, title, body, tags, due, priority, sort)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
       ON CONFLICT(id) DO UPDATE SET updated_at=?4, eta=?5, title=?7, body=?8, tags=?9,
         due=?10, priority=?11, sort=?12, status=COALESCE(excluded.status,status)`,
    )
    .bind(
      t.id, t.user_id, t.created_at, t.updated_at,
      t.eta ?? null, t.status, t.title, t.body ?? null,
      JSON.stringify(t.tags ?? []), t.due ?? null, t.priority ?? 0, t.sort ?? 0,
    )
    .run();
}

export async function taskDelete(db: D1Database, userId: string, id: string): Promise<boolean> {
  const r = await db.prepare("DELETE FROM tasks WHERE id=?1 AND user_id=?2").bind(id, userId).run();
  return (r.meta?.changes ?? 0) > 0;
}

export async function taskGet(db: D1Database, userId: string, id: string): Promise<Task | null> {
  const r = await db.prepare("SELECT * FROM tasks WHERE id=?1 AND user_id=?2").bind(id, userId).first();
  return r ? unwrapTask(r) : null;
}

export async function taskList(
  db: D1Database, userId: string, status?: string, limit = 200,
): Promise<Task[]> {
  const sql = status
    ? `SELECT * FROM tasks WHERE user_id=?1 AND status=?2 ORDER BY sort, created_at DESC LIMIT ?3`
    : `SELECT * FROM tasks WHERE user_id=?1 ORDER BY sort, created_at DESC LIMIT ?2`;
  const stmt = status
    ? db.prepare(sql).bind(userId, status, limit)
    : db.prepare(sql).bind(userId, limit);
  const res = await stmt.all();
  return (res.results as any[]).map(unwrapTask);
}

// --- HABITS ---------------------------------------------------------------
export async function habitUpsert(db: D1Database, h: Habit): Promise<void> {
  await db
    .prepare(
      `INSERT INTO habits (id, user_id, created_at, updated_at, name, target, period, streak, log)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)
       ON CONFLICT(id) DO UPDATE SET updated_at=?4, name=?5, target=?6, period=?7, streak=?8, log=?9`,
    )
    .bind(h.id, h.user_id, h.created_at, h.updated_at, h.name, h.target, h.period, h.streak, JSON.stringify(h.log))
    .run();
}

export async function habitGet(db: D1Database, userId: string, id: string): Promise<Habit | null> {
  const r = await db.prepare("SELECT * FROM habits WHERE id=?1 AND user_id=?2").bind(id, userId).first();
  return r ? unwrapHabit(r) : null;
}

export async function habitList(db: D1Database, userId: string): Promise<Habit[]> {
  const res = await db.prepare("SELECT * FROM habits WHERE user_id=?1 ORDER BY created_at").bind(userId).all();
  return (res.results as any[]).map(unwrapHabit);
}

// --- NOTES ---------------------------------------------------------------
export async function noteUpsert(db: D1Database, n: Note): Promise<void> {
  await db
    .prepare(
      `INSERT INTO notes (id, user_id, created_at, updated_at, title, body, tags, kind, scene, notebook_id, position, archived_at, revision)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
       ON CONFLICT(id) DO UPDATE SET updated_at=?4, title=?5, body=?6, tags=?7,
         kind=COALESCE(excluded.kind, notes.kind),
         scene=excluded.scene, notebook_id=excluded.notebook_id,
         position=excluded.position, archived_at=excluded.archived_at,
         revision=excluded.revision`,
    )
    .bind(
      n.id, n.user_id, n.created_at, n.updated_at, n.title, n.body ?? null,
      JSON.stringify(n.tags ?? []),
      n.kind ?? "text", n.scene ?? null, n.notebook_id ?? null,
      n.position ?? 0, n.archived_at ?? null, n.revision ?? 0,
    )
    .run();
}

export async function noteDelete(db: D1Database, userId: string, id: string): Promise<boolean> {
  const r = await db.prepare("DELETE FROM notes WHERE id=?1 AND user_id=?2").bind(id, userId).run();
  return (r.meta?.changes ?? 0) > 0;
}

export async function noteGet(db: D1Database, userId: string, id: string): Promise<Note | null> {
  const r = await db.prepare("SELECT * FROM notes WHERE id=?1 AND user_id=?2").bind(id, userId).first();
  return r ? unwrapNote(r) : null;
}

export async function noteList(db: D1Database, userId: string): Promise<Note[]> {
  const res = await db.prepare("SELECT * FROM notes WHERE user_id=?1 ORDER BY updated_at DESC LIMIT 500").bind(userId).all();
  return (res.results as any[]).map(unwrapNote);
}

/** Keyword search over notes + tasks (LIKE-based for v0.2). */
export async function searchNotes(
  db: D1Database, userId: string, query: string, entity: "all" | "task" | "note" = "all", limit = 20,
): Promise<Array<{ entity: string; id: string; title: string; body: string }>> {
  const like = `%${query}%`;
  const out: Array<{ entity: string; id: string; title: string; body: string }> = [];

  if (entity !== "task") {
    const r = await db
      .prepare(
        `SELECT id, title, body FROM notes
         WHERE user_id=?1 AND (title LIKE ?2 OR body LIKE ?2) ORDER BY updated_at DESC LIMIT ?3`,
      )
      .bind(userId, like, limit)
      .all();
    for (const row of (r.results ?? []) as any[]) out.push({ entity: "note", id: row.id, title: row.title, body: row.body });
  }

  if (entity !== "note") {
    const r = await db
      .prepare(
        `SELECT id, title, body FROM tasks
         WHERE user_id=?1 AND (title LIKE ?2 OR body LIKE ?2) ORDER BY updated_at DESC LIMIT ?3`,
      )
      .bind(userId, like, limit)
      .all();
    for (const row of (r.results ?? []) as any[]) out.push({ entity: "task", id: row.id, title: row.title, body: row.body });
  }

  return out.slice(0, limit);
}

// --- NOTEBOOKS (v2.1: Notebook → Pages) -------------------------------------
export async function notebookUpsert(db: D1Database, n: Notebook): Promise<void> {
  await db
    .prepare(
      `INSERT INTO notebooks (id, user_id, name, position, created_at, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6)
       ON CONFLICT(id) DO UPDATE SET name=?3, position=?4, updated_at=?6`,
    )
    .bind(n.id, n.user_id, n.name, n.position ?? 0, n.created_at, n.updated_at)
    .run();
}

export async function notebookGet(db: D1Database, userId: string, id: string): Promise<Notebook | null> {
  const r = await db.prepare("SELECT * FROM notebooks WHERE id=?1 AND user_id=?2").bind(id, userId).first();
  if (!r) return null;
  const row = r as { name?: string; position?: number; created_at?: string; updated_at?: string };
  const nb: Notebook = {
    id: r.id as string,
    user_id: r.user_id as string,
    name: row.name ?? "Personal",
    position: row.position ?? 0,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
  return nb;
}

export async function notebookList(db: D1Database, userId: string): Promise<Notebook[]> {
  const res = await db
    .prepare("SELECT * FROM notebooks WHERE user_id=?1 ORDER BY position, created_at ASC")
    .bind(userId)
    .all();
  return (res.results ?? []) as unknown as Notebook[];
}

export async function notebookDelete(db: D1Database, userId: string, id: string): Promise<boolean> {
  const r = await db.prepare("DELETE FROM notebooks WHERE id=?1 AND user_id=?2").bind(id, userId).run();
  return (r.meta?.changes ?? 0) > 0;
}

export async function notebookCountForUser(db: D1Database, userId: string): Promise<number> {
  const r = await db.prepare("SELECT COUNT(*) n FROM notebooks WHERE user_id=?1").bind(userId).first<{ n: number }>();
  return r?.n ?? 0;
}

// --- PAGES (v2.1: notes as pages with scene + revision) ---------------------
// noteUpsert already persists all v2.1 columns (kind, scene, notebook_id,
// position, archived_at, revision) — it IS the page upsert. No separate
// noteUpsertPage function is needed.

/** List a notebook's active pages, ordered by position then updated_at. */
export async function noteListPages(
  db: D1Database, userId: string, notebookId: string | null, limit = 500,
): Promise<Note[]> {
  const res = await db
    .prepare(
      `SELECT * FROM notes
       WHERE user_id=?1 AND archived_at IS NULL
         AND (notebook_id=?2 OR (?2 IS NULL AND notebook_id IS NULL))
       ORDER BY position ASC, updated_at DESC LIMIT ?3`,
    )
    .bind(userId, notebookId, limit)
    .all();
  return (res.results ?? []).map(unwrapNote);
}

/** List ALL of a user's active pages across notebooks (for search / global view). */
export async function noteListAllPages(db: D1Database, userId: string, limit = 500): Promise<Note[]> {
  const res = await db
    .prepare(
      "SELECT * FROM notes WHERE user_id=?1 AND archived_at IS NULL ORDER BY position ASC, updated_at DESC LIMIT ?2",
    )
    .bind(userId, limit)
    .all();
  return (res.results ?? []).map(unwrapNote);
}

/** Count active pages for a user. */
export async function notePageCount(db: D1Database, userId: string): Promise<number> {
  const r = await db
    .prepare("SELECT COUNT(*) n FROM notes WHERE user_id=?1 AND archived_at IS NULL")
    .bind(userId)
    .first<{ n: number }>();
  return r?.n ?? 0;
}

/** Optimistic-concurrency scene save. Atomically updates `scene`, `body`,
 * `revision`+1, `updated_at` ONLY when the current revision matches
 * `expectedRevision`. Returns the new revision (or null on stale revision → 409). */
export async function noteSaveScene(
  db: D1Database, userId: string, id: string, scene: string, body: string | null,
  expectedRevision: number,
): Promise<number | null> {
  const now = nowISO();
  const r = await db
    .prepare(
      `UPDATE notes
       SET scene=?3, body=COALESCE(?4, body), revision=revision+1, updated_at=?5
       WHERE id=?1 AND user_id=?2 AND revision=?6`,
    )
    .bind(id, userId, scene, body, now, expectedRevision)
    .run();
  if ((r.meta?.changes ?? 0) === 0) return null;
  const row = await db.prepare("SELECT revision FROM notes WHERE id=?1 AND user_id=?2").bind(id, userId).first<{ revision: number }>();
  return row?.revision ?? null;
}

/** Soft-delete (archive) a page. */
export async function noteArchive(db: D1Database, userId: string, id: string): Promise<boolean> {
  const r = await db
    .prepare("UPDATE notes SET archived_at=datetime('now') WHERE id=?1 AND user_id=?2 AND archived_at IS NULL")
    .bind(id, userId)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}

/** Restore a previously-archived page. */
export async function noteRestore(db: D1Database, userId: string, id: string): Promise<boolean> {
  const r = await db
    .prepare("UPDATE notes SET archived_at=NULL WHERE id=?1 AND user_id=?2 AND archived_at IS NOT NULL")
    .bind(id, userId)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}

/** Reassign positions for a set of pages (reorder). The `order` array maps
 *  index → page id; each gets position = index * step. */
export async function noteReorder(
  db: D1Database, userId: string, notebookId: string | null, order: string[], step: number,
): Promise<void> {
  const now = nowISO();
  void notebookId; // ordering is scoped by user+id; notebookId available for future partitioning
  for (let i = 0; i < order.length; i++) {
    await db
      .prepare("UPDATE notes SET position=?3, updated_at=?4 WHERE id=?1 AND user_id=?2 AND archived_at IS NULL")
      .bind(order[i], userId, i * step, now)
      .run();
  }
}

// --- JOURNAL ---------------------------------------------------------------
export async function journalUpsert(db: D1Database, j: Journal): Promise<void> {
  await db
    .prepare(
      `INSERT INTO journal (id, user_id, date, entry, mood, created_at, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7)
       ON CONFLICT(user_id, date) DO UPDATE SET entry=?4, mood=?5, updated_at=?7`,
    )
    .bind(j.id, j.user_id, j.date ?? todayISO(), j.entry ?? "", j.mood ?? null, j.created_at, j.updated_at)
    .run();
}

export async function journalGet(db: D1Database, userId: string, date: string): Promise<Journal | null> {
  const r = await db.prepare("SELECT * FROM journal WHERE user_id=?1 AND date=?2").bind(userId, date).first();
  return (r as Journal) ?? null;
}

export async function journalDelete(db: D1Database, userId: string, date: string): Promise<boolean> {
  const r = await db.prepare("DELETE FROM journal WHERE user_id=?1 AND date=?2").bind(userId, date).run();
  return (r.meta?.changes ?? 0) > 0;
}

export async function journalList(db: D1Database, userId: string, from?: string, to?: string): Promise<Journal[]> {
  let sql = "SELECT * FROM journal WHERE user_id=?1";
  const binds = [userId];
  if (from) { sql += " AND date>=?"; binds.push(from); }
  if (to) { sql += " AND date<=?"; binds.push(to); }
  sql += " ORDER BY date DESC LIMIT 365";
  const res = await db.prepare(sql).bind(...binds).all();
  return (res.results ?? []) as Journal[];
}

// --- FILES (metadata mirror; binaries live in R2) --------------------------
import type { FileMeta } from "../domain/schemas";

type FileRow = FileMeta & { r2_key: string };

export async function fileInsert(db: D1Database, row: FileRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO files (id, user_id, r2_key, filename, mime_type, size, created_at, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`,
    )
    .bind(row.id, row.user_id, row.r2_key, row.filename, row.mime_type, row.size, row.created_at, row.updated_at)
    .run();
}

/** Fetch one file row — ALWAYS scoped by user_id (never by id alone). */
export async function fileGet(db: D1Database, userId: string, id: string): Promise<FileRow | null> {
  const r = await db.prepare("SELECT * FROM files WHERE id=?1 AND user_id=?2").bind(id, userId).first();
  return (r as FileRow) ?? null;
}

export async function fileList(db: D1Database, userId: string, limit = 100): Promise<FileRow[]> {
  const r = await db
    .prepare("SELECT * FROM files WHERE user_id=?1 ORDER BY created_at DESC LIMIT ?2")
    .bind(userId, limit)
    .all();
  return (r.results ?? []) as FileRow[];
}

/** Delete one file row — scoped by user. Returns true if a row was removed. */
export async function fileDelete(db: D1Database, userId: string, id: string): Promise<boolean> {
  const r = await db.prepare("DELETE FROM files WHERE id=?1 AND user_id=?2").bind(id, userId).run();
  return (r.meta?.changes ?? 0) > 0;
}

/** All of a user's file rows (for reset: keys must be purged from R2 too). */
export async function fileListAllForUser(db: D1Database, userId: string): Promise<FileRow[]> {
  const r = await db.prepare("SELECT * FROM files WHERE user_id=?1").bind(userId).all();
  return (r.results ?? []) as FileRow[];
}

export async function fileDeleteAllForUser(db: D1Database, userId: string): Promise<number> {
  const r = await db.prepare("DELETE FROM files WHERE user_id=?1").bind(userId).run();
  return r.meta?.changes ?? 0;
}

// --- Reset (per-user, never global) ---------------------------------------
// Deletes ALL data rows for ONE user across every entity. Used by the
// `reset_account` tool (and only ever scoped by user_id — auth/session/owner
// state lives outside these tables and is never touched).

/** Distinct user ids with any data — drives the proactive notification
 * scheduler (there is no users table; identities are Google `sub`s). */
export async function activeUserIds(db: D1Database): Promise<string[]> {
  const r = await db
    .prepare(
      `SELECT user_id FROM (
         SELECT user_id FROM tasks
         UNION SELECT user_id FROM habits
         UNION SELECT user_id FROM notes
         UNION SELECT user_id FROM journal
         UNION SELECT user_id FROM files
       )`,
    )
    .all();
  return ((r.results ?? []) as Array<{ user_id: string }>).map((row) => row.user_id);
}


export async function taskDeleteAllForUser(db: D1Database, userId: string): Promise<number> {
  const r = await db.prepare("DELETE FROM tasks WHERE user_id=?1").bind(userId).run();
  return r.meta?.changes ?? 0;
}

export async function habitDeleteAllForUser(db: D1Database, userId: string): Promise<number> {
  const r = await db.prepare("DELETE FROM habits WHERE user_id=?1").bind(userId).run();
  return r.meta?.changes ?? 0;
}

export async function noteDeleteAllForUser(db: D1Database, userId: string): Promise<number> {
  const r = await db.prepare("DELETE FROM notes WHERE user_id=?1").bind(userId).run();
  return r.meta?.changes ?? 0;
}

export async function journalDeleteAllForUser(db: D1Database, userId: string): Promise<number> {
  const r = await db.prepare("DELETE FROM journal WHERE user_id=?1").bind(userId).run();
  return r.meta?.changes ?? 0;
}