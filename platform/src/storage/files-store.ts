/**
 * R2 boundary — the ONLY layer that touches R2 objects.
 *
 * Key scheme: `users/{user_id}/files/{file_id}` — the user_id is ALWAYS the
 * authenticated identity (from the OAuth bearer token), never a client-supplied
 * value, so no user can address another user's prefix.
 *
 * Bundled into the file storage layer via FileRepository (storage/repositories),
 * which pairs R2 objects with their D1 metadata mirror.
 */
import type { FileMeta } from "../domain/schemas";

/** Derive the R2 object key for a file. user_id comes from auth, never the client. */
export function fileObjectKey(userId: string, fileId: string): string {
  return `users/${userId}/files/${fileId}`;
}

/** True when the key is inside the authenticated user's own prefix. */
export function isOwnedKey(userId: string, key: string): boolean {
  return key.startsWith(`users/${userId}/files/`);
}

export interface StoredFileBody {
  meta: FileMeta & { r2_key: string };
  body: ArrayBuffer;
}

export class FileStore {
  constructor(private readonly bucket: R2Bucket) {}

  /** Returns true when an object exists at the derived key. */
  async exists(userId: string, fileId: string): Promise<boolean> {
    const head = await this.bucket.head(fileObjectKey(userId, fileId));
    return head !== null;
  }

  /** Read an object — only ever at the user-owned derived key. */
  async read(userId: string, fileId: string): Promise<R2ObjectBody | null> {
    const key = fileObjectKey(userId, fileId);
    return this.bucket.get(key);
  }

  /**
   * Write an object at the derived key. `size` is checked before the write
   * (the caller has already validated the bound) and recorded as metadata.
   */
  async write(userId: string, fileId: string, body: ArrayBuffer, contentType: string): Promise<void> {
    await this.bucket.put(fileObjectKey(userId, fileId), body, {
      httpMetadata: { contentType },
    });
  }

  /** Delete an object. Returns whether an object existed. */
  async remove(userId: string, fileId: string): Promise<boolean> {
    const key = fileObjectKey(userId, fileId);
    const existing = await this.bucket.head(key);
    if (existing) await this.bucket.delete(key);
    return existing !== null;
  }

  /**
   * Purge every object under the user's prefix — used by per-user reset.
   * Lists with the authenticated prefix only, so it can never cross users.
   */
  async removeAllForUser(userId: string): Promise<number> {
    const prefix = `users/${userId}/files/`;
    let deleted = 0;
    let cursor: string | undefined;
    do {
      const listed = await this.bucket.list({ prefix, cursor, limit: 1000 });
      if (listed.objects.length) {
        await this.bucket.delete(listed.objects.map((o) => o.key));
        deleted += listed.objects.length;
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
    return deleted;
  }
}