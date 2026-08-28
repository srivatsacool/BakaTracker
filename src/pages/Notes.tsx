import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiClient } from '../api/authFetch';
import { useStore } from '../store/useStore';
import { useAuth } from '../features/auth';
import { authConfig } from '../features/auth/config';
import {
  listNotebooks, createNotebook, deleteNotebook, listPages, createPage,
  renamePage, archivePage, restorePage, duplicatePage, reorderPages,
} from '../services/pages/pages';
import { GlassPane, PixelIcon, SystemLabel, TerminalText, AsciiBox } from '../components/ui';
import { NotesHUD } from '../components/shared/NotesHUD';
import type { Notebook, Page } from '../types/page';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Notes — the knowledge inventory. Notebooks of pages with full lifecycle.
 * Refinement Phase 9: BakaTracker knowledge inventory personality.
 */
export const Notes: React.FC = () => {
  const apiClient = useApiClient();
  const { user, login } = useAuth();
  const isGuest = user?.provider === 'guest';
  const canConvert = Boolean(authConfig.domain && authConfig.clientId);

  const [notebooks, setNotebooks] = useState<Notebook[] | null>(null);
  const [pagesByNb, setPagesByNb] = useState<Record<string, Page[]>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [newNbName, setNewNbName] = useState('');
  const [openNb, setOpenNb] = useState<Record<string, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [renamingPage, setRenamingPage] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameInput, setRenameInput] = useState<HTMLInputElement | null>(null);

  const loadNotebooks = useCallback(async () => {
    if (isGuest) return;
    try { setNotebooks(await listNotebooks(apiClient)); }
    catch (err) { setLoadError(err instanceof Error ? err.message : 'Could not load notebooks.'); }
  }, [apiClient, isGuest]);

  const loadPages = useCallback(async (nbId: string) => {
    if (isGuest) return;
    try { const pages = await listPages(apiClient, nbId); setPagesByNb(prev => ({ ...prev, [nbId]: pages })); }
    catch (err) { setLoadError(err instanceof Error ? err.message : 'Could not load pages.'); }
  }, [apiClient, isGuest]);

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    (async () => {
      try { const nbs = await listNotebooks(apiClient); if (!cancelled) setNotebooks(nbs); }
      catch (err) { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load notebooks.'); }
    })();
    return () => { cancelled = true; };
  }, [apiClient, isGuest]);

  const runBusy = async (id: string, fn: () => Promise<void>) => {
    setBusy(true); setBusyId(id);
    try { await fn(); } finally { setBusy(false); setBusyId(null); }
  };

  // --- Notebook actions ---
  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newNbName.trim();
    if (!name || busy) return;
    await runBusy('nb:new', async () => {
      const nb = await createNotebook(apiClient, name);
      await loadNotebooks();
      setOpenNb(prev => ({ ...prev, [nb.id]: true }));
      setNewNbName(''); setCreatingNotebook(false);
    }).catch(() => undefined);
  };

  const handleDeleteNotebook = async (nb: Notebook) => {
    if (busy) return;
    const ok = window.confirm(`Delete "${nb.name}"? Its pages move to your default notebook.`);
    if (!ok) return;
    await runBusy(`nb:${nb.id}`, async () => { await deleteNotebook(apiClient, nb.id); await loadNotebooks(); }).catch(() => undefined);
  };

  // --- Page actions ---
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

  const startRename = (page: Page) => { setRenamingPage(page.id); setRenameValue(page.title); setTimeout(() => renameInput?.focus(), 0); };

  const commitRename = async (page: Page) => {
    const title = renameValue.trim(); setRenamingPage(null);
    if (!title || title === page.title) return;
    await runBusy(`pg:rename:${page.id}`, async () => {
      const updated = await renamePage(apiClient, page.id, title);
      setPagesByNb(prev => ({ ...prev, [page.notebook_id ?? '']: (prev[page.notebook_id ?? ''] ?? []).map(p => (p.id === page.id ? updated : p)) }));
    }).catch(() => undefined);
  };

  const handleArchivePage = async (page: Page) => {
    if (busy) return;
    await runBusy(`pg:archive:${page.id}`, async () => {
      await archivePage(apiClient, page.id);
      const nbId = page.notebook_id ?? '';
      setPagesByNb(prev => ({ ...prev, [nbId]: (prev[nbId] ?? []).map(p => (p.id === page.id ? { ...p, archived_at: new Date().toISOString() } : p)) }));
    }).catch(() => undefined);
  };

  const handleRestorePage = async (page: Page) => {
    if (busy) return;
    await runBusy(`pg:restore:${page.id}`, async () => { await restorePage(apiClient, page.id); await loadPages(page.notebook_id ?? ''); }).catch(() => undefined);
  };

  const handleDuplicatePage = async (page: Page) => {
    if (busy) return;
    await runBusy(`pg:dup:${page.id}`, async () => {
      const copy = await duplicatePage(apiClient, page.id);
      const nbId = page.notebook_id ?? '';
      setPagesByNb(prev => ({ ...prev, [nbId]: [copy, ...(prev[nbId] ?? [])] }));
    }).catch(() => undefined);
  };

  const handlePageToQuests = async (page: Page) => {
    if (busy) return;
    const candidates: string[] = [];
    const push = (raw: string) => { const t = raw.trim().replace(/^[-•*]\s*/, ''); if (t && t.length >= 3 && t.length <= 180) candidates.push(t); };
    (page.title || '').split(/\n/).forEach(push);
    if (page.kind === 'excalidraw' && page.scene) {
      try { const scene = JSON.parse(page.scene) as { elements?: { type?: string; text?: string }[] }; (scene.elements ?? []).filter(el => el.type === 'text' && el.text).forEach(el => push(String(el.text))); } catch { /* non-JSON scene — ignore */ }
    }
    const quests = [...new Set(candidates)].slice(0, 12);
    if (quests.length === 0) { window.alert('This page has no extractable content to turn into quests.'); return; }
    const ok = window.confirm(`Turn this page into ${quests.length} quest${quests.length === 1 ? '' : 's'}?\n\n${quests.map((q, i) => `${i + 1}. ${q}`).join('\n')}`);
    if (!ok) return;
    const { addTask } = useStore.getState();
    for (const title of quests) { await addTask(title, `From page: ${page.title || 'Untitled'}`, 'personal', 10, false); }
  };

  const handleReorderPage = async (page: Page, dir: -1 | 1) => {
    if (busy) return;
    const nbId = page.notebook_id ?? '';
    const list = pagesByNb[nbId] ?? [];
    const active = list.filter(p => p.archived_at === null);
    const from = active.findIndex(p => p.id === page.id);
    if (from < 0) return;
    const to = from + dir;
    if (to < 0 || to >= active.length) return;
    const reorderedActive = [...active]; const [moved] = reorderedActive.splice(from, 1); reorderedActive.splice(to, 0, moved);
    await runBusy(`pg:reorder:${page.id}`, async () => {
      await reorderPages(apiClient, nbId === '' ? null : nbId, reorderedActive.map(p => p.id));
      const archivedList = list.filter(p => p.archived_at !== null);
      setPagesByNb(prev => {
        const merged = (id: string) => (prev[nbId] ?? []).find(p => p.id === id) ?? { id };
        return { ...prev, [nbId]: [...reorderedActive.map(p => ({ ...p, ...merged(p.id) })), ...archivedList] };
      });
    }).catch(() => undefined);
  };

  // --- HUD stats ---
  const totalNotebooks = notebooks?.length ?? 0;
  const allPages = Object.values(pagesByNb).flat();
  const totalNotes = allPages.filter(p => p.archived_at === null).length;
  const totalArchived = allPages.filter(p => p.archived_at !== null).length;

  const pageRow = (page: Page) => {
    const archived = page.archived_at !== null;
    const isRenaming = renamingPage === page.id;
    const isBusy = busyId === `pg:rename:${page.id}` || busyId === `pg:archive:${page.id}` || busyId === `pg:dup:${page.id}` || busyId === `pg:restore:${page.id}`;

    if (archived && !showArchived) return null;

    return (
      <li key={page.id} className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 transition border ${archived ? 'opacity-60' : ''}`}
        style={{ borderColor: archived ? 'var(--bt-border-soft)' : 'var(--bt-border)', background: archived ? 'rgba(242,242,242,0.02)' : 'rgba(242,242,242,0.04)' }}>
        {isRenaming ? (
          <form className="flex min-w-0 flex-1 items-center gap-1.5" onSubmit={e => { e.preventDefault(); void commitRename(page); }}>
            <input ref={setRenameInput} value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={() => void commitRename(page)}
              className="w-full min-w-0 flex-1 rounded-md px-2 py-1 font-mono text-xs font-bold arcade-input !py-1.5" maxLength={300} autoFocus />
            <button type="submit" aria-label="Save name" className="p-1 cursor-pointer" style={{ color: 'var(--bt-success)' }}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></button>
            <button type="button" aria-label="Cancel rename" onClick={() => setRenamingPage(null)} className="p-1 cursor-pointer" style={{ color: 'var(--bt-text-muted)' }}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </form>
        ) : (
          <>
            <PixelIcon name={page.kind === 'excalidraw' ? 'brush' : 'fileText'} size={14} color={page.kind === 'excalidraw' ? 'var(--bt-rose)' : 'var(--bt-text-muted)'} className="shrink-0" />
            <Link to={`/notes/${page.id}`} className="min-w-0 flex-1 truncate font-mono text-xs font-bold no-underline hover:text-[var(--bt-rose)]" style={{ color: 'var(--bt-text)' }}>{page.title || 'Untitled'}</Link>
            <span className="hidden shrink-0 font-mono text-[10px] font-bold sm:inline" style={{ color: 'var(--bt-text-muted)' }}>{formatDate(page.updated_at)}</span>
            {isBusy ? (
              <svg className="w-4 h-4 shrink-0 animate-spin" style={{ color: 'var(--bt-rose)' }} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <span className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition sm:group-hover:opacity-100" style={{ opacity: 0 }}>
                <button type="button" aria-label="Move page up" onClick={() => void handleReorderPage(page, -1)} className="icon-button icon-button-small"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg></button>
                <button type="button" aria-label="Move page down" onClick={() => void handleReorderPage(page, 1)} className="icon-button icon-button-small"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></button>
                <button type="button" aria-label="Turn this page into quests" title="Turn this page into quests" onClick={() => void handlePageToQuests(page)} className="icon-button icon-button-small"><PixelIcon name="zap" size={14} /></button>
                <button type="button" aria-label="Rename page" onClick={() => startRename(page)} className="icon-button icon-button-small"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                <button type="button" aria-label="Duplicate page" onClick={() => void handleDuplicatePage(page)} className="icon-button icon-button-small"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                {archived ? (
                  <button type="button" aria-label="Restore page" onClick={() => void handleRestorePage(page)} className="icon-button icon-button-small"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
                ) : (
                  <button type="button" aria-label="Archive page" onClick={() => void handleArchivePage(page)} className="icon-button icon-button-small"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg></button>
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
      {/* HUD */}
      {!isGuest && <NotesHUD notebookCount={totalNotebooks} noteCount={totalNotes} archivedCount={totalArchived} />}

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 z-10">
        <div>
          <h1 className="marquee-title m-0 text-2xl" style={{ color: 'var(--bt-text)' }}>
            <TerminalText tone="primary" prompt>KNOWLEDGE INVENTORY</TerminalText>
          </h1>
          <p className="font-mono text-xs mt-1.5 m-0" style={{ color: 'var(--bt-text-muted)' }}>Notebooks of pages, with the full page lifecycle.</p>
        </div>
        {!isGuest && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowArchived(s => !s)} className={`btn-ghost !text-xs ${showArchived ? '!text-[var(--bt-rose)]' : ''}`}>
              <svg className="w-3.5 h-3.5 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              {showArchived ? 'Hide archived' : 'Show archived'}
            </button>
            <button type="button" onClick={() => setCreatingNotebook(true)} className="insert-coin !py-2 !px-3 !text-xs">
              <PixelIcon name="plus" size={14} className="mr-1" /> NEW NOTEBOOK
            </button>
          </div>
        )}
      </div>

      {isGuest ? (
        <section className="z-10 max-w-md mx-auto mt-4">
          <AsciiBox title="KNOWLEDGE INVENTORY" tone="primary">
            <div className="flex flex-col items-center gap-3 py-2">
              <PixelIcon name="notebook" size={28} color="var(--bt-rose)" />
              <p className="m-0 text-sm text-center" style={{ color: 'var(--bt-text-dim)' }}>
                Notes live on your own instance. Create your own BakaTracker to keep every drawing in your own cabinet.
              </p>
              {canConvert ? (
                <button type="button" onClick={() => void login()} className="insert-coin mt-1 !text-xs">
                  <PixelIcon name="sparkles" size={14} className="mr-1" /> Create your own BakaTracker
                </button>
              ) : (
                <SystemLabel tone="muted">Sign-in is unavailable right now.</SystemLabel>
              )}
            </div>
          </AsciiBox>
        </section>
      ) : (
        <>
          {loadError && (
            <GlassPane state="ooo" tone="coral" className="mb-6" screenClassName="!p-4">
              <p className="m-0 font-mono text-xs font-bold" style={{ color: 'var(--bt-danger)' }}>{loadError}</p>
              <button type="button" onClick={() => void loadNotebooks()} className="btn-ghost !text-xs mt-2">Retry</button>
            </GlassPane>
          )}

          {creatingNotebook && (
            <GlassPane as="form" onSubmit={e => void handleCreateNotebook(e)} state="playing" tone="rose" className="mb-6 animate-fade-in" screenClassName="flex items-center gap-2">
              <input value={newNbName} onChange={e => setNewNbName(e.target.value)} placeholder="Notebook name…" autoFocus className="min-w-0 flex-1 arcade-input !py-2 !text-xs" maxLength={60} />
              <button type="submit" disabled={busy || !newNbName.trim()} className="insert-coin !py-2 !px-3 !text-xs disabled:opacity-50">{busy && busyId === 'nb:new' ? 'Creating…' : 'Create'}</button>
              <button type="button" onClick={() => setCreatingNotebook(false)} className="btn-ghost !text-xs">Cancel</button>
            </GlassPane>
          )}

          {notebooks === null ? (
            <GlassPane state="attract" screenClassName="!p-8 text-center">
              <svg className="mx-auto mb-2 w-6 h-6 animate-spin" style={{ color: 'var(--bt-rose)' }} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <SystemLabel tone="muted">Loading notebooks…</SystemLabel>
            </GlassPane>
          ) : notebooks.length === 0 ? (
            <section className="z-10 max-w-md mx-auto mt-4">
              <AsciiBox title="KNOWLEDGE EMPTY" tone="default">
                <div className="flex flex-col items-center gap-3 py-2">
                  <PixelIcon name="notebook" size={28} color="var(--bt-text-muted)" />
                  <p className="m-0 text-sm text-center" style={{ color: 'var(--bt-text-dim)' }}>Create your first notebook to start sketching.</p>
                  <button type="button" onClick={() => setCreatingNotebook(true)} className="insert-coin mt-1 !text-xs"><PixelIcon name="plus" size={14} className="mr-1" /> NEW NOTEBOOK</button>
                </div>
              </AsciiBox>
            </section>
          ) : (
            <div className="flex flex-col gap-4 z-10">
              {notebooks.map(nb => {
                const pages = pagesByNb[nb.id];
                const open = openNb[nb.id] ?? true;
                const visible = (pages ?? []).filter(p => showArchived || p.archived_at === null);
                const archivedCount = (pages ?? []).filter(p => p.archived_at !== null).length;

                return (
                  <GlassPane key={nb.id} state="off" tone="rose" className="overflow-hidden" screenClassName="!p-0">
                    <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--bt-border-soft)', background: 'rgba(242,242,242,0.03)' }}>
                      <button type="button" onClick={() => setOpenNb(prev => ({ ...prev, [nb.id]: !prev[nb.id] }))} aria-label={open ? 'Collapse notebook' : 'Expand notebook'} className="icon-button icon-button-small">
                        {open ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg> : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>}
                      </button>
                      <PixelIcon name="notebook" size={14} color="var(--bt-rose)" className="shrink-0" />
                      <h2 className="m-0 min-w-0 flex-1 truncate marquee-title text-base" style={{ color: 'var(--bt-text)' }}>{nb.name}</h2>
                      {pages !== undefined && (
                        <span className="shrink-0 font-mono text-[10px] font-bold" style={{ color: 'var(--bt-text-muted)' }}>
                          {visible.length} page{visible.length === 1 ? '' : 's'}{archivedCount > 0 && ` · ${archivedCount} archived`}
                        </span>
                      )}
                      <button type="button" onClick={() => void handleCreatePage(nb)} disabled={busy} className="btn-ghost !py-1 !px-2 !text-[10px] disabled:opacity-50"><PixelIcon name="plus" size={12} className="mr-1" /> Page</button>
                      <button type="button" onClick={() => void handleDeleteNotebook(nb)} disabled={busy} aria-label={`Delete ${nb.name}`} className="icon-button icon-button-small hover:!text-danger"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                    </div>

                    {open && (
                      <div className="px-3 py-3">
                        {pages === undefined ? (
                          <PageListLoader onReady={() => void loadPages(nb.id)} />
                        ) : visible.length === 0 ? (
                          <SystemLabel tone="muted">{showArchived ? 'Nothing here.' : 'No pages yet — add one above.'}</SystemLabel>
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

const PageListLoader: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  const fired = useRef(false);
  useEffect(() => { if (fired.current) return; fired.current = true; onReady(); }, [onReady]);
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <svg className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--bt-rose)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      <SystemLabel tone="muted">Loading pages…</SystemLabel>
    </div>
  );
};
