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
  Sparkles,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  PenTool,
} from 'lucide-react';
import { useApiClient } from '../api/authFetch';
import { useStore } from '../store/useStore';
import { useAuth } from '../features/auth';
import { authConfig } from '../features/auth/config';
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
  reorderPages,
} from '../services/pages/pages';
import { GlassPane } from '../components/ui';
import type { Notebook, Page } from '../types/page';

/** Compact ISO → "12 Aug, 14:32" for page rows. */
function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Notes — the sketch booth. Notebooks of Excalidraw pages, with the full
 * page lifecycle: create, rename, duplicate, archive, restore.
 */
export const Notes: React.FC = () => {
  const apiClient = useApiClient();
  const { user, login } = useAuth();
  // Guests have no backend account — Notes lives on your own instance. The
  // demo shows a designed attract state instead of firing REST (which would
  // 401 with an empty token): see the isGuest render branch below.
  const isGuest = user?.provider === 'guest';
  const canConvert = Boolean(authConfig.domain && authConfig.clientId);

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
    if (isGuest) return;
    try {
      setNotebooks(await listNotebooks(apiClient));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load notebooks.');
    }
  }, [apiClient, isGuest]);

  const loadPages = useCallback(
    async (nbId: string) => {
      if (isGuest) return;
      try {
        const pages = await listPages(apiClient, nbId);
        setPagesByNb(prev => ({ ...prev, [nbId]: pages }));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Could not load pages.');
      }
    },
    [apiClient, isGuest],
  );

  useEffect(() => {
    if (isGuest) return;
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
  }, [apiClient, isGuest]);

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

  /** Turn a page's content into quests: extract candidate lines from the title
   *  and any Excalidraw text elements, then create a task per candidate. */
  const handlePageToQuests = async (page: Page) => {
    if (busy) return;
    const candidates: string[] = [];
    const push = (raw: string) => {
      const t = raw.trim().replace(/^[-•*]\s*/, '');
      if (t && t.length >= 3 && t.length <= 180) candidates.push(t);
    };
    // Title lines
    (page.title || '').split(/\n/).forEach(push);
    // Excalidraw scene text elements
    if (page.kind === 'excalidraw' && page.scene) {
      try {
        const scene = JSON.parse(page.scene) as { elements?: { type?: string; text?: string }[] };
        (scene.elements ?? [])
          .filter(el => el.type === 'text' && el.text)
          .forEach(el => push(String(el.text)));
      } catch { /* non-JSON scene — ignore */ }
    }
    // Dedupe, cap
    const quests = [...new Set(candidates)].slice(0, 12);
    if (quests.length === 0) {
      window.alert('This page has no extractable content to turn into quests.');
      return;
    }
    const ok = window.confirm(`Turn this page into ${quests.length} quest${quests.length === 1 ? '' : 's'}?\n\n${quests.map((q, i) => `${i + 1}. ${q}`).join('\n')}`);
    if (!ok) return;
    const { addTask } = useStore.getState();
    for (const title of quests) {
      await addTask(title, `From page: ${page.title || 'Untitled'}`, 'personal', 10, false);
    }
  };

  /** Move a page up/down within its notebook, persisting the new order. */
  const handleReorderPage = async (page: Page, dir: -1 | 1) => {
    if (busy) return;
    const nbId = page.notebook_id ?? '';
    const list = pagesByNb[nbId] ?? [];
    const active = list.filter(p => p.archived_at === null);
    const from = active.findIndex(p => p.id === page.id);
    if (from < 0) return;
    const to = from + dir;
    if (to < 0 || to >= active.length) return;
    // New full order: swap the moved page with its neighbour within active pages.
    const reorderedActive = [...active];
    const [moved] = reorderedActive.splice(from, 1);
    reorderedActive.splice(to, 0, moved);
    await runBusy(`pg:reorder:${page.id}`, async () => {
      await reorderPages(apiClient, nbId === '' ? null : nbId, reorderedActive.map(p => p.id));
      // Rebuild the notebook's page list: reordered active pages first (server
      // order), archived pages preserved at the tail. Existing fields kept.
      const archivedList = list.filter(p => p.archived_at !== null);
      setPagesByNb(prev => {
        const merged = (id: string) => (prev[nbId] ?? []).find(p => p.id === id) ?? { id };
        return {
          ...prev,
          [nbId]: [
            ...reorderedActive.map(p => ({ ...p, ...merged(p.id) })),
            ...archivedList,
          ],
        };
      });
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
        className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 transition border ${
          archived ? 'opacity-60' : ''
        }`}
        style={{ borderColor: archived ? 'rgba(242,242,242,0.06)' : 'rgba(242,242,242,0.1)', background: archived ? 'rgba(242,242,242,0.02)' : 'rgba(242,242,242,0.04)' }}
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
              className="w-full min-w-0 flex-1 rounded-md px-2 py-1 font-mono text-xs font-bold arcade-input !py-1.5"
              maxLength={300}
              autoFocus
            />
            <button type="submit" aria-label="Save name" className="p-1 cursor-pointer" style={{ color: 'var(--arcade-green)' }}>
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Cancel rename"
              onClick={() => setRenamingPage(null)}
              className="p-1 cursor-pointer"
              style={{ color: 'var(--arcade-paper-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <>
            {page.kind === 'excalidraw' ? (
              <PenTool className="w-4 h-4 shrink-0" style={{ color: 'var(--arcade-magenta)' }} aria-hidden="true" />
            ) : (
              <FileText className="w-4 h-4 shrink-0" style={{ color: 'var(--arcade-paper-muted)' }} aria-hidden="true" />
            )}
            <Link
              to={`/notes/${page.id}`}
              className="min-w-0 flex-1 truncate font-mono text-xs font-bold no-underline hover:text-arcade-magenta"
              style={{ color: 'var(--arcade-paper)' }}
            >
              {page.title || 'Untitled'}
            </Link>
            <span className="hidden shrink-0 font-mono text-[10px] font-bold sm:inline" style={{ color: 'var(--arcade-paper-muted)' }}>
              {formatDate(page.updated_at)}
            </span>
            {isBusy ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: 'var(--arcade-magenta)' }} aria-hidden="true" />
            ) : (
              <span className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:group-focus-visible:opacity-100" style={{ opacity: 0 }}>
                <button
                  type="button"
                  aria-label="Move page up"
                  onClick={() => void handleReorderPage(page, -1)}
                  className="icon-button icon-button-small"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move page down"
                  onClick={() => void handleReorderPage(page, 1)}
                  className="icon-button icon-button-small"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Turn this page into quests"
                  title="Turn this page into quests"
                  onClick={() => void handlePageToQuests(page)}
                  className="icon-button icon-button-small"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Rename page"
                  onClick={() => startRename(page)}
                  className="icon-button icon-button-small"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Duplicate page"
                  onClick={() => void handleDuplicatePage(page)}
                  className="icon-button icon-button-small"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {archived ? (
                  <button
                    type="button"
                    aria-label="Restore page"
                    onClick={() => void handleRestorePage(page)}
                    className="icon-button icon-button-small"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Archive page"
                    onClick={() => void handleArchivePage(page)}
                    className="icon-button icon-button-small"
                  >
                    <Archive className="w-3.5 h-3.5" />
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
          <NotebookPen className="w-6 h-6" style={{ color: 'var(--arcade-magenta)' }} aria-hidden="true" />
          <h1 className="marquee-title m-0 text-2xl" style={{ color: 'var(--arcade-paper)' }}>Notebooks</h1>
        </div>
        {!isGuest && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowArchived(s => !s)}
              className={`btn-ghost !text-xs ${showArchived ? '!text-arcade-gold' : ''}`}
            >
              <Archive className="w-3.5 h-3.5" aria-hidden="true" />
              {showArchived ? 'Hide archived' : 'Show archived'}
            </button>
            <button
              type="button"
              onClick={() => setCreatingNotebook(true)}
              className="insert-coin !py-2 !px-3 !text-xs"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              New notebook
            </button>
          </div>
        )}
      </div>

      {isGuest ? (
        /* Guest attract state (UX gap #2): guests have no backend account, so
           Notebooks/Pages REST would 401. Instead of a raw error cabinet, the
           demo hands over to a designed conversion surface — same language as
           the guest UserMenu ("Create your own BakaTracker"). */
        <div className="notes-guest-attract">
          <div className="attract-state p-10">
            <NotebookPen className="mx-auto mb-3 w-8 h-8" style={{ color: 'var(--arcade-magenta)' }} aria-hidden="true" />
            <div className="attract-dots" aria-hidden="true"><span /><span /><span /></div>
            <h3>Notes live on your own instance</h3>
            <p>
              Sketches autosave to your BakaTracker — and this demo&apos;s canvas stays right here
              on this device. Create your own instance to keep every drawing in your own cabinet.
            </p>
            {canConvert ? (
              <button
                type="button"
                onClick={() => void login()}
                className="insert-coin mt-3 !text-xs"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Create your own BakaTracker
              </button>
            ) : (
              <p>
                Sign-in is unavailable right now — drawings stay on this device.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {loadError && (
            <GlassPane state="ooo" tone="coral" className="mb-6" screenClassName="!p-4">
              <p className="m-0 font-mono text-xs font-bold" style={{ color: 'var(--arcade-red)' }}>{loadError}</p>
              <button
                type="button"
                onClick={() => void loadNotebooks()}
                className="btn-ghost !text-xs mt-2"
              >
                Retry
              </button>
            </GlassPane>
          )}

      {creatingNotebook && (
        <GlassPane
          as="form"
          onSubmit={e => void handleCreateNotebook(e)}
          state="playing"
          tone="rose"
          className="mb-6 animate-fade-in"
          screenClassName="flex items-center gap-2"
        >
          <input
            value={newNbName}
            onChange={e => setNewNbName(e.target.value)}
            placeholder="Notebook name…"
            autoFocus
            className="min-w-0 flex-1 arcade-input !py-2 !text-xs"
            maxLength={60}
          />
          <button
            type="submit"
            disabled={busy || !newNbName.trim()}
            className="insert-coin !py-2 !px-3 !text-xs disabled:opacity-50"
          >
            {busy && busyId === 'nb:new' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => setCreatingNotebook(false)}
            className="btn-ghost !text-xs"
          >
            Cancel
          </button>
        </GlassPane>
      )}

      {notebooks === null ? (
        <GlassPane state="attract" screenClassName="!p-8 text-center">
          <Loader2 className="mx-auto mb-2 w-6 h-6 animate-spin" style={{ color: 'var(--arcade-magenta)' }} aria-hidden="true" />
          <p className="m-0 font-mono text-xs font-bold" style={{ color: 'var(--arcade-paper-muted)' }}>Loading notebooks…</p>
        </GlassPane>
      ) : notebooks.length === 0 ? (
        <div className="attract-state p-10">
          <NotebookPen className="mx-auto mb-3 w-8 h-8" style={{ color: 'var(--arcade-magenta)' }} aria-hidden="true" />
          <div className="attract-dots" aria-hidden="true"><span /><span /><span /></div>
          <h3>No notebooks yet</h3>
          <p className="mx-auto max-w-sm">
            Create a notebook to start sketching — drawings autosave to your BakaTracker.
          </p>
          <button
            type="button"
            onClick={() => setCreatingNotebook(true)}
            className="insert-coin mt-3 !text-xs"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
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
              <GlassPane key={nb.id} state="off" tone="rose" className="overflow-hidden" screenClassName="!p-0">
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--obs-glass-8)', background: 'rgba(242,242,242,0.03)' }}>
                  <button
                    type="button"
                    onClick={() => setOpenNb(prev => ({ ...prev, [nb.id]: !prev[nb.id] }))}
                    aria-label={open ? 'Collapse notebook' : 'Expand notebook'}
                    className="icon-button icon-button-small"
                  >
                    {open ? <ChevronDown className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                  </button>
                  <h2 className="m-0 min-w-0 flex-1 truncate marquee-title text-base" style={{ color: 'var(--arcade-paper)' }}>{nb.name}</h2>
                  {pages !== undefined && (
                    <span className="shrink-0 font-mono text-[10px] font-bold" style={{ color: 'var(--arcade-paper-muted)' }}>
                      {visible.length} page{visible.length === 1 ? '' : 's'}
                      {archivedCount > 0 && ` · ${archivedCount} archived`}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCreatePage(nb)}
                    disabled={busy}
                    className="btn-ghost !py-1 !px-2 !text-[10px] disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" aria-hidden="true" />
                    Page
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteNotebook(nb)}
                    disabled={busy}
                    aria-label={`Delete ${nb.name}`}
                    className="icon-button icon-button-small hover:!text-danger"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {open && (
                  <div className="px-3 py-3">
                    {pages === undefined ? (
                      <PageListLoader onReady={() => void loadPages(nb.id)} />
                    ) : visible.length === 0 ? (
                      <p className="m-0 py-2 text-center font-mono text-xs font-bold" style={{ color: 'var(--arcade-paper-muted)' }}>
                        {showArchived ? 'Nothing here.' : 'No pages yet — add one above.'}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2 m-0 p-0 list-none">{visible.map(pageRow)}</ul>
                    )}
                  </div>
                )}
              </GlassPane>
            );
          })}
        </div>
      )}
        </>
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
    <p className="m-0 py-2 text-center font-mono text-xs font-bold" style={{ color: 'var(--arcade-paper-muted)' }}>
      <Loader2 className="mr-1 inline w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Loading pages…
    </p>
  );
};
