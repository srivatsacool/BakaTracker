import { ApiClient, BackendUnavailableError } from '../../api/apiClient';
import type { Notebook, Page } from '../../types/page';

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
        const body = err.body as { currentRevision?: number; message?: string } | undefined;
        throw new PageConflictError(body?.currentRevision ?? expectedRevision, body?.message);
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

// --- Notebook + page lifecycle (v2.1B-4 chrome) ---------------------------

export interface ListNotebooksResponse {
  ok: true;
  notebooks: Notebook[];
}

export interface CreateNotebookResponse {
  ok: true;
  notebook: Notebook;
}

export interface ListPagesResponse {
  ok: true;
  pages: Page[];
}

export interface CreatePageResponse {
  ok: true;
  page: Page;
}

export interface UpdatePageResponse {
  ok: true;
  page: Page;
}

export interface DeleteNotebookResponse {
  ok: true;
  removed: boolean;
}

/** List the caller's notebooks (GET /api/v1/notebooks). */
export async function listNotebooks(client: ApiClient): Promise<Notebook[]> {
  const res = await client.get<ListNotebooksResponse>('/api/v1/notebooks');
  return res.notebooks;
}

/** Create a notebook (POST /api/v1/notebooks). */
export async function createNotebook(client: ApiClient, name: string, position?: number): Promise<Notebook> {
  const res = await client.post<CreateNotebookResponse>('/api/v1/notebooks', { name, position });
  return res.notebook;
}

/**
 * Delete a notebook (DELETE /api/v1/notebooks/:id). Pages inside it are
 * reassigned to the default notebook server-side.
 */
export async function deleteNotebook(client: ApiClient, notebookId: string): Promise<void> {
  await client.delete<DeleteNotebookResponse>(`/api/v1/notebooks/${encodeURIComponent(notebookId)}`);
}

/** List a notebook's pages (GET /api/v1/notebooks/:id/pages). */
export async function listPages(client: ApiClient, notebookId: string): Promise<Page[]> {
  const res = await client.get<ListPagesResponse>(`/api/v1/notebooks/${encodeURIComponent(notebookId)}/pages`);
  return res.pages;
}

/** Create a page in a notebook (POST /api/v1/pages). */
export async function createPage(
  client: ApiClient,
  opts: { notebookId?: string | null; title: string; kind?: Page['kind'] },
): Promise<Page> {
  const res = await client.post<CreatePageResponse>('/api/v1/pages', {
    notebook_id: opts.notebookId ?? undefined,
    title: opts.title,
    kind: opts.kind ?? 'excalidraw',
  });
  return res.page;
}

/** Rename a page (PATCH /api/v1/pages/:id). */
export async function renamePage(client: ApiClient, pageId: string, title: string): Promise<Page> {
  const res = await client.patch<UpdatePageResponse>(`/api/v1/pages/${encodeURIComponent(pageId)}`, { title });
  return res.page;
}

/** Archive a page (POST /api/v1/pages/:id/archive). */
export async function archivePage(client: ApiClient, pageId: string): Promise<void> {
  await client.post<{ ok: true }>(`/api/v1/pages/${encodeURIComponent(pageId)}/archive`, {});
}

/** Restore an archived page (POST /api/v1/pages/:id/restore). */
export async function restorePage(client: ApiClient, pageId: string): Promise<void> {
  await client.post<{ ok: true }>(`/api/v1/pages/${encodeURIComponent(pageId)}/restore`, {});
}

/** Duplicate a page (POST /api/v1/pages/:id/duplicate). */
export async function duplicatePage(client: ApiClient, pageId: string): Promise<Page> {
  const res = await client.post<CreatePageResponse>(`/api/v1/pages/${encodeURIComponent(pageId)}/duplicate`, {});
  return res.page;
}
