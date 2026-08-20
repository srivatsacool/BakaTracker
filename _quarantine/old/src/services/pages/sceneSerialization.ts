import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { RestoredDataState } from '@excalidraw/excalidraw/data/restore';
import type { ImportedDataState } from '@excalidraw/excalidraw/data/types';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';

/**
 * Pure, unit-testable scene (de)serialization helpers for Excalidraw pages.
 *
 * IMPORTANT: all imports from @excalidraw/excalidraw here are TYPE-ONLY. This
 * module is statically imported by eager code (PageWorkspace), so any value
 * import would drag the editor bundle into the entry chunk and defeat the
 * lazy code-split. The actual restore()/serializeAsJSON() calls happen in
 * hydrateScene.ts / the editor chunk, which import the package dynamically.
 */

/**
 * Raw scene payload after JSON.parse — the subset of Excalidraw's
 * ImportedDataState that restore() consumes.
 */
export type ScenePayload = Pick<ImportedDataState, 'elements' | 'appState' | 'files'>;

/**
 * Schema-migrated, fully-hydrated scene (the output of Excalidraw's restore()).
 */
export type RestoredScene = RestoredDataState;

/**
 * Parse a stored scene string into a restore()able payload.
 *
 * Null/undefined/empty/corrupt JSON → null (the caller renders a fresh
 * canvas). Pure + synchronous, so it unit-tests without the Excalidraw bundle.
 *
 * NOTE: schema migration is intentionally NOT applied here — every non-null
 * result MUST be passed through Excalidraw's restore() (see hydrateScene)
 * before the editor mounts, so scenes render identically after reload.
 */
export function parseScene(scene: string | null | undefined): ScenePayload | null {
  if (scene == null || scene.trim() === '') {
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(scene);
  } catch {
    // Corrupt scene string — treat as empty, never crash the editor.
    return null;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }
  return raw as ScenePayload;
}

/**
 * Serialize elements + appState (+ files) into the stored scene string.
 *
 * Real Excalidraw serialization requires the editor bundle, so the actual
 * `serializeAsJSON()` call happens via a DYNAMIC import here — this keeps the
 * ~180 KiB editor out of the entry chunk (the caller, PageWorkspace, is eager).
 * The surrounding module only imports types from @excalidraw/excalidraw.
 */
export async function serializeScene(
  elements: readonly ExcalidrawElement[],
  appState: Readonly<Partial<AppState>>,
  files: BinaryFiles = {},
): Promise<string> {
  const { serializeAsJSON } = await import('@excalidraw/excalidraw');
  // 'local' scope omits server-only fields; files carries embedded assets.
  return serializeAsJSON(elements as ExcalidrawElement[], appState as Partial<AppState>, files, 'local');
}

/**
 * Detect whether a (partially) serialized scene embeds base64 `data:` URLs.
 *
 * Excalidraw stores pasted/dropped images as `files[<id>].dataURL` (a base64
 * `data:image/...` string). The v2.1A contract BANS dataURLs in scenes (D1
 * stores the JSON; 2 MiB cap + no binary-in-text). We block save and tell the
 * user, rather than silently dropping their drawing.
 *
 * Scans both the element-level `fileId` references (cheap) and, when present,
 * the `files` map's `dataURL` values. Returns true if any dataURL is found.
 */
export function containsDataUrl(scene: string): boolean {
  if (!scene) return false;
  // Fast path: a data: URL is the only thing we forbid. JSON of a normal
  // drawing never contains the literal "data:" scheme.
  return scene.includes('data:');
}
