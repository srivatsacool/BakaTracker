import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useApiClient } from '../api/authFetch';
import { getPage, PageNotFoundError } from '../services/pages/pages';
import { hydrateScene } from '../services/pages/hydrateScene';
import { EditorCanvas } from '../components/pages/EditorCanvas';
import type { Page } from '../types/page';
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';

type LoadError = { kind: 'not-found' } | { kind: 'error'; message: string };

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

  // Remount on id change so every page starts from a clean loading state.
  return <PageWorkspaceInner key={pageId ?? 'no-id'} pageId={pageId} />;
};

const PageWorkspaceInner: React.FC<{ pageId: string | undefined }> = ({ pageId }) => {
  const apiClient = useApiClient();
  const [requestKey, setRequestKey] = useState(0);
  const [page, setPage] = useState<Page | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  // undefined = not hydrated yet, null = hydrated EMPTY scene, object = hydrated scene
  const [hydratedScene, setHydratedScene] = useState<ExcalidrawInitialDataState | null | undefined>(
    undefined,
  );

  const missingId = pageId === undefined;

  useEffect(() => {
    if (missingId) {
      return; // render path shows the not-found card
    }
    let cancelled = false;
    (async () => {
      try {
        const loaded = await getPage(apiClient, pageId);
        if (cancelled) {
          return;
        }
        setPage(loaded);
        // restore() + scrollToContent run in the dynamically-imported editor
        // chunk (hydrateScene) so the Excalidraw bundle stays code-split.
        const data = await hydrateScene(loaded.scene);
        if (cancelled) {
          return;
        }
        setHydratedScene(data);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof PageNotFoundError
            ? { kind: 'not-found' }
            : {
                kind: 'error',
                message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
              },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiClient, pageId, missingId, requestKey]);

  const retry = () => {
    setPage(null);
    setLoadError(null);
    setHydratedScene(undefined);
    setRequestKey(k => k + 1);
  };

  const loading = !missingId && page === null && loadError === null;
  const hydrating = page !== null && hydratedScene === undefined && loadError === null;
  const showCanvas = page !== null && hydratedScene !== undefined;
  const title = page ? page.title : pageId ?? 'Untitled Page';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sticky workspace header with back navigation */}
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b-2 border-border-primary bg-surface px-4 py-3">
        <Link
          to="/notes"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-border-primary bg-surface px-2.5 py-1.5 font-mono text-xs font-bold shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <h1 className="m-0 min-w-0 truncate font-black text-lg">{title}</h1>
      </header>

      {/* Editor fills the remaining viewport height */}
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

        {showCanvas && <EditorCanvas initialData={hydratedScene} />}
      </div>
    </div>
  );
};
