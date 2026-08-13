import { ApiClient, BackendUnavailableError } from '../../api/apiClient';
import type { Page } from '../../types/page';

/**
 * Raised when GET /pages/:id returns 404 — page missing, archived for the
 * caller, or owned by another user. The backend deliberately shares one 404
 * for all three (no existence oracle), so callers must NOT imply which one.
 */
export class PageNotFoundError extends Error {
  constructor(message: string = 'Page not found.') {
    super(message);
    this.name = 'PageNotFoundError';
  }
}

export interface GetPageResponse {
  ok: true;
  page: Page;
}

/** Raised when PUT /pages/:id/scene returns 409 — local revision is stale. */
export class PageConflictError extends Error {
  currentRevision: number;
  constructor(currentRevision: number, message: string = 'This page was edited elsewhere.') {
    super(message);
    this.name = 'PageConflictError';
    this.currentRevision = currentRevision;
  }
}

/** Raised when PUT /pages/:id/scene returns 413 — scene exceeds the D1 cap. */
export class PageTooLargeError extends Error {
  constructor(message: string = 'This canvas is too large to save.') {
    super(message);
    this.name = 'PageTooLargeError';
  }
}

export interface SaveSceneResponse {
  ok: true;
  revision: number;
}

/**
 * Persist the serialized Excalidraw scene (PUT /api/v1/pages/:id/scene).
 *
 * Optimistic concurrency: `expectedRevision` is the revision we last saw; if
 * the server has moved on it answers 409 (caller decides reload vs overwrite).
 * 413 = scene over the 2 MiB D1 cap (never retry). Other failures propagate
 * as the ApiClient's typed errors (BackendUnavailableError etc.).
 */
export async function saveScene(
  client: ApiClient,
  pageId: string,
  scene: string,
  expectedRevision: number,
): Promise<number> {
  try {
    const res = await client.put<SaveSceneResponse>(`/api/v1/pages/${encodeURIComponent(pageId)}/scene`, {
      scene,
      expected_revision: expectedRevision,
    });
    return res.revision;
  } catch (err) {
    if (err instanceof BackendUnavailableError) {
      if (err.status === 409) {
        const body = (err as unknown as { message?: string; currentRevision?: number });
        throw new PageConflictError(body.currentRevision ?? expectedRevision, body.message);
      }
      if (err.status === 413) {
        throw new PageTooLargeError();
      }
    }
    throw err;
  }
}

/**
 * Fetch a single page by id (GET /api/v1/pages/:id).
 *
 * Surfaces a typed {@link PageNotFoundError} for 404s; everything else
 * (network, auth, 5xx) propagates as the ApiClient's typed errors.
 */
export async function getPage(client: ApiClient, pageId: string): Promise<Page> {
  try {
    const res = await client.get<GetPageResponse>(`/api/v1/pages/${encodeURIComponent(pageId)}`);
    return res.page;
  } catch (err) {
    if (err instanceof BackendUnavailableError && err.status === 404) {
      throw new PageNotFoundError();
    }
    throw err;
  }
}
