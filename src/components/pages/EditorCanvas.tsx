import React, { Suspense, lazy } from 'react';
import { useStore } from '../../store/useStore';
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';

// Lazy-load Excalidraw so the ~180KiB (gzip) editor bundle only downloads
// when a user actually opens a page workspace (/notes/:pageId).
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then(m => ({ default: m.Excalidraw })),
);

const EditorCanvasFallback: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center bg-bg-primary">
    <div className="neo-card flex flex-col items-center gap-3 p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
      <p className="font-mono text-xs font-bold text-gray-600 dark:text-gray-400">
        Loading canvas…
      </p>
    </div>
  </div>
);

interface EditorCanvasProps {
  /**
   * Hydrated scene for the editor (already run through Excalidraw's restore()).
   * `null`/`undefined` → fresh empty canvas (WelcomeScreen shows by default).
   * Only applied on mount — Excalidraw treats initialData as initial.
   */
  initialData?: ExcalidrawInitialDataState | null;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ initialData }) => {
  const theme = useStore(state => state.theme);

  return (
    // Excalidraw requires an explicit height on its container; the parent
    // (PageWorkspace) guarantees a definite height via flex-1/min-h-0.
    <div className="h-full w-full min-h-0">
      <Suspense fallback={<EditorCanvasFallback />}>
        <Excalidraw theme={theme} initialData={initialData} />
      </Suspense>
    </div>
  );
};
