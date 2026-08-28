import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, Play, X } from 'lucide-react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { SyncStatus } from '../../shell';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../../../services/push';
import {
  NOTIF_TONES, getNotificationSettings, updateNotificationSettings,
  type NotificationSettings, type NotifTone,
} from '../../../services/notificationSettings';
import { seedDemoData } from '../../../services/demoMode';
import type { ApiClient } from '../../../api/apiClient';
import { TONE_LABELS, ACCENT_SWATCHES } from './constants';
import type { User } from '../../../features/auth/types';
import { PixelIcon, PixelBadge, SystemLabel, TerminalText } from '../../ui';

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
  initialAccentLight: string;
  initialAccentDark: string;
  onClose: () => void;
  onRequestExport: () => void;
}

/**
 * SettingsModal — system control panel. Clean, precise, technical.
 * Lowest RPG intensity in the application.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  user, isGuest, isAuthConfigured, login, logout, getAccessToken, apiClient,
  init, clearDataByDays, setAccentColors, startTour, initialAccentLight,
  initialAccentDark, onClose, onRequestExport,
}) => {
  const navigate = useNavigate();
  const [settingsClosing, setSettingsClosing] = useState(false);
  const settingsDialogRef = useFocusTrap<HTMLDivElement>(!settingsClosing, { onEscape: () => requestClose() });

  const [inputAccentLight, setInputAccentLight] = useState(initialAccentLight);
  const [inputAccentDark, setInputAccentDark] = useState(initialAccentDark);

  const requestClose = () => { setSettingsClosing(true); setTimeout(onClose, 150); };

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => { isPushSubscribed().then(setIsSubscribed); }, []);

  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSaved, setNotifSaved] = useState(false);
  const notifSaveSeq = useRef(0);
  const notifLoading = !isGuest && !notifSettings && !notifError;

  useEffect(() => {
    if (isGuest || !apiClient) return;
    let cancelled = false;
    getNotificationSettings(apiClient).then(s => { if (!cancelled) setNotifSettings(s); })
      .catch(e => { if (!cancelled) setNotifError(`Failed to load settings — ${e instanceof Error ? e.message : 'unknown error'}`); });
    return () => { cancelled = true; };
  }, [isGuest, apiClient]);

  const handleSaveSettings = (e: React.FormEvent) => { e.preventDefault(); setAccentColors(inputAccentLight, inputAccentDark); requestClose(); };
  const handleResetColors = () => { setInputAccentLight('#8B5CF6'); setInputAccentDark('#8B5CF6'); };

  const handleLeaveDemo = async () => { requestClose(); await logout(); navigate('/'); };

  const handleNotifChange = (patch: Partial<NotificationSettings>) => {
    if (!notifSettings) return;
    const next = { ...notifSettings, ...patch };
    setNotifSettings(next);
    handleNotifSave(next);
  };

  const handleNotifSave = async (next: NotificationSettings) => {
    if (!apiClient) return;
    const seq = ++notifSaveSeq.current;
    setNotifSaving(true); setNotifError(null); setNotifSaved(false);
    try {
      const saved = await updateNotificationSettings(apiClient, next);
      if (seq !== notifSaveSeq.current) return;
      setNotifSettings(saved); setNotifSaved(true);
      window.setTimeout(() => setNotifSaved(false), 2500);
    } catch (e) {
      if (seq !== notifSaveSeq.current) return;
      setNotifError(`Failed to save — ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally { if (seq === notifSaveSeq.current) setNotifSaving(false); }
  };

  const [demoBusy, setDemoBusy] = useState(false);
  const [demoResult, setDemoResult] = useState<{ ok: boolean; skipped: boolean; message: string } | null>(null);

  const handleLoadDemoData = async () => {
    if (!apiClient || isGuest) return;
    if (!window.confirm('Load sample demo data into your current account? This adds habits, tasks, journal entries and a note. It will not touch your existing data.')) return;
    setDemoBusy(true); setDemoResult(null);
    try {
      const res = await seedDemoData(apiClient);
      if (res.ok && res.skipped) setDemoResult({ ok: true, skipped: true, message: 'Demo data is already loaded for this account.' });
      else if (res.ok) { setDemoResult({ ok: true, skipped: false, message: 'Demo data loaded. Refreshing…' }); await init(apiClient); }
      else setDemoResult({ ok: false, skipped: false, message: `Could not load demo data. Failed: ${res.failed.join(', ')}` });
    } catch (e) { setDemoResult({ ok: false, skipped: false, message: `Demo data could not be loaded (${e instanceof Error ? e.message : 'unknown error'}).` }); }
    finally { setDemoBusy(false); }
  };

  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [clearDays, setClearDays] = useState<number | 'all'>(7);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleFullReset = async () => {
    if (!apiClient || isGuest) return;
    setResetBusy(true); setResetResult(null);
    try {
      const res = await apiClient.post<{ ok: boolean; result?: { deleted?: Record<string, number> } }>('/api/v1/tools/reset_account', { confirm: 'DELETE' });
      setResetResult(`Cleared ${JSON.stringify(res.result?.deleted ?? {})} — reloading…`); await init(apiClient); setDeleteConfirmText('');
    } catch (e) { setResetResult(`Reset failed (${e instanceof Error ? e.message : 'unknown error'}).`); }
    finally { setResetBusy(false); }
  };

  return (
    <div className={`fixed inset-0 z-[999] flex items-center justify-center max-sm:items-end p-0 sm:p-4 ${settingsClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div ref={settingsDialogRef} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" tabIndex={-1}
        className="glass-strong p-6 w-full max-w-md flex flex-col gap-4 max-sm:rounded-b-none max-sm:rounded-t-2xl max-h-[90vh] overflow-y-auto"
        style={{ color: 'var(--bt-text)' }}>

        {/* Header */}
        <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--bt-border-soft)' }}>
          <div className="flex items-center gap-2">
            <PixelIcon name="gear" size={18} color="var(--bt-primary)" />
            <TerminalText tone="primary">SETTINGS</TerminalText>
          </div>
          <button onClick={requestClose} className="icon-button" aria-label="Close settings"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-xs leading-relaxed font-mono m-0" style={{ color: 'var(--bt-text-muted)' }}>
          Your workspace is local-first. Sign in only when you want to sync.
        </p>

        {/* Account */}
        <div className="f11-settings-section">
          <div className="f11-settings-header">
            <span className="f11-settings-led" aria-hidden="true" />
            <h4 className="f11-settings-title">Account</h4>
            {isGuest && <PixelBadge tone="primary" className="ml-auto">DEMO</PixelBadge>}
          </div>

          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt={user.name || 'Profile'} className="w-10 h-10 rounded-full object-cover shrink-0" style={{ border: '1px solid rgba(139, 92, 246, 0.4)' }} />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase shrink-0" style={{ background: 'linear-gradient(180deg, var(--bt-primary), var(--bt-primary-deep))', color: 'var(--bt-bg)' }}>
                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="overflow-hidden flex-1 min-w-0">
              <h4 className="font-bold text-xs truncate leading-tight m-0" style={{ color: 'var(--bt-text)' }}>{user?.name || (isGuest ? 'Demo User' : 'User')}</h4>
              <SystemLabel tone="muted">{user?.email || 'Local demo instance'}</SystemLabel>
            </div>
          </div>

          {isGuest ? (
            <div className="flex flex-col gap-2">
              <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--bt-text-muted)' }}>
                You're exploring a demo — your observations live on this device.
              </p>
              {isAuthConfigured ? (
                <button type="button" onClick={async () => { await login(); }} className="insert-coin w-full justify-center !py-2 !text-xs">
                  <PixelIcon name="sparkles" size={14} className="mr-1" /> Create your own BakaTracker
                </button>
              ) : (
                <SystemLabel tone="muted">Sign-in is unavailable right now.</SystemLabel>
              )}
              <button type="button" onClick={handleLeaveDemo} className="btn-ghost w-full justify-center !py-2 !text-xs">
                <PixelIcon name="logout" size={14} className="mr-1" /> Leave demo
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => logout()} className="btn-ghost w-full justify-center !py-2 !text-xs"
              style={{ color: 'var(--bt-danger)', borderColor: 'rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.08)' }}>
              <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
            </button>
          )}
        </div>

        {/* Appearance */}
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
          <div className="f11-settings-section">
            <div className="f11-settings-header">
              <span className="f11-settings-led" aria-hidden="true" />
              <h4 className="f11-settings-title">Appearance</h4>
            </div>

            <div className="flex items-center justify-between">
              <SystemLabel>Theme</SystemLabel>
              <span className="btn-ghost !py-1.5 !text-xs opacity-50 cursor-default">
                <PixelIcon name="moon" size={12} className="mr-1" /> Dark
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <SystemLabel>Accent Colors</SystemLabel>
                <button type="button" onClick={handleResetColors} className="btn-ghost !text-[10px]">Reset Defaults</button>
              </div>

              {/* Light Accent */}
              <div className="flex flex-col gap-1">
                <SystemLabel tone="muted">Day Accent</SystemLabel>
                <div className="flex items-center gap-2">
                  <input type="color" value={inputAccentLight} onChange={e => setInputAccentLight(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer shrink-0" style={{ border: '1px solid var(--bt-border)', background: 'transparent' }} />
                  <input type="text" value={inputAccentLight} onChange={e => setInputAccentLight(e.target.value)} placeholder="#8B5CF6"
                    className="arcade-input !text-xs w-24 uppercase font-mono py-1 px-2 shrink-0" maxLength={7} pattern="^#[0-9A-Fa-f]{6}$" required />
                  <div className="flex gap-1.5 ml-auto overflow-x-auto no-scrollbar py-1">
                    {ACCENT_SWATCHES.map(c => (
                      <button key={c} type="button" onClick={() => setInputAccentLight(c)}
                        className="w-4.5 h-4.5 rounded-full cursor-pointer shrink-0 transition hover:scale-110"
                        style={{ backgroundColor: c, border: '1px solid var(--bt-border)' }} aria-label={`Set day accent to ${c}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Dark Accent */}
              <div className="flex flex-col gap-1 mt-1">
                <SystemLabel tone="muted">Night Accent</SystemLabel>
                <div className="flex items-center gap-2">
                  <input type="color" value={inputAccentDark} onChange={e => setInputAccentDark(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer shrink-0" style={{ border: '1px solid var(--bt-border)', background: 'transparent' }} />
                  <input type="text" value={inputAccentDark} onChange={e => setInputAccentDark(e.target.value)} placeholder="#8B5CF6"
                    className="arcade-input !text-xs w-24 uppercase font-mono py-1 px-2 shrink-0" maxLength={7} pattern="^#[0-9A-Fa-f]{6}$" required />
                  <div className="flex gap-1.5 ml-auto overflow-x-auto no-scrollbar py-1">
                    {ACCENT_SWATCHES.map(c => (
                      <button key={c} type="button" onClick={() => setInputAccentDark(c)}
                        className="w-4.5 h-4.5 rounded-full cursor-pointer shrink-0 transition hover:scale-110"
                        style={{ backgroundColor: c, border: '1px solid var(--bt-border)' }} aria-label={`Set night accent to ${c}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="f11-settings-section">
            <div className="f11-settings-header">
              <span className="f11-settings-led" aria-hidden="true" />
              <h4 className="f11-settings-title">Notifications</h4>
            </div>

            {/* Push */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <SystemLabel>Push Notifications</SystemLabel>
                <PixelBadge tone={isSubscribed ? 'success' : 'default'}>{isSubscribed ? 'ACTIVE' : 'OFF'}</PixelBadge>
              </div>
              <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--bt-text-muted)' }}>
                Receive proactive reminders from BakaSur when habits lapse, tasks are due, or milestones are reached.
              </p>
              <button type="button" disabled={pushBusy} onClick={async () => {
                const token = await getAccessToken(); if (!token) return;
                setPushBusy(true);
                if (isSubscribed) { await unsubscribeFromPush(token); setIsSubscribed(false); }
                else { const result = await subscribeToPush(token); if (result.success) setIsSubscribed(true); if (result.message) alert(result.message); }
                setPushBusy(false);
              }} className="btn-ghost self-start !py-1.5 !text-xs">
                {pushBusy ? '...' : isSubscribed ? 'Disable Push' : 'Enable Push'}
              </button>
            </div>

            {/* BakaSur Notifications */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <SystemLabel>BakaSur Notifications</SystemLabel>
                <PixelBadge tone={notifSettings?.enabled ? 'success' : 'default'}>{notifSettings?.enabled ? 'ACTIVE' : 'OFF'}</PixelBadge>
              </div>
              <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--bt-text-muted)' }}>
                Let BakaSur nudge you when habits lapse, tasks are due, or milestones are reached.
              </p>
              {notifLoading ? (
                <SystemLabel tone="muted">Loading settings…</SystemLabel>
              ) : notifSettings ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <SystemLabel tone="muted">Proactive reminders</SystemLabel>
                    <button type="button" disabled={notifSaving} onClick={() => handleNotifChange({ enabled: !notifSettings.enabled })} className="btn-ghost !py-1.5 !text-xs">
                      {notifSaving ? '...' : notifSettings.enabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <SystemLabel tone="muted">BakaSur personality</SystemLabel>
                    <select value={notifSettings.tone} onChange={e => handleNotifChange({ tone: e.target.value as NotifTone })} className="arcade-input !text-xs font-mono">
                      {NOTIF_TONES.map(t => <option key={t} value={t}>{TONE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={notifSettings.quiet_hours.enabled}
                        onChange={e => handleNotifChange({ quiet_hours: { ...notifSettings.quiet_hours, enabled: e.target.checked } })}
                        className="w-4 h-4 accent-[var(--bt-primary)]" />
                      <SystemLabel tone="muted">Quiet hours</SystemLabel>
                    </label>
                    {notifSettings.quiet_hours.enabled && (
                      <div className="flex items-center gap-2">
                        <input type="time" value={notifSettings.quiet_hours.start}
                          onChange={e => handleNotifChange({ quiet_hours: { ...notifSettings.quiet_hours, start: e.target.value } })}
                          className="arcade-input !text-xs font-mono" />
                        <SystemLabel tone="muted">to</SystemLabel>
                        <input type="time" value={notifSettings.quiet_hours.end}
                          onChange={e => handleNotifChange({ quiet_hours: { ...notifSettings.quiet_hours, end: e.target.value } })}
                          className="arcade-input !text-xs font-mono" />
                      </div>
                    )}
                  </div>
                  {notifError && <p className="m-0 text-[10px] font-mono" style={{ color: 'var(--bt-danger)' }}>{notifError}</p>}
                  {notifSaved && !notifError && <p className="m-0 text-[10px] font-mono" style={{ color: 'var(--bt-success)' }}>Saved ✓</p>}
                </>
              ) : notifError ? <p className="m-0 text-[10px] font-mono" style={{ color: 'var(--bt-danger)' }}>{notifError}</p> : null}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={requestClose} className="btn-ghost !text-sm">Cancel</button>
            <button type="submit" className="insert-coin !py-2 !px-4 !text-sm">Save preferences</button>
          </div>
        </form>

        {/* Data */}
        <div className="f11-settings-section">
          <div className="f11-settings-header">
            <span className="f11-settings-led" aria-hidden="true" />
            <h4 className="f11-settings-title">Data</h4>
          </div>

          <div className="flex items-center justify-between">
            <SystemLabel>Sync</SystemLabel>
            <SyncStatus />
          </div>
          <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--bt-text-muted)' }}>
            Your ledger is saved locally and pushed to your Worker whenever you're online.
          </p>

          <button type="button" onClick={() => { requestClose(); setTimeout(onRequestExport, 150); }}
            className="btn-ghost w-full justify-center !text-xs py-2">
            <Download className="w-4 h-4" style={{ color: 'var(--bt-primary)' }} aria-hidden="true" /> Export Life Report
          </button>

          <div className="flex flex-col gap-2">
            <button type="button" onClick={handleLoadDemoData} disabled={demoBusy || isGuest}
              className="btn-ghost w-full justify-center !text-xs py-2 disabled:opacity-50">
              <PixelIcon name="zap" size={14} color="var(--bt-primary)" className="mr-1" />
              {demoBusy ? 'Loading Trial Data...' : 'Load Trial Data'}
            </button>
            <SystemLabel tone="muted" className="text-center">Adds sample habits, tasks, journal entries and a note.</SystemLabel>
            {demoResult && (
              <p className={`text-[10px] font-mono text-center m-0 ${demoResult.ok ? '' : ''}`} style={{ color: demoResult.ok ? 'var(--bt-success)' : 'var(--bt-danger)' }}>
                {demoResult.message}
              </p>
            )}

            <button type="button" onClick={() => { requestClose(); setTimeout(() => startTour(), 300); }}
              className="btn-ghost w-full !text-xs py-2">
              <Play className="w-4 h-4" style={{ color: 'var(--bt-primary)' }} aria-hidden="true" /> Replay App Tour
            </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-3 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(248,113,113,0.2)' }}>
            <span className="text-xs font-black uppercase font-mono" style={{ color: 'var(--bt-danger)' }}>
              <PixelIcon name="squareAlert" size={12} className="mr-1" /> Danger Zone
            </span>

            <div className="flex flex-col gap-1.5">
              <SystemLabel>Clear Data Duration</SystemLabel>
              <select value={clearDays} onChange={e => setClearDays(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="arcade-input !text-xs font-mono">
                <option value={7}>Last 7 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value="all">All Time (Full Reset)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <SystemLabel>Type <code className="px-1 rounded font-bold" style={{ color: 'var(--bt-danger)', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>delete my data</code> to confirm:</SystemLabel>
              <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="delete my data" className="arcade-input !text-xs" />
            </div>

            <button type="button" disabled={deleteConfirmText !== 'delete my data' || resetBusy}
              onClick={async () => {
                if (deleteConfirmText !== 'delete my data') return;
                if (!window.confirm('Are you absolutely sure you want to delete ALL of your data? This cannot be undone.')) return;
                if (clearDays === 'all') { await handleFullReset(); }
                else { await clearDataByDays(clearDays); setDeleteConfirmText(''); requestClose(); }
              }}
              className="insert-coin w-full justify-center !text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, var(--bt-danger) 0%, #dc2626 100%)', borderColor: 'rgba(248,113,113,0.5)', color: '#fff' }}>
              {resetBusy ? 'Clearing…' : 'Clear Selected Data'}
            </button>
            {resetResult && <p className="text-[10px] font-mono text-center m-0" style={{ color: 'var(--bt-danger)' }}>{resetResult}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
