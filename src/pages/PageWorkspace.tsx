import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Cloud, CloudOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { useApiClient } from '../api/authFetch';
import { useAuth } from '../features/auth';
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
import { GlassPane } from '../components/ui';
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
  <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--arcade-void-deep)' }}>
    <GlassPane as="div" state="attract" tone="rose" screenClassName="flex flex-col items-center gap-3 !p-6">
      <div className="w-8 h-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--arcade-magenta)', borderTopColor: 'transparent' }} />
      <p className="font-mono text-xs font-bold m-0" style={{ color: 'var(--arcade-paper-dim)' }}>{label}</p>
    </GlassPane>
  </div>
);

/**
 * PageWorkspace — the Excalidraw trick cabinet. Full-viewport canvas with
 * debounced autosave, optimistic-concurrency revision handling, and the
 * designed conflict / too-large / data-URL states.
 */
export const PageWorkspace: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  // Remount on id OR reload so every open starts from a clean, fully-reset
  // state — no stale refs, revision, or save status.
  const reload = useCallback(() => setReloadKey(k => k + 1), []);
  // Guests have no pages: the backend would 401 every REST call. Hand them
  // back to the Notes library, which shows the designed "Notes live on your
  // own instance" attract state instead of a raw error cabinet.
  if (user?.provider === 'guest') {
    return <Navigate to="/notes" replace />;
  }
  return <PageWorkspaceInner key={`${pageId ?? 'no-id'}:${reloadKey}`} pageId={pageId} onReload={reload} />;
};

const PageWorkspaceInner: React.FC<{ pageId: string | undefined; onReload: () => void }> = ({ pageId, onReload }) => {
  const apiClient = useApiClient();
  const navigate = useNavigate();
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
  // Serializes saves: only ONE flush in flight at a time. Without this,
  // overlapping flushes both send the same expected_revision and the loser
  // gets a 409 even though no external edit happened.
  const inFlightRef = useRef<Promise<void> | null>(null);

  const flush = useCallback(async (): Promise<void> => {
    if (!pageId) return;
    if (inFlightRef.current) {
      // A save is already running; the caller re-arms the debounce so this
      // flush runs again after the in-flight one lands (dirty flag stays set).
      return;
    }

    const run = async (): Promise<void> => {
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
    };

    const tracked = run().finally(() => {
      inFlightRef.current = null;
    });
    inFlightRef.current = tracked;
    await tracked;
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

  // Excalidraw fires onChange repeatedly on mount (hydration + appState
  // bursts like cursor/zoom) with the SAME elements as the just-hydrated
  // scene. Saving any of those would write an empty/unchanged scene and race
  // the real first save (stale-revision 409). Skip until the elements differ
  // from the hydrated snapshot — i.e. until the user actually drew something.
  const hydratedIdsRef = useRef<Set<string> | null>(null);
  const hydratedCountRef = useRef(-1);
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      elementsRef.current = elements;
      appStateRef.current = appState;
      filesRef.current = files;
      // First callback after hydration: snapshot the scene to compare against.
      if (hydratedIdsRef.current === null) {
        hydratedIdsRef.current = new Set(elements.map(e => e.id));
        hydratedCountRef.current = elements.length;
        return;
      }
      // Same element set as hydration → still the mount burst, not user edits.
      if (
        elements.length === hydratedCountRef.current &&
        elements.every(e => hydratedIdsRef.current!.has(e.id))
      ) {
        return;
      }
      // First REAL change: disarm the snapshot comparison (disarm by making
      // the count unmatchable) so later edits — even ones that return to the
      // hydrated element set, like draw-then-delete-everything — always save.
      hydratedCountRef.current = -1;
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

  // Latest save status in a ref so the global key handler (subscribed once per
  // mount) reads the CURRENT conflict state without re-subscribing on every
  // status change. Effects flush right after commit, so by the time any
  // subsequent keydown arrives this ref is already fresh.
  const saveStatusRef = useRef(saveStatus);
  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  // Flush any pending save on unmount (risk register #2 — real data-loss bug).
  // The old code COMMENT said "flush" but only CLEARED the debounce timer, so
  // edits made within AUTOSAVE_DEBOUNCE_MS of navigating away were silently
  // dropped. Real flush semantics:
  //   * No save in flight → fire flush() directly. The serialize + PUT keep
  //     running after unmount (refs outlive the fiber); its setSaveStatus
  //     calls are dropped, which is exactly right — the SAVE still lands.
  //   * Save in flight    → flush() returns early on the in-flight guard
  //     (dirtyRef stays true), and the in-flight save's success path re-arms
  //     the debounce, so the pending edit lands a beat later. That re-arm
  //     creates a FRESH timer which this cleanup has already run past — it is
  //     never cleared, and flushRef still points at this page's save.
  // expected_revision semantics are preserved: the flush sends
  // revisionRef.current at the moment it runs, exactly like a debounced save.
  // StrictMode dev double-mount is safe: at fake-unmount time nothing is
  // dirty yet (elementsRef is null until the editor hydrates), so no spurious
  // save fires. flush is stable per mount (apiClient/pageId are stable), so
  // this effect never re-runs mid-mount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (dirtyRef.current) {
        void flush();
      }
    };
  }, [flush]);

  // ⌘S manual save + ESC-to-back (UX gap #11 / a11y). Capture phase: Excalidraw
  // binds its own keys and stops propagation on some of them, so a bubble
  // listener on window would never fire for canvas-focused strokes. Capture
  // runs before every target handler.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        if (e.repeat) return;
        e.preventDefault();
        // Same serialization guard as autosave; during a conflict this
        // resolves the banner as "Keep my version" (revisionRef already holds
        // the server's currentRevision) — consistent with the overwrite path.
        void flush();
        return;
      }
      if (e.key === 'Escape') {
        // While the conflict banner is asking Load latest / Keep my version,
        // Escape must NOT bounce the user out of the decision.
        if (saveStatusRef.current.kind === 'conflict') return;
        e.preventDefault();
        navigate('/notes');
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [flush, navigate]);

  const retry = () => {
    onReload();
  };

  const loading = !missingId && page === null && loadError === null;
  const hydrating = page !== null && hydratedScene === undefined && loadError === null;
  const showCanvas = page !== null && hydratedScene !== undefined;
  const title = page ? page.title : pageId ?? 'Untitled Page';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className="sticky top-0 z-10 flex shrink-0 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3"
        style={{ background: 'rgba(13,11,22,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,92,200,0.15)' }}
      >
        <Link
          to="/notes"
          className="btn-ghost !py-1.5 !px-2.5 !text-xs no-underline"
          title="Back to notebooks (Esc)"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <h1 className="m-0 min-w-0 flex-1 truncate marquee-title text-base" style={{ color: 'var(--arcade-paper)' }}>{title}</h1>
        <SaveStatusBadge status={saveStatus} />
      </header>

      <div className="min-h-0 flex-1">
        {loading && <WorkspaceSpinner label="Opening page…" />}
        {hydrating && <WorkspaceSpinner label="Loading canvas…" />}

        {loadError?.kind === 'error' && (
          <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--arcade-void-deep)' }}>
            <GlassPane as="div" state="ooo" tone="coral" className="max-w-md" screenClassName="flex flex-col items-center gap-4 !p-6 text-center">
              <p className="m-0 marquee-title text-lg" style={{ color: 'var(--arcade-paper)' }}>Couldn&apos;t open this page</p>
              <p className="m-0 font-mono text-xs" style={{ color: 'var(--arcade-paper-muted)' }}>
                {loadError.message}
              </p>
              <button
                type="button"
                onClick={retry}
                className="btn-ghost !text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Retry
              </button>
            </GlassPane>
          </div>
        )}

        {(missingId || loadError?.kind === 'not-found') && (
          <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--arcade-void-deep)' }}>
            <GlassPane as="div" state="ooo" tone="coral" className="max-w-md" screenClassName="flex flex-col items-center gap-4 !p-6 text-center">
              <p className="m-0 marquee-title text-lg" style={{ color: 'var(--arcade-paper)' }}>Page not found</p>
              <p className="m-0 font-mono text-xs" style={{ color: 'var(--arcade-paper-muted)' }}>
                This page doesn&apos;t exist or you don&apos;t have access to it. It may have
                been archived, moved, or never created.
              </p>
              <Link
                to="/notes"
                className="btn-ghost !text-xs no-underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Back to Notebooks
              </Link>
            </GlassPane>
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
  const base = 'flex items-center gap-1.5 font-mono text-xs font-bold';
  // The save lamp doubles as the manual-save affordance hint (⌘S / Ctrl+S).
  const hint = 'Save now — ⌘S (Ctrl+S on Windows/Linux)';
  switch (status.kind) {
    case 'saving':
      return (
        <span className={`${base} chip chip--gold`} title={hint}>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Saving…
        </span>
      );
    case 'saved':
      return (
        <span className={`${base} chip chip--green`} title={hint}>
          <Cloud className="w-3.5 h-3.5" aria-hidden="true" /> Saved
        </span>
      );
    case 'dirty':
      return (
        <span className={`${base} chip chip--gold`} title={hint}>
          <Cloud className="w-3.5 h-3.5" aria-hidden="true" /> Unsaved
        </span>
      );
    case 'error':
      return (
        <span className={`${base} chip chip--red`} title={hint}>
          <CloudOff className="w-3.5 h-3.5" aria-hidden="true" /> Save failed
        </span>
      );
    default:
      return null;
  }
};

const ConflictBanner: React.FC<{ onReload: () => void; onOverwrite: () => void }> = ({ onReload, onOverwrite }) => (
  <div
    className="flex flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    style={{ background: 'rgba(139, 92, 246, 0.08)', borderBottom: '1px solid rgba(139, 92, 246, 0.35)' }}
    role="alert"
  >
    <p className="m-0 flex items-center gap-2 font-mono text-xs font-bold" style={{ color: 'var(--arcade-gold)' }}>
      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> This page was edited somewhere else. Keep your version or load the latest?
    </p>
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={onReload}
        className="btn-ghost !py-1.5 !text-xs flex-1 sm:flex-none"
      >
        Load latest
      </button>
      <button
        type="button"
        onClick={onOverwrite}
        className="insert-coin !py-1.5 !px-3 !text-xs flex-1 sm:flex-none"
      >
        Keep my version
      </button>
    </div>
  </div>
);

const TooLargeBanner: React.FC = () => (
  <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'rgba(255,59,92,0.08)', borderBottom: '1px solid rgba(255,59,92,0.35)' }} role="alert">
    <p className="m-0 font-mono text-xs font-bold" style={{ color: 'var(--arcade-red)' }}>
      <AlertTriangle className="mr-1 inline w-4 h-4" aria-hidden="true" /> This canvas is too large to save (over the 2 MiB limit). Try removing some elements.
    </p>
  </div>
);

const DataUrlBanner: React.FC = () => (
  <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'rgba(255,59,92,0.08)', borderBottom: '1px solid rgba(255,59,92,0.35)' }} role="alert">
    <p className="m-0 font-mono text-xs font-bold" style={{ color: 'var(--arcade-red)' }}>
      <AlertTriangle className="mr-1 inline w-4 h-4" aria-hidden="true" /> Images aren&apos;t supported in notes yet — remove any pasted/dropped pictures to save.
    </p>
  </div>
);
