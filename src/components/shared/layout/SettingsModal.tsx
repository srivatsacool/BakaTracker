import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, Download, LogOut, Play, Settings as SettingsIcon, Sparkles, Sun, X, Zap } from 'lucide-react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { SyncStatus } from '../../shell';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../../../services/push';
import {
  NOTIF_TONES,
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
  type NotifTone,
} from '../../../services/notificationSettings';
import { seedDemoData } from '../../../services/demoMode';
import type { ApiClient } from '../../../api/apiClient';
import { TONE_LABELS, ACCENT_SWATCHES } from './constants';
import type { User } from '../../../features/auth/types';

interface SettingsModalProps {
  user: User | null | undefined;
  isGuest: boolean;
  isAuthConfigured: boolean;
  login: (options?: unknown) => Promise<void>;
  logout: (options?: unknown) => Promise<void>;
  getAccessToken: (options?: unknown) => Promise<string>;
  apiClient: ApiClient;
  init: (apiClient?: ApiClient) => Promise<void>;
  clearDataByDays: (days: number | 'all') => Promise<void>;
  setAccentColors: (light: string, dark: string) => void;
  startTour: () => void;
  /** Accent inputs seed from these on mount (modal mounts fresh per open). */
  initialAccentLight: string;
  initialAccentDark: string;
  /** Called when the modal fully closes (after the exit animation). */
  onClose: () => void;
  /** Fire-and-forget close + open Export modal (Data section lever). */
  onRequestExport: () => void;
}

/**
 * The settings dialog (bottom sheet on mobile).
 *
 * Extracted verbatim from Layout.tsx. All state that ONLY this dialog reads or
 * writes now lives here: accent inputs, focus-trap/closing animation, push
 * subscription, BakaSur notification settings (fetch on open), demo seeding
 * and account reset. Observable behavior is unchanged:
 * - accent inputs seed from the persisted settings on mount (the modal was
 *   conditionally mounted before too, so mount == every open);
 * - `requestClose()` centralizes the closing-animation idiom previously
 *   repeated at six call sites;
 * - the push-subscription prewarm moved from app mount to modal mount — it was
 *   only ever rendered inside this dialog.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  isGuest,
  isAuthConfigured,
  login,
  logout,
  getAccessToken,
  apiClient,
  init,
  clearDataByDays,
  setAccentColors,
  startTour,
  initialAccentLight,
  initialAccentDark,
  onClose,
  onRequestExport,
}) => {
  const navigate = useNavigate();
  const [settingsClosing, setSettingsClosing] = useState(false);
  const settingsDialogRef = useFocusTrap<HTMLDivElement>(!settingsClosing, {
    onEscape: () => requestClose(),
  });

  const [inputAccentLight, setInputAccentLight] = useState(initialAccentLight);
  const [inputAccentDark, setInputAccentDark] = useState(initialAccentDark);

  const requestClose = () => {
    setSettingsClosing(true);
    setTimeout(onClose, 150);
  };

  // Push subscription status — checked when the dialog mounts (it was checked
  // app-wide before; only this UI consumes it).
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => {
    isPushSubscribed().then(setIsSubscribed);
  }, []);

  // BakaSur notification settings (master opt-in, tone, quiet hours).
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSaved, setNotifSaved] = useState(false);
  const notifSaveSeq = useRef(0);

  // Derived: a fetch is in flight while mounted with nothing loaded yet and no
  // load failure (guests never fetch, so they never see this).
  const notifLoading = !isGuest && !notifSettings && !notifError;

  // Fetch notification settings on mount — but only for authenticated users;
  // guests have no backend account to persist preferences for. setState runs
  // only in async callbacks (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (isGuest || !apiClient) return;
    let cancelled = false;
    getNotificationSettings(apiClient)
      .then((s) => {
        if (!cancelled) setNotifSettings(s);
      })
      .catch((e) => {
        if (!cancelled) setNotifError(`Failed to load settings — ${e instanceof Error ? e.message : 'unknown error'}`);
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest, apiClient]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setAccentColors(inputAccentLight, inputAccentDark);
    requestClose();
  };

  const handleResetColors = () => {
    setInputAccentLight('#8B5CF6');
    setInputAccentDark('#8B5CF6');
  };

  // F11 — the Account section's demo-exit lever (mirrors the UserMenu
  // "Leave demo" action): clears the demo flag + local state, back to the
  // landing. Authed users sign out through `logout()` directly instead.
  const handleLeaveDemo = async () => {
    requestClose();
    await logout();
    navigate('/');
  };

  // BakaSur notification settings — optimistic local update, then PUT the FULL
  // settings object (the backend rejects partial payloads, so we always spread
  // the loaded settings and mutate only what changed). Selections survive a
  // failed save; only the latest in-flight save may touch UI state.
  const handleNotifChange = (patch: Partial<NotificationSettings>) => {
    if (!notifSettings) return;
    const next = { ...notifSettings, ...patch };
    setNotifSettings(next);
    handleNotifSave(next);
  };

  const handleNotifSave = async (next: NotificationSettings) => {
    if (!apiClient) return;
    const seq = ++notifSaveSeq.current;
    setNotifSaving(true);
    setNotifError(null);
    setNotifSaved(false);
    try {
      const saved = await updateNotificationSettings(apiClient, next);
      if (seq !== notifSaveSeq.current) return; // superseded by a newer save
      setNotifSettings(saved);
      setNotifSaved(true);
      window.setTimeout(() => setNotifSaved(false), 2500);
    } catch (e) {
      if (seq !== notifSaveSeq.current) return;
      setNotifError(`Failed to save — ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      if (seq === notifSaveSeq.current) setNotifSaving(false);
    }
  };

  // Phase 3 — Demo Mode: seed the authenticated user's account through the
  // Tool Registry REST transport, then re-hydrate from D1 so the UI updates.
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoResult, setDemoResult] = useState<{ ok: boolean; skipped: boolean; message: string } | null>(null);

  const handleLoadDemoData = async () => {
    if (!apiClient || isGuest) return;
    if (!window.confirm(
      'Load sample demo data into your current account? This adds habits, tasks, journal entries and a note. It will not touch your existing data.',
    )) return;

    setDemoBusy(true);
    setDemoResult(null);
    try {
      const res = await seedDemoData(apiClient);
      if (res.ok && res.skipped) {
        setDemoResult({ ok: true, skipped: true, message: 'Demo data is already loaded for this account.' });
      } else if (res.ok) {
        setDemoResult({ ok: true, skipped: false, message: 'Demo data loaded. Refreshing…' });
        await init(apiClient); // re-hydrate from D1 so the UI shows the seeds
      } else {
        setDemoResult({ ok: false, skipped: false, message: `Could not load demo data. Failed: ${res.failed.join(', ')}` });
      }
    } catch (e) {
      setDemoResult({ ok: false, skipped: false, message: `Demo data could not be loaded (${e instanceof Error ? e.message : 'unknown error'}).` });
    } finally {
      setDemoBusy(false);
    }
  };

  // Phase 3 — Clear Data: full per-user reset through the Tool Registry's
  // `reset_account` tool (scoped to THIS user; auth/session untouched).
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [clearDays, setClearDays] = useState<number | 'all'>(7);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleFullReset = async () => {
    if (!apiClient || isGuest) return;
    setResetBusy(true);
    setResetResult(null);
    try {
      const res = await apiClient.post<{ ok: boolean; result?: { deleted?: Record<string, number> } }>(
        '/api/v1/tools/reset_account', { confirm: 'DELETE' },
      );
      setResetResult(`Cleared ${JSON.stringify(res.result?.deleted ?? {})} — reloading…`);
      await init(apiClient);
      setDeleteConfirmText('');
    } catch (e) {
      setResetResult(`Reset failed (${e instanceof Error ? e.message : 'unknown error'}).`);
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[999] flex items-center justify-center max-sm:items-end p-0 sm:p-4 ${settingsClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        ref={settingsDialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        tabIndex={-1}
        className="glass-strong p-6 w-full max-w-md flex flex-col gap-4 max-sm:rounded-b-none max-sm:rounded-t-2xl max-h-[90vh] overflow-y-auto"
        style={{ color: 'var(--arcade-paper)' }}
      >
        <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid rgba(242,242,242,0.1)' }}>
          <h3 id="settings-modal-title" className="text-lg font-bold flex items-center gap-2 m-0">
            <SettingsIcon className="w-5 h-5" style={{ color: 'var(--arcade-gold)' }} />
            <span>BakaTracker Settings</span>
          </h3>
          <button
            onClick={requestClose}
            className="icon-button"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs leading-relaxed font-mono m-0" style={{ color: 'var(--arcade-paper-muted)' }}>
          Your workspace is local-first. Sign in only when you want to sync this journey to your own BakaTracker Worker; the arcade and its daily actions remain available offline.
        </p>

        {/* (a) Account / Profile — the player card + the exit levers */}
        <div className="f11-settings-section">
          <div className="f11-settings-header">
            <span className="f11-settings-led" aria-hidden="true" />
            <h4 className="f11-settings-title">Account</h4>
            {isGuest && <span className="ml-auto font-mono text-[9px] chip chip--cobalt">Demo session</span>}
          </div>

          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt={user.name || 'Profile'} className="w-10 h-10 rounded-full object-cover shrink-0" style={{ border: '1px solid rgba(139, 92, 246, 0.4)' }} />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase shrink-0" style={{ background: 'linear-gradient(180deg, var(--arcade-gold), var(--arcade-gold-deep))', color: 'var(--obs-void-lift)' }}>
                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="overflow-hidden flex-1 min-w-0">
              <h4 className="font-bold text-xs truncate leading-tight m-0" style={{ color: 'var(--arcade-paper)' }}>
                {user?.name || (isGuest ? 'Demo Player' : 'Player')}
              </h4>
              <span className="text-[10px] font-mono truncate block mt-0.5" style={{ color: 'var(--arcade-paper-muted)' }}>
                {user?.email || 'Local demo instance'}
              </span>
            </div>
          </div>

          {isGuest ? (
            <div className="flex flex-col gap-2">
              <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>
                You're exploring a demo — your observations live on this device.
              </p>
              {isAuthConfigured ? (
                <button
                  type="button"
                  onClick={async () => {
                    await login(); // demo login clears bt_demo_mode, then real OAuth
                  }}
                  className="insert-coin w-full justify-center !py-2 !text-xs"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>Create your own BakaTracker</span>
                </button>
              ) : (
                <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>
                  Sign-in is unavailable right now — data stays on this device.
                </p>
              )}
              <button
                type="button"
                onClick={handleLeaveDemo}
                className="btn-ghost w-full justify-center !py-2 !text-xs"
              >
                <DoorOpen className="w-4 h-4" aria-hidden="true" />
                <span>Leave demo</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logout()}
              className="btn-ghost w-full justify-center !py-2 !text-xs"
              style={{ color: 'var(--arcade-red)', borderColor: 'rgba(255,59,92,0.35)', background: 'rgba(255,59,92,0.08)' }}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
          {/* (b) Appearance — theme + aurora accent pickers */}
          <div className="f11-settings-section">
            <div className="f11-settings-header">
              <span className="f11-settings-led" aria-hidden="true" />
              <h4 className="f11-settings-title">Appearance</h4>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono" style={{ color: 'var(--arcade-paper-dim)' }}>Theme</span>
              <span className="btn-ghost !py-1.5 !text-xs opacity-50 cursor-default" title="Dark mode is always on — the Light Tunnel world is dark-first">
                <Sun className="w-3.5 h-3.5" aria-hidden="true" /> Dark
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black font-mono" style={{ color: 'var(--arcade-paper-dim)' }}>Aurora Accent Colors</label>
                <button
                  type="button"
                  onClick={handleResetColors}
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer transition"
                  style={{ border: '1px solid var(--obs-glass-15)', background: 'var(--obs-glass-5)' }}
                >
                  Reset Defaults
                </button>
              </div>

              {/* Light Mode Accent */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>Day Accent</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={inputAccentLight}
                    onChange={e => setInputAccentLight(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer shrink-0"
                    style={{ border: '1px solid rgba(242,242,242,0.2)', background: 'transparent' }}
                  />
                  <input
                    type="text"
                    value={inputAccentLight}
                    onChange={e => setInputAccentLight(e.target.value)}
                    placeholder="#8B5CF6"
                    className="arcade-input !text-xs w-24 uppercase font-mono py-1 px-2 shrink-0"
                    maxLength={7}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    required
                  />
                  <div className="flex gap-1.5 ml-auto overflow-x-auto no-scrollbar py-1">
                    {ACCENT_SWATCHES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setInputAccentLight(c)}
                        className="w-4.5 h-4.5 rounded-full cursor-pointer shrink-0 transition hover:scale-110"
                        style={{ backgroundColor: c, border: '1px solid rgba(242,242,242,0.25)' }}
                        aria-label={`Set day accent to ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Dark Mode Accent */}
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>Night Accent</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={inputAccentDark}
                    onChange={e => setInputAccentDark(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer shrink-0"
                    style={{ border: '1px solid rgba(242,242,242,0.2)', background: 'transparent' }}
                  />
                  <input
                    type="text"
                    value={inputAccentDark}
                    onChange={e => setInputAccentDark(e.target.value)}
                    placeholder="#8B5CF6"
                    className="arcade-input !text-xs w-24 uppercase font-mono py-1 px-2 shrink-0"
                    maxLength={7}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    required
                  />
                  <div className="flex gap-1.5 ml-auto overflow-x-auto no-scrollbar py-1">
                    {ACCENT_SWATCHES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setInputAccentDark(c)}
                        className="w-4.5 h-4.5 rounded-full cursor-pointer shrink-0 transition hover:scale-110"
                        style={{ backgroundColor: c, border: '1px solid rgba(242,242,242,0.25)' }}
                        aria-label={`Set night accent to ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* (c) Notifications — push + BakaSur preferences */}
          <div className="f11-settings-section">
            <div className="f11-settings-header">
              <span className="f11-settings-led" aria-hidden="true" />
              <h4 className="f11-settings-title">Notifications</h4>
            </div>

            {/* Push Notifications */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black font-mono" style={{ color: 'var(--arcade-paper-dim)' }}>Push Notifications</label>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full chip ${
                    isSubscribed ? 'chip--teal' : ''
                  }`}
                >
                  {isSubscribed ? 'Active' : 'Off'}
                </span>
              </div>
              <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>
                Receive proactive reminders from BakaSur when habits lapse, tasks are due, or milestones are reached.
              </p>
              <button
                type="button"
                disabled={pushBusy}
                onClick={async () => {
                  const token = await getAccessToken();
                  if (!token) return;
                  setPushBusy(true);
                  if (isSubscribed) {
                    await unsubscribeFromPush(token);
                    setIsSubscribed(false);
                  } else {
                    const result = await subscribeToPush(token);
                    if (result.success) setIsSubscribed(true);
                    if (result.message) alert(result.message);
                  }
                  setPushBusy(false);
                }}
                className="btn-ghost self-start !py-1.5 !text-xs"
              >
                {pushBusy ? '...' : isSubscribed ? 'Disable Push' : 'Enable Push'}
              </button>
            </div>

            {/* BakaSur Notifications */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black font-mono" style={{ color: 'var(--arcade-paper-dim)' }}>BakaSur Notifications</label>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full chip ${
                    notifSettings?.enabled ? 'chip--teal' : ''
                  }`}
                >
                  {notifSettings?.enabled ? 'Active' : 'Off'}
                </span>
              </div>
              <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>
                Let BakaSur nudge you when habits lapse, tasks are due, or milestones are reached.
              </p>

              {notifLoading ? (
                <p className="m-0 text-[10px] font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>Loading settings…</p>
              ) : notifSettings ? (
                <>
                  {/* Master opt-in */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>Proactive reminders</span>
                    <button
                      type="button"
                      disabled={notifSaving}
                      onClick={() => handleNotifChange({ enabled: !notifSettings.enabled })}
                      className="btn-ghost !py-1.5 !text-xs"
                    >
                      {notifSaving ? '...' : notifSettings.enabled ? 'On' : 'Off'}
                    </button>
                  </div>

                  {/* Personality */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>BakaSur personality</span>
                    <select
                      value={notifSettings.tone}
                      onChange={(e) => handleNotifChange({ tone: e.target.value as NotifTone })}
                      className="arcade-input !text-xs font-mono"
                    >
                      {NOTIF_TONES.map((t) => (
                        <option key={t} value={t}>{TONE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Quiet hours */}
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifSettings.quiet_hours.enabled}
                        onChange={(e) => handleNotifChange({ quiet_hours: { ...notifSettings.quiet_hours, enabled: e.target.checked } })}
                        className="w-4 h-4 accent-arcade-gold"
                      />
                      <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>Quiet hours</span>
                    </label>
                    {notifSettings.quiet_hours.enabled && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={notifSettings.quiet_hours.start}
                          onChange={(e) => handleNotifChange({ quiet_hours: { ...notifSettings.quiet_hours, start: e.target.value } })}
                          className="arcade-input !text-xs font-mono"
                        />
                        <span className="text-[10px] font-mono" style={{ color: 'var(--arcade-paper-disabled)' }}>to</span>
                        <input
                          type="time"
                          value={notifSettings.quiet_hours.end}
                          onChange={(e) => handleNotifChange({ quiet_hours: { ...notifSettings.quiet_hours, end: e.target.value } })}
                          className="arcade-input !text-xs font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {notifError && (
                    <p className="m-0 text-[10px] font-mono text-danger">{notifError}</p>
                  )}
                  {notifSaved && !notifError && (
                    <p className="m-0 text-[10px] font-mono text-success">Saved ✓</p>
                  )}
                </>
              ) : notifError ? (
                <p className="m-0 text-[10px] font-mono text-danger">{notifError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={requestClose}
              className="btn-ghost !text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="insert-coin !py-2 !px-4 !text-sm"
            >
              Save preferences
            </button>
          </div>
        </form>

        {/* (d) Data — sync truth, export, trial data, tour, danger zone */}
        <div className="f11-settings-section">
          <div className="f11-settings-header">
            <span className="f11-settings-led" aria-hidden="true" />
            <h4 className="f11-settings-title">Data</h4>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono" style={{ color: 'var(--arcade-paper-dim)' }}>Sync</span>
            <SyncStatus />
          </div>
          <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>
            Your ledger is saved locally and pushed to your Worker whenever you're online.
          </p>

          <button
            type="button"
            onClick={() => {
              requestClose();
              setTimeout(onRequestExport, 150);
            }}
            className="btn-ghost w-full justify-center !text-xs py-2"
          >
            <Download className="w-4 h-4" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
            <span>Export Life Report</span>
          </button>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleLoadDemoData}
              disabled={demoBusy || isGuest}
              className="btn-ghost w-full justify-center !text-xs py-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
              <span>{demoBusy ? 'Loading Trial Data...' : 'Load Trial Data'}</span>
            </button>
            <p className="text-[10px] font-mono text-center m-0" style={{ color: 'var(--arcade-paper-disabled)' }}>
              Adds sample habits, tasks, journal entries and a note to your current account (via the Worker). Idempotent — safe to press again.
            </p>
            {demoResult && (
              <p className={`text-[10px] font-mono text-center m-0 ${demoResult.ok ? 'text-success' : 'text-danger'}`}>
                {demoResult.message}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                requestClose();
                setTimeout(() => startTour(), 300);
              }}
              className="btn-ghost w-full !text-xs py-2"
            >
              <Play className="w-4 h-4" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
              <span>Replay App Tour</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-3 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255, 59, 92, 0.2)' }}>
            <span className="text-xs font-black uppercase font-mono text-danger">⚠️ Danger Zone</span>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold font-mono" style={{ color: 'var(--arcade-paper-dim)' }}>Clear Data Duration</label>
              <select
                value={clearDays}
                onChange={e => setClearDays(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="arcade-input !text-xs font-mono"
              >
                <option value={7}>Last 7 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value="all">All Time (Full Reset) ☠️</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold font-mono" style={{ color: 'var(--arcade-paper-dim)' }}>
                Type <code className="px-1 rounded font-bold text-danger" style={{ background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.25)' }}>delete my data</code> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="delete my data"
                className="arcade-input !text-xs"
              />
            </div>

            <button
              type="button"
              disabled={deleteConfirmText !== 'delete my data' || resetBusy}
              onClick={async () => {
                if (deleteConfirmText !== 'delete my data') return;
                if (!window.confirm('Are you absolutely sure you want to delete ALL of your data in this account? This cannot be undone. Your login session stays active.')) return;
                if (clearDays === 'all') {
                  await handleFullReset();
                } else {
                  await clearDataByDays(clearDays);
                  setDeleteConfirmText('');
                  requestClose();
                }
              }}
              className="insert-coin w-full justify-center !text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, var(--arcade-red) 0%, var(--arcade-red-deep) 100%)', borderColor: 'rgba(255,59,92,0.5)', boxShadow: '0 0 20px rgba(255,59,92,0.25)', color: '#fff' }}
            >
              <span>{resetBusy ? 'Clearing…' : 'Clear Selected Data'}</span>
            </button>
            {resetResult && (
              <p className="text-[10px] font-mono text-center m-0 text-danger">{resetResult}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
