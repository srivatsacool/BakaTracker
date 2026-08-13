import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Cloud, CloudOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { useApiClient } from '../api/authFetch';
import {
  getPage,
  PageNotFoundError,
  saveScene,
  PageConflictError,
  PageTooLargeError,
} from '../services/pages/pages';
import { hydrateScene } from '../services/pages/hydrateScene';
import { serializeScene, containsDataUrl } from '../services/pages/sceneSerialization';
import { EditorCanvas } from '../components/pages/EditorCanvas';
import type { Page } from '../types/page';
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { BinaryFiles, AppState } from '@excalidraw/excalidraw/types';

/** Idle delay before a changed scene is flushed to the server. */
const AUTOSAVE_DEBOUNCE_MS = 1500;
/** Excalidraw scene JSON size guard (server caps at 2 MiB; bail earlier). */
const SOFT_MAX_BYTES = 1_900_000;

type LoadError = { kind: 'not-found' } | { kind: 'error'; message: string };
type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }
  | { kind: 'conflict'; currentRevision: number }
  | { kind: 'too-large' }
  | { kind: 'data-url' };

const WorkspaceSpinner: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex h-full w-full items-center justify-center bg-bg-primary">
    <div className="neo-card flex flex-col items-center gap-3 p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-accent-pink bg-white" />
      <p className="font-mono text-xs font-bold text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  </div>
);

export const PageWorkspace: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const [reloadKey, setReloadKey] = useState(0);
  // Remount on id OR reload so every open starts from a clean, fully-reset
  // state — no stale refs, revision, or save status.
  const reload = useCallback(() => setReloadKey(k => k + 1), []);
  return <PageWorkspaceInner key={`${pageId ?? 'no-id'}:${reloadKey}`} pageId={pageId} onReload={reload} />;
};

const PageWorkspaceInner: React.FC<{ pageId: string | undefined; onReload: () => void }> = ({ pageId, onReload }) => {
  const apiClient = useApiClient();
  const [page, setPage] = useState<Page | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [hydratedScene, setHydratedScene] = useState<ExcalidrawInitialDataState | null | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: 'idle' });

  const missingId = pageId === undefined;

  // Latest scene captured from Excalidraw's onChange; serialized lazily on save.
  const elementsRef = useRef<readonly ExcalidrawElement[] | null>(null);
  const appStateRef = useRef<Partial<AppState> | null>(null);
  const filesRef = useRef<BinaryFiles | null>(null);
  const revisionRef = useRef<number>(0);
  const dirtyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to the latest flush so setTimeout closures avoid TDZ / stale captures.
  const flushRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const flush = useCallback(async () => {
    if (!pageId) return;
    dirtyRef.current = false;

    // Nothing ever changed (e.g. save triggered with no onChange captured yet).
    if (elementsRef.current === null) {
      setSaveStatus({ kind: 'saved' });
      return;
    }

    // Serialize inside the lazy editor chunk (serializeScene dynamic-imports
    // the package), preserving the code-split.
    let scene: string;
    try {
      scene = await serializeScene(elementsRef.current, appStateRef.current ?? {}, filesRef.current ?? {});
    } catch {
      setSaveStatus({ kind: 'error', message: 'Could not serialize the canvas. Try again.' });
      return;
    }

    // v2.1A contract bans dataURLs in scenes (D1 cap + no binary-in-text).
    if (containsDataUrl(scene)) {
      setSaveStatus({ kind: 'data-url' });
      return;
    }
    if (scene.length > SOFT_MAX_BYTES) {
      setSaveStatus({ kind: 'too-large' });
      return;
    }

    setSaveStatus({ kind: 'saving' });
    const expectedRevision = revisionRef.current;
    try {
      const newRevision = await saveScene(apiClient, pageId, scene, expectedRevision);
      revisionRef.current = newRevision;
      // A change may have landed during the request — re-save shortly.
      if (dirtyRef.current) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void flushRef.current?.();
        }, AUTOSAVE_DEBOUNCE_MS);
        return;
      }
      setSaveStatus({ kind: 'saved' });
    } catch (err) {
      if (err instanceof PageConflictError) {
        revisionRef.current = err.currentRevision;
        setSaveStatus({ kind: 'conflict', currentRevision: err.currentRevision });
        return;
      }
      if (err instanceof PageTooLargeError) {
        setSaveStatus({ kind: 'too-large' });
        return;
      }
      setSaveStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Save failed. Check your connection.',
      });
    }
  }, [apiClient, pageId]);

  const scheduleFlush = useCallback(() => {
    dirtyRef.current = true;
    setSaveStatus(prev => (prev.kind === 'saving' || prev.kind === 'conflict' ? prev : { kind: 'dirty' }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void flushRef.current?.();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, []);

  // Keep the ref pointed at the latest callback.
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Excalidraw fires onChange on mount; ignore the first to avoid an
  // immediate save of the just-hydrated scene.
  const firstChangeRef = useRef(true);
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      elementsRef.current = elements;
      appStateRef.current = appState;
      filesRef.current = files;
      if (firstChangeRef.current) {
        firstChangeRef.current = false;
        return;
      }
      scheduleFlush();
    },
    [scheduleFlush],
  );

  // Reload the server version when the user accepts the conflict — remounts
  // the workspace via the wrapper's key, which resets all state cleanly.
  const reloadServerVersion = useCallback(() => {
    onReload();
  }, [onReload]);

  // Overwrite: push our scene again using the server's newer revision (already
  // stored in revisionRef by the conflict catch) to win the conflict.
  const overwrite = useCallback(() => {
    dirtyRef.current = true;
    setSaveStatus({ kind: 'saving' });
    void flush();
  }, [flush]);

  useEffect(() => {
    if (missingId) return;
    let cancelled = false;
    (async () => {
      try {
        const loaded = await getPage(apiClient, pageId);
        if (cancelled) return;
        setPage(loaded);
        revisionRef.current = loaded.revision;
        const data = await hydrateScene(loaded.scene);
        if (cancelled) return;
        setHydratedScene(data);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof PageNotFoundError
            ? { kind: 'not-found' }
            : { kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong. Please try again.' },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiClient, pageId, missingId]);

  // Flush any pending save on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const retry = () => {
    onReload();
  };

  const loading = !missingId && page === null && loadError === null;
  const hydrating = page !== null && hydratedScene === undefined && loadError === null;
  const showCanvas = page !== null && hydratedScene !== undefined;
  const title = page ? page.title : pageId ?? 'Untitled Page';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b-2 border-border-primary bg-surface px-4 py-3">
        <Link
          to="/notes"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-border-primary bg-surface px-2.5 py-1.5 font-mono text-xs font-bold shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <h1 className="m-0 min-w-0 flex-1 truncate font-black text-lg">{title}</h1>
        <SaveStatusBadge status={saveStatus} />
      </header>

      <div className="min-h-0 flex-1">
        {loading && <WorkspaceSpinner label="Opening page…" />}
        {hydrating && <WorkspaceSpinner label="Loading canvas…" />}

        {loadError?.kind === 'error' && (
          <div className="flex h-full w-full items-center justify-center bg-bg-primary">
            <div className="neo-card flex max-w-md flex-col items-center gap-4 p-6 text-center">
              <p className="m-0 font-black text-lg">Couldn&apos;t open this page</p>
              <p className="m-0 font-mono text-xs font-bold text-gray-600 dark:text-gray-400">
                {loadError.message}
              </p>
              <button
                type="button"
                onClick={retry}
                className="flex items-center gap-1.5 rounded-lg border-2 border-border-primary bg-surface px-3 py-1.5 font-mono text-xs font-bold shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </div>
        )}

        {(missingId || loadError?.kind === 'not-found') && (
          <div className="flex h-full w-full items-center justify-center bg-bg-primary">
            <div className="neo-card flex max-w-md flex-col items-center gap-4 p-6 text-center">
              <p className="m-0 font-black text-lg">Page not found</p>
              <p className="m-0 font-mono text-xs font-bold text-gray-600 dark:text-gray-400">
                This page doesn&apos;t exist or you don&apos;t have access to it. It may have
                been archived, moved, or never created.
              </p>
              <Link
                to="/notes"
                className="flex items-center gap-1.5 rounded-lg border-2 border-border-primary bg-surface px-3 py-1.5 font-mono text-xs font-bold shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Notebooks
              </Link>
            </div>
          </div>
        )}

        {saveStatus.kind === 'conflict' && (
          <ConflictBanner onReload={reloadServerVersion} onOverwrite={overwrite} />
        )}
        {saveStatus.kind === 'too-large' && <TooLargeBanner />}
        {saveStatus.kind === 'data-url' && <DataUrlBanner />}

        {showCanvas && <EditorCanvas initialData={hydratedScene} onChange={handleChange} />}
      </div>
    </div>
  );
};

const SaveStatusBadge: React.FC<{ status: SaveStatus }> = ({ status }) => {
  switch (status.kind) {
    case 'saving':
      return (
        <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-gray-500">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…
        </span>
      );
    case 'saved':
      return (
        <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-green-600 dark:text-green-400">
          <Cloud className="h-3.5 w-3.5" /> Saved
        </span>
      );
    case 'dirty':
      return (
        <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
          <Cloud className="h-3.5 w-3.5" /> Unsaved
        </span>
      );
    case 'error':
      return (
        <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-red-600 dark:text-red-400">
          <CloudOff className="h-3.5 w-3.5" /> Save failed
        </span>
      );
    default:
      return null;
  }
};

const ConflictBanner: React.FC<{ onReload: () => void; onOverwrite: () => void }> = ({ onReload, onOverwrite }) => (
  <div className="flex items-center justify-between gap-3 border-b-2 border-amber-400 bg-amber-50 px-4 py-2 dark:bg-amber-950/40">
    <p className="m-0 flex items-center gap-2 font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4" /> This page was edited somewhere else. Keep your version or load the latest?
    </p>
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={onReload}
        className="rounded-lg border-2 border-border-primary bg-surface px-3 py-1 font-mono text-xs font-bold shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px]"
      >
        Load latest
      </button>
      <button
        type="button"
        onClick={onOverwrite}
        className="rounded-lg border-2 border-border-primary bg-accent-pink px-3 py-1 font-mono text-xs font-bold text-white shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px]"
      >
        Keep my version
      </button>
    </div>
  </div>
);

const TooLargeBanner: React.FC = () => (
  <div className="flex items-center gap-2 border-b-2 border-red-400 bg-red-50 px-4 py-2 dark:bg-red-950/40">
    <p className="m-0 font-mono text-xs font-bold text-red-700 dark:text-red-300">
      <AlertTriangle className="mr-1 inline h-4 w-4" /> This canvas is too large to save (over the 2 MiB limit). Try removing some elements.
    </p>
  </div>
);

const DataUrlBanner: React.FC = () => (
  <div className="flex items-center gap-2 border-b-2 border-red-400 bg-red-50 px-4 py-2 dark:bg-red-950/40">
    <p className="m-0 font-mono text-xs font-bold text-red-700 dark:text-red-300">
      <AlertTriangle className="mr-1 inline h-4 w-4" /> Images aren&apos;t supported in notes yet — remove any pasted/dropped pictures to save.
    </p>
  </div>
);
