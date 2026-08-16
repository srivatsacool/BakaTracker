import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  NotebookPen,
  Plus,
  Trash2,
  FileText,
  Copy,
  Archive,
  RotateCcw,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  PenTool,
} from 'lucide-react';
import { useApiClient } from '../api/authFetch';
import {
  listNotebooks,
  createNotebook,
  deleteNotebook,
  listPages,
  createPage,
  renamePage,
  archivePage,
  restorePage,
  duplicatePage,
} from '../services/pages/pages';
import type { Notebook, Page } from '../types/page';

/** Compact ISO → "12 Aug, 14:32" for page rows. */
function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export const Notes: React.FC = () => {
  const apiClient = useApiClient();

  const [notebooks, setNotebooks] = useState<Notebook[] | null>(null);
  const [pagesByNb, setPagesByNb] = useState<Record<string, Page[]>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null); // notebook/page being mutated

  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [newNbName, setNewNbName] = useState('');

  const [openNb, setOpenNb] = useState<Record<string, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [renamingPage, setRenamingPage] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameInput, setRenameInput] = useState<HTMLInputElement | null>(null);

  const loadNotebooks = useCallback(async () => {
    try {
      setNotebooks(await listNotebooks(apiClient));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load notebooks.');
    }
  }, [apiClient]);

  const loadPages = useCallback(
    async (nbId: string) => {
      try {
        const pages = await listPages(apiClient, nbId);
        setPagesByNb(prev => ({ ...prev, [nbId]: pages }));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not load pages.');
      }
    },
    [apiClient],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const nbs = await listNotebooks(apiClient);
        if (cancelled) return;
        setNotebooks(nbs);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Could not load notebooks.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  const runBusy = async (id: string, fn: () => Promise<void>) => {
    setBusy(true);
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  };

  // --- Notebook actions ------------------------------------------------------

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newNbName.trim();
    if (!name || busy) return;
    await runBusy('nb:new', async () => {
      const nb = await createNotebook(apiClient, name);
      await loadNotebooks();
      setOpenNb(prev => ({ ...prev, [nb.id]: true }));
      setNewNbName('');
      setCreatingNotebook(false);
    }).catch(() => undefined);
  };

  const handleDeleteNotebook = async (nb: Notebook) => {
    if (busy) return;
    const ok = window.confirm(`Delete "${nb.name}"? Its pages move to your default notebook.`);
    if (!ok) return;
    await runBusy(`nb:${nb.id}`, async () => {
      await deleteNotebook(apiClient, nb.id);
      await loadNotebooks();
    }).catch(() => undefined);
  };

  // --- Page actions ----------------------------------------------------------

  const handleCreatePage = async (nb: Notebook) => {
    if (busy) return;
    const ok = window.confirm('Create a new drawing page in this notebook?');
    if (!ok) return;
    await runBusy(`pg:new:${nb.id}`, async () => {
      const page = await createPage(apiClient, { notebookId: nb.id, title: 'Untitled' });
      setPagesByNb(prev => ({ ...prev, [nb.id]: [page, ...(prev[nb.id] ?? [])] }));
      setOpenNb(prev => ({ ...prev, [nb.id]: true }));
    }).catch(() => undefined);
  };

  const startRename = (page: Page) => {
    setRenamingPage(page.id);
    setRenameValue(page.title);
    setTimeout(() => renameInput?.focus(), 0);
  };

  const commitRename = async (page: Page) => {
    const title = renameValue.trim();
    setRenamingPage(null);
    if (!title || title === page.title) return;
    await runBusy(`pg:rename:${page.id}`, async () => {
      const updated = await renamePage(apiClient, page.id, title);
      setPagesByNb(prev => ({
        ...prev,
        [page.notebook_id ?? '']: (prev[page.notebook_id ?? ''] ?? []).map(p => (p.id === page.id ? updated : p)),
      }));
    }).catch(() => undefined);
  };

  const handleArchivePage = async (page: Page) => {
    if (busy) return;
    await runBusy(`pg:archive:${page.id}`, async () => {
      await archivePage(apiClient, page.id);
      // Keep the page in state with archived_at set (NOT removed) so the
      // "Show archived" toggle can render it again — the render layer
      // filters by archived_at.
      const nbId = page.notebook_id ?? '';
      setPagesByNb(prev => ({
        ...prev,
        [nbId]: (prev[nbId] ?? []).map(p => (p.id === page.id ? { ...p, archived_at: new Date().toISOString() } : p)),
      }));
    }).catch(() => undefined);
  };

  const handleRestorePage = async (page: Page) => {
    if (busy) return;
    await runBusy(`pg:restore:${page.id}`, async () => {
      await restorePage(apiClient, page.id);
      await loadPages(page.notebook_id ?? '');
    }).catch(() => undefined);
  };

  const handleDuplicatePage = async (page: Page) => {
    if (busy) return;
    await runBusy(`pg:dup:${page.id}`, async () => {
      const copy = await duplicatePage(apiClient, page.id);
      const nbId = page.notebook_id ?? '';
      setPagesByNb(prev => ({ ...prev, [nbId]: [copy, ...(prev[nbId] ?? [])] }));
    }).catch(() => undefined);
  };

  // --- Render ----------------------------------------------------------------

  const pageRow = (page: Page) => {
    const archived = page.archived_at !== null;
    const isRenaming = renamingPage === page.id;
    const isBusy = busyId === `pg:rename:${page.id}` || busyId === `pg:archive:${page.id}`
      || busyId === `pg:dup:${page.id}` || busyId === `pg:restore:${page.id}`;

    if (archived && !showArchived) return null;

    return (
      <li
        key={page.id}
        className={`group flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 transition ${
          archived
            ? 'border-border-primary bg-bg-primary/50 opacity-60'
            : 'border-border-primary bg-surface shadow-gumroad-sm'
        }`}
      >
        {isRenaming ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1.5"
            onSubmit={e => {
              e.preventDefault();
              void commitRename(page);
            }}
          >
            <input
              ref={setRenameInput}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => void commitRename(page)}
              className="w-full min-w-0 flex-1 rounded-md border-2 border-border-primary bg-bg-primary px-2 py-1 font-mono text-xs font-bold focus:outline-none focus:border-accent-pink"
              maxLength={300}
              autoFocus
            />
            <button type="submit" aria-label="Save name" className="p-1 text-green-600">
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Cancel rename"
              onClick={() => setRenamingPage(null)}
              className="p-1 text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <>
            {page.kind === 'excalidraw' ? (
              <PenTool className="h-4 w-4 shrink-0 text-accent-pink" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-gray-400" />
            )}
            <Link
              to={`/notes/${page.id}`}
              className="min-w-0 flex-1 truncate font-mono text-xs font-bold hover:text-accent-pink"
            >
              {page.title || 'Untitled'}
            </Link>
            <span className="hidden shrink-0 font-mono text-[10px] font-bold text-gray-400 sm:inline">
              {formatDate(page.updated_at)}
            </span>
            {isBusy ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-pink" />
            ) : (
              <span className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:group-focus-visible:opacity-100">
                <button
                  type="button"
                  aria-label="Rename page"
                  onClick={() => startRename(page)}
                  className="rounded p-1.5 hover:bg-bg-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Duplicate page"
                  onClick={() => void handleDuplicatePage(page)}
                  className="rounded p-1.5 hover:bg-bg-primary"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {archived ? (
                  <button
                    type="button"
                    aria-label="Restore page"
                    onClick={() => void handleRestorePage(page)}
                    className="rounded p-1.5 hover:bg-bg-primary"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Archive page"
                    onClick={() => void handleArchivePage(page)}
                    className="rounded p-1.5 hover:bg-bg-primary"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            )}
          </>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <NotebookPen className="h-7 w-7 text-accent-pink" />
          <h1 className="m-0 text-2xl font-black">Notebooks</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowArchived(s => !s)}
            className={`flex items-center gap-1.5 rounded-lg border-2 border-border-primary px-3 py-1.5 font-mono text-xs font-bold shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px] ${
              showArchived ? 'bg-accent-pink text-white' : 'bg-surface'
            }`}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
          <button
            type="button"
            onClick={() => setCreatingNotebook(true)}
            className="flex items-center gap-1.5 rounded-lg border-2 border-border-primary bg-accent-pink px-3 py-1.5 font-mono text-xs font-bold text-white shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            <Plus className="h-3.5 w-3.5" />
            New notebook
          </button>
        </div>
      </div>

      {loadError && (
        <div className="neo-card mb-6 p-4">
          <p className="m-0 font-mono text-xs font-bold text-red-600">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadNotebooks()}
            className="mt-2 rounded-lg border-2 border-border-primary bg-surface px-3 py-1 font-mono text-xs font-bold shadow-gumroad-sm"
          >
            Retry
          </button>
        </div>
      )}

      {creatingNotebook && (
        <form
          onSubmit={e => void handleCreateNotebook(e)}
          className="neo-card mb-6 flex items-center gap-2 p-4"
        >
          <input
            value={newNbName}
            onChange={e => setNewNbName(e.target.value)}
            placeholder="Notebook name…"
            autoFocus
            className="min-w-0 flex-1 rounded-lg border-2 border-border-primary bg-bg-primary px-3 py-1.5 font-mono text-xs font-bold focus:outline-none focus:border-accent-pink"
            maxLength={60}
          />
          <button
            type="submit"
            disabled={busy || !newNbName.trim()}
            className="rounded-lg border-2 border-border-primary bg-accent-pink px-3 py-1.5 font-mono text-xs font-bold text-white shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50"
          >
            {busy && busyId === 'nb:new' ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => setCreatingNotebook(false)}
            className="rounded-lg border-2 border-border-primary bg-surface px-3 py-1.5 font-mono text-xs font-bold shadow-gumroad-sm"
          >
            Cancel
          </button>
        </form>
      )}

      {notebooks === null ? (
        <div className="neo-card p-8 text-center">
          <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-accent-pink" />
          <p className="m-0 font-mono text-xs font-bold text-gray-500">Loading notebooks…</p>
        </div>
      ) : notebooks.length === 0 ? (
        <div className="neo-card p-10 text-center">
          <NotebookPen className="mx-auto mb-3 h-8 w-8 text-accent-pink" />
          <p className="m-0 text-lg font-black">No notebooks yet</p>
          <p className="mx-auto mt-1 max-w-sm font-mono text-xs font-bold text-gray-500">
            Create a notebook to start sketching — drawings autosave to your BakaTracker.
          </p>
          <button
            type="button"
            onClick={() => setCreatingNotebook(true)}
            className="mt-4 flex items-center gap-1.5 rounded-lg border-2 border-border-primary bg-accent-pink px-3 py-1.5 font-mono text-xs font-bold text-white shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            <Plus className="h-3.5 w-3.5" />
            New notebook
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {notebooks.map(nb => {
            const pages = pagesByNb[nb.id];
            const open = openNb[nb.id] ?? true;
            const visible = (pages ?? []).filter(p => showArchived || p.archived_at === null);
            const archivedCount = (pages ?? []).filter(p => p.archived_at !== null).length;

            return (
              <section key={nb.id} className="neo-card overflow-hidden">
                <div className="flex items-center gap-2 border-b-2 border-border-primary bg-surface px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setOpenNb(prev => ({ ...prev, [nb.id]: !prev[nb.id] }))}
                    aria-label={open ? 'Collapse notebook' : 'Expand notebook'}
                    className="p-1"
                  >
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <h2 className="m-0 min-w-0 flex-1 truncate text-base font-black">{nb.name}</h2>
                  {pages !== undefined && (
                    <span className="shrink-0 font-mono text-[10px] font-bold text-gray-400">
                      {visible.length} page{visible.length === 1 ? '' : 's'}
                      {archivedCount > 0 && ` · ${archivedCount} archived`}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCreatePage(nb)}
                    disabled={busy}
                    className="flex shrink-0 items-center gap-1 rounded-lg border-2 border-border-primary bg-surface px-2 py-1 font-mono text-[10px] font-bold shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    Page
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteNotebook(nb)}
                    disabled={busy}
                    aria-label={`Delete ${nb.name}`}
                    className="shrink-0 rounded-lg border-2 border-border-primary bg-surface p-1.5 text-gray-500 shadow-gumroad-sm transition hover:translate-x-[1px] hover:translate-y-[1px] hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {open && (
                  <div className="bg-bg-primary px-3 py-3">
                    {pages === undefined ? (
                      <PageListLoader onReady={() => void loadPages(nb.id)} />
                    ) : visible.length === 0 ? (
                      <p className="m-0 py-2 text-center font-mono text-xs font-bold text-gray-400">
                        {showArchived ? 'Nothing here.' : 'No pages yet — add one above.'}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">{visible.map(pageRow)}</ul>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Lazily fetches pages once when the section is expanded (no eager N+1). */
const PageListLoader: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    onReady();
  }, [onReady]);
  return (
    <p className="m-0 py-2 text-center font-mono text-xs font-bold text-gray-400">
      <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> Loading pages…
    </p>
  );
};
