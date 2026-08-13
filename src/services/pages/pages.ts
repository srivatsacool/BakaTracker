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
