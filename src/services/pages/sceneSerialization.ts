import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { RestoredDataState } from '@excalidraw/excalidraw/data/restore';
import type { ImportedDataState } from '@excalidraw/excalidraw/data/types';
import type { AppState } from '@excalidraw/excalidraw/types';

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
 * Serialize elements + appState back into the stored scene string.
 *
 * STUB for checkpoint v2.1B-3 (scene save). Kept dependency-free on purpose:
 * the real implementation swaps in Excalidraw's serializeAsJSON() and must
 * run inside the lazy chunk so the editor stays code-split.
 */
export function serializeScene(
  elements: readonly ExcalidrawElement[],
  appState: Readonly<Partial<AppState>>,
): string {
  return JSON.stringify({
    type: 'excalidraw',
    version: 2, // matches Excalidraw's current scene format version
    source: 'bakatracker',
    elements,
    appState,
  });
}
