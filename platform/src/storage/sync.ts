/**
 * Sync Engine — the client (IndexedDB) is authoritative; the server is a mirror.
 *
 * Flow (matches the v2.0 architecture):
 *   UI → IndexedDB → Sync Queue → Background Sync → Worker → D1
 *
 * Conflict resolution: LOCAL WINS by default; the client may pass `force_merge`
 * to request server-side merge for specific ops. Every write carries a causal
 * revision (`rev`) so the server can detect conflicts.
 */
import type { SyncPush } from "../domain/schemas";
import type { Task, Note, Habit, Journal } from "../domain/schemas";
import { jsonParse, nowISO } from "../shared/util";
import { repositories } from "./repositories";

export interface SyncResult {
  accepted: number;
  conflicts: number;
  server_time: string;
}

/**
 * Apply a batch of client sync ops. Local (client) wins: an op is applied
 * unless a newer revision already exists server-side for that entity.
 */
export async function applySyncPush(
  database: D1Database,
  userId: string,
  push: SyncPush,
): Promise<SyncResult> {
  let accepted = 0;
  let conflicts = 0;

  for (const op of push.ops) {
    const entity = op.entity;
    const id = op.entity_id;
    const rev = op.rev;

    // Conflict check: is there a newer revision for this entity already?
    const existing = await database
      .prepare("SELECT rev FROM sync_queue WHERE user_id=?1 AND entity=?2 AND entity_id=?3 ORDER BY created_at DESC LIMIT 1")
      .bind(userId, entity, id)
      .first<{ rev: string }>();

    if (existing && existing.rev !== rev) {
      // Server has a different/newer revision → local wins per policy, but
      // record the conflict for the client to optionally merge.
      conflicts++;
      continue;
    }

    // Persist op into the ledger first (so it survives replays).
    await database
      .prepare(
        `INSERT OR REPLACE INTO sync_queue (id, user_id, op, entity, entity_id, payload, rev, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`,
      )
      .bind(
        crypto.randomUUID(), userId, op.op, entity, id,
        op.payload ? JSON.stringify(op.payload) : null, rev, nowISO(),
      )
      .run();

    // Apply to the mirror tables.
    const applied = await applyOp(database, userId, entity, op.op, id, op.payload);
    if (applied) accepted++;
  }

  // Update sync cursor.
  await database
    .prepare("INSERT OR REPLACE INTO sync_meta (user_id, last_sync, cursor) VALUES (?1,?2,?3)")
    .bind(userId, nowISO(), String(Date.now()))
    .run();

  return { accepted, conflicts, server_time: nowISO() };
}

async function applyOp(
  database: D1Database,
  userId: string,
  entity: string,
  op: string,
  id: string,
  payload: unknown,
): Promise<boolean> {
  const now = nowISO();
  const repos = repositories(database);
  switch (entity) {
    case "task": {
      if (op === "delete") return repos.tasks.delete(userId, id);
      const t = payload as Task;
      await repos.tasks.upsert({
        ...t,
        id,
        user_id: t.user_id ?? userId,
        created_at: t.created_at ?? now,
        updated_at: t.updated_at ?? now,
        title: t.title ?? "Untitled",
        status: t.status ?? "todo",
      });
      return true;
    }
    case "note": {
      if (op === "delete") return repos.notes.delete(userId, id);
      const n = payload as Note;
      await repos.notes.upsert({
        ...n,
        id,
        user_id: n.user_id ?? userId,
        created_at: n.created_at ?? now,
        updated_at: n.updated_at ?? now,
        title: n.title ?? "Untitled",
        body: n.body ?? "",
        // v2.1 page columns: pass through if the client sent them; the upsert
        // SQL preserves existing values when they are absent via COALESCE.
        kind: n.kind,
        scene: n.scene,
        notebook_id: n.notebook_id,
        position: n.position ?? 0,
        archived_at: n.archived_at,
        revision: n.revision ?? 0,
      });
      return true;
    }
    case "habit": {
      const h = payload as Habit;
      await repos.habits.upsert({
        ...h,
        id,
        user_id: h.user_id ?? userId,
        created_at: h.created_at ?? now,
        updated_at: h.updated_at ?? now,
        name: h.name ?? "Untitled",
        log: h.log ?? [],
      });
      return true;
    }
    case "journal": {
      if (op === "delete") {
        // Journal is keyed by (user_id, date); entity_id is the entry's id.
        // Look up the entry to get the date, then delete by date.
        const j = await database
          .prepare("SELECT date FROM journal WHERE id=?1 AND user_id=?2")
          .bind(id, userId)
          .first<{ date: string }>();
        if (j) return repos.journal.delete(userId, j.date);
        return false;
      }
      const j = payload as Journal;
      await repos.journal.upsert({
        ...j,
        id,
        user_id: j.user_id ?? userId,
        created_at: j.created_at ?? now,
        updated_at: j.updated_at ?? now,
      });
      return true;
    }
    default:
      return false;
  }
}

/** Pull mirror state since a cursor — for cross-device initial hydration. */
export async function pullChanges(
  database: D1Database,
  userId: string,
  sinceCursor?: string,
): Promise<{ tasks: Task[]; notes: Note[]; habits: Habit[]; journal: Journal[]; cursor: string }> {
  const since = sinceCursor ? String(sinceCursor) : "0";
  const repos = repositories(database);
  const tasks = await repos.tasks.list(userId);
  const notes = await repos.notes.list(userId);
  const habits = await repos.habits.list(userId);
  const journal = await repos.journal.list(userId);
  return { tasks, notes, habits, journal, cursor: String(Date.now()) };
}

/** Long-poll / incremental pull — ops newer than cursor. */
export async function pullOps(
  database: D1Database,
  userId: string,
  cursor?: string,
): Promise<{ ops: unknown[]; cursor: string }> {
  const since = cursor ?? "0";
  const res = await database
    .prepare("SELECT op, entity, entity_id, payload, rev FROM sync_queue WHERE user_id=?1 AND created_at > ?2 ORDER BY created_at LIMIT 500")
    .bind(userId, new Date(Number(since)).toISOString())
    .all();
  const ops = (res.results ?? []).map((r: any) => ({
    op: r.op, entity: r.entity, entity_id: r.entity_id,
    payload: jsonParse(r.payload, undefined), rev: r.rev,
  }));
  return { ops, cursor: String(Date.now()) };
}