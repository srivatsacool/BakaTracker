import React, { Suspense, lazy } from 'react';
import { useStore } from '../../store/useStore';
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';

// Lazy-load Excalidraw so the ~180KiB (gzip) editor bundle only downloads
// when a user actually opens a page workspace (/notes/:pageId).
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then(m => ({ default: m.Excalidraw })),
);

const EditorCanvasFallback: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--arcade-void-deep)' }}>
    <div className="cabinet cabinet--attract flex flex-col items-center gap-3 p-6" style={{ '--marquee-color': 'var(--arcade-magenta)' } as React.CSSProperties}>
      <div className="w-8 h-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--arcade-magenta)', borderTopColor: 'transparent' }} />
      <p className="font-mono text-xs font-bold m-0" style={{ color: 'var(--arcade-paper-dim)' }}>
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
  /** Forwarded to Excalidraw's onChange — fires on every scene mutation. */
  onChange?: (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ initialData, onChange }) => {
  const theme = useStore(state => state.theme);

  return (
    // Excalidraw requires an explicit height on its container; the parent
    // (PageWorkspace) guarantees a definite height via flex-1/min-h-0.
    <div className="h-full w-full min-h-0" style={{ background: 'var(--arcade-void-deep)' }}>
      <Suspense fallback={<EditorCanvasFallback />}>
        <Excalidraw
          theme={theme}
          initialData={initialData ?? undefined}
          onChange={onChange}
        />
      </Suspense>
    </div>
  );
};
