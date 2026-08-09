/**
 * Files repository — the aggregate access point for file storage (v2.0 R2).
 *
 * Layering: Tool/REST → FileRepository → (D1 metadata + R2 object). Tools and
 * REST never touch D1 or R2 directly; they only see this class.
 *
 * Security invariants (v2.0 file isolation):
 *  - user_id is ALWAYS the authenticated OAuth `sub`; never client-supplied.
 *  - every D1 read/write/delete is scoped `WHERE user_id = ?`.
 *  - every R2 key is server-derived `users/{user_id}/files/{file_id}` —
 *    there is no way to address another user's object.
 *  - uploads validate MIME (allowlist) and size (≤ MAX_FILE_SIZE) before write.
 */
import type { FileMeta } from "../../domain/schemas";
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "../../domain/schemas";
import { fileInsert, fileGet, fileList, fileDelete, fileListAllForUser, fileDeleteAllForUser } from "../db";
import { FileStore } from "../files-store";
import { id, nowISO } from "../../shared/util";

/** File-layer errors carry an HTTP-friendly code for the REST transport. */
export class FileError extends Error {
  constructor(public code: "not_configured" | "too_large" | "bad_mime" | "not_found" | "invalid", message: string) {
    super(message);
    this.name = "FileError";
  }
}

function sanitizeFilename(raw: string): string {
  // Base-name only: strip any path component so a malicious filename can
  // never walk directories or smuggle separators into headers.
  const basename = raw.split(/[\\/]/).pop() ?? raw;
  return basename.slice(0, 255);
}

export class FileRepository {
  private readonly store: FileStore | null;

  constructor(
    db: D1Database,
    bucket?: R2Bucket,
  ) {
    this.db = db;
    this.store = bucket ? new FileStore(bucket) : null;
  }

  private readonly db: D1Database;

  private requireStore(): FileStore {
    if (!this.store) {
      throw new FileError(
        "not_configured",
        "R2 is not configured on this instance — deploy with `npm run setup --with-r2` to enable file storage.",
      );
    }
    return this.store;
  }

  /**
   * Store bytes from a trusted in-memory buffer. Validates MIME + size,
   * derives the R2 key, writes the object, then records the D1 mirror.
   */
  async upload(
    userId: string,
    input: { filename: string; mime_type: string; body: ArrayBuffer },
  ): Promise<FileMeta> {
    const store = this.requireStore();
    const filename = sanitizeFilename(input.filename);
    const mime = input.mime_type.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new FileError("bad_mime", `MIME type "${input.mime_type}" is not allowed (see ALLOWED_MIME_TYPES).`);
    }
    if (input.body.byteLength > MAX_FILE_SIZE) {
      throw new FileError(
        "too_large",
        `File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)} MiB upload limit (got ${Math.round(input.body.byteLength / 1024)} KiB).`,
      );
    }

    const fileId = id("file");
    const now = nowISO();
    const meta: FileMeta = {
      id: fileId,
      user_id: userId,
      filename,
      mime_type: mime,
      size: input.body.byteLength,
      created_at: now,
      updated_at: now,
    };

    await store.write(userId, fileId, input.body, mime);
    await fileInsert(this.db, { ...meta, r2_key: `users/${userId}/files/${fileId}` });
    return meta;
  }

  /** Metadata for one file — row lookup scoped by user (404 semantics). */
  async getMeta(userId: string, fileId: string): Promise<FileMeta | null> {
    const row = await fileGet(this.db, userId, fileId);
    if (!row) return null;
    const { r2_key: _r2_key, ...meta } = row; // r2_key is internal, never exposed
    return meta;
  }

  /** Full file (metadata + bytes). Returns null when the row/object is missing. */
  async get(
    userId: string,
    fileId: string,
  ): Promise<{ meta: FileMeta; body: ArrayBuffer } | null> {
    const store = this.requireStore();
    const row = await fileGet(this.db, userId, fileId);
    if (!row) return null;
    const obj = await store.read(userId, fileId);
    if (!obj) return null;
    const { r2_key: _r2_key, ...meta } = row;
    return { meta, body: await obj.arrayBuffer() };
  }

  /** List a user's file metadata, newest first. */
  async list(userId: string, limit = 100): Promise<FileMeta[]> {
    const rows = await fileList(this.db, userId, Math.min(Math.max(1, limit), 500));
    return rows.map(({ r2_key: _r2_key, ...meta }) => meta);
  }

  /**
   * Delete a file — D1 row (scoped) then R2 object. Never touches rows or
   * objects outside the calling user's scope. Returns false for unknown ids
   * (404 semantics; no existence oracle for other users' files).
   */
  async delete(userId: string, fileId: string): Promise<boolean> {
    const store = this.requireStore();
    const row = await fileGet(this.db, userId, fileId);
    if (!row) return false;
    await store.remove(userId, fileId);
    await fileDelete(this.db, userId, fileId);
    return true;
  }

  /** Purge ALL of a user's files (R2 objects + D1 rows). Per-user reset. */
  async deleteAll(userId: string): Promise<number> {
    const rows = await fileListAllForUser(this.db, userId);
    if (this.store && rows.length) {
      for (const row of rows) {
        await this.store.remove(userId, row.id);
      }
    }
    await fileDeleteAllForUser(this.db, userId);
    return rows.length;
  }
}