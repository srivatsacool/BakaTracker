import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';
import { parseScene } from './sceneSerialization';

/**
 * Turn a stored scene string into Excalidraw `initialData` for hydration.
 *
 * The @excalidraw/excalidraw import is DYNAMIC on purpose: this module is
 * statically imported from eager code (PageWorkspace), so a static import
 * would drag the ~180 kB (gzip) editor bundle into the entry chunk. The
 * dynamic import resolves to the same chunk the editor itself lazy-loads,
 * keeping the code-split intact.
 *
 * Null/empty/corrupt scenes → null (fresh canvas — Excalidraw shows its
 * WelcomeScreen by default). Every valid scene runs through restore() for
 * schema migration, so scenes render identically after reload. scrollToContent
 * is set so a small scene is centered instead of stuck at the origin.
 */
export async function hydrateScene(
  scene: string | null | undefined,
): Promise<ExcalidrawInitialDataState | null> {
  const payload = parseScene(scene);
  if (!payload) {
    return null;
  }

  const { restore } = await import('@excalidraw/excalidraw');
  const restored = restore(payload, null, null);
  return { ...restored, scrollToContent: true };
}
