/**
 * Visual Notes (v2.1A) — REST page/notebook shapes.
 *
 * Mirrors `toPageResponse()` in platform/src/http/rest.ts. Only fields the UI
 * needs are declared; internal columns (user_id, body, tags) are omitted.
 */

export type PageKind = 'text' | 'excalidraw';

export interface Notebook {
  id: string;
  name: string;
  position: number;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface Page {
  id: string;
  title: string;
  kind: PageKind;
  /** Serialized Excalidraw scene JSON (`{type,version,source,elements,appState}`) or null when never saved. */
  scene: string | null;
  /** Optimistic-concurrency counter — bumped on every scene save. */
  revision: number;
  notebook_id: string | null;
  position: number;
  archived_at: string | null; // ISO datetime or null
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}
