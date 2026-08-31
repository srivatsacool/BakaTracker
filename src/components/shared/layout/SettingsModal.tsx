import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, Play, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { SyncStatus } from '../../shell';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../../../services/push';
import {
  NOTIF_TONES, getNotificationSettings, updateNotificationSettings,
  type NotificationSettings, type NotifTone,
} from '../../../services/notificationSettings';
import { seedDemoData } from '../../../services/demoMode';
import type { ApiClient } from '../../../api/apiClient';
import { TONE_LABELS } from './constants';
import {
  BAKASUR_COLOR_HEXES, loadBakaSurPreferences, saveBakaSurPreferences,
  subscribeBakaSurPreferences, type BakaSurColorId, type BakaSurPresence,
  type BakaSurMotion, type BakaSurScale, type BakaSurProactiveFreq,
} from '../../../lib/baksurPreferences';
import { fetchAiSettings as fetchServerAiSettings, saveAiSettings as saveServerAiSettings } from '../../../services/assistantChat';
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
  /** V3.5: launches THE canonical walkthrough (replaces the intro.js tour). */
  onReplayWalkthrough: () => void;
  onClose: () => void;
  onRequestExport: () => void;
}

/**
 * SettingsModal — system control panel (V3.5 overhaul).
 *
 * Every control here changes real behavior. Removed in V3.5 as dead: the
 * 'Theme: Dark' badge (nothing reads bt_theme; the app is dark-only), the
 * Day/Night accent pickers (they wrote CSS vars with zero consumers), the
 * broken 'Reset Defaults' (reset to a swatch, not the defaults), and the
 * Cancel/Save ceremony around settings that already auto-save.
 *
 * Groups: ACCOUNT · BAKASUR · NOTIFICATIONS · DATA · ABOUT.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  user, isGuest, isAuthConfigured, login, logout, getAccessToken, apiClient,
  init, clearDataByDays, onReplayWalkthrough,
  onClose, onRequestExport,
}) => {
  const navigate = useNavigate();
  const [settingsClosing, setSettingsClosing] = useState(false);
  const settingsDialogRef = useFocusTrap<HTMLDivElement>(!settingsClosing, { onEscape: () => requestClose() });

  const requestClose = () => { setSettingsClosing(true); setTimeout(onClose, 150); };

  /* BakaSur preferences (device chrome — lives outside the ledger store) */
  const prefs = useSyncExternalStore(subscribeBakaSurPreferences, loadBakaSurPreferences, loadBakaSurPreferences);

  /* Push */
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => { isPushSubscribed().then(setIsSubscribed); }, []);

  /* Server-side BakaSur notification policy (real: engine.ts + policy.ts) */
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSaved, setNotifSaved] = useState(false);
  const notifSaveSeq = useRef(0);
  const notifLoading = !isGuest && !notifSettings && !notifError;

  /* AI quota (Phase 2B: userSelectedQuota capped by plan/host, server authoritative) */
  const [aiSettings, setAiSettings] = useState<{ ai_turns_per_day: number; effectiveQuota: number; planMax: number; hostCap?: number } | null>(null);
  const [aiQuota, setAiQuota] = useState<{ remaining: number; used: number; resetAt?: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSaved, setAiSaved] = useState(false);

  useEffect(() => {
    if (isGuest || !apiClient) return;
    let cancelled = false;
    fetchServerAiSettings(apiClient).then(res => {
      if (cancelled || !res) return;
      setAiSettings({ ai_turns_per_day: res.ai_turns_per_day, effectiveQuota: res.effectiveQuota, planMax: res.planMax, hostCap: res.hostCap });
      setAiQuota({ remaining: res.quota.remaining ?? 0, used: res.quota.used ?? 0, resetAt: (res.quota as any).resetAt });
    }).catch(() => { if (!cancelled) setAiError('Failed to load AI settings'); });
    return () => { cancelled = true; };
  }, [isGuest, apiClient]);

  const handleAiChange = async (nextVal: number) => {
    if (!apiClient || !aiSettings) return;
    setAiBusy(true); setAiError(null); setAiSaved(false);
    try {
      const res = await saveServerAiSettings(apiClient, nextVal);
      if (!res) throw new Error('no response');
      setAiSettings({ ai_turns_per_day: res.ai_turns_per_day, effectiveQuota: res.effectiveQuota, planMax: res.planMax, hostCap: res.hostCap });
      setAiQuota({ remaining: res.quota.remaining ?? 0, used: (res.quota as any).used ?? 0, resetAt: (res.quota as any).resetAt });
      setAiSaved(true);
      window.setTimeout(() => setAiSaved(false), 2500);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to save AI setting');
    } finally { setAiBusy(false); }
  };

  useEffect(() => {
    if (isGuest || !apiClient) return;
    let cancelled = false;
    getNotificationSettings(apiClient).then(s => { if (!cancelled) setNotifSettings(s); })
      .catch(e => { if (!cancelled) setNotifError(`Failed to load settings — ${e instanceof Error ? e.message : 'unknown error'}`); });
    return () => { cancelled = true; };
  }, [isGuest, apiClient]);

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

  /* Trial data (authenticated accounts only — server seed) */
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

  /* Danger zone */
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

        {/* ── ACCOUNT ── */}
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

        {/* ── BAKASUR (V3.5: real controls wired to the presence renderer) ── */}
        <div className="f11-settings-section">
          <div className="f11-settings-header">
            <span className="f11-settings-led" aria-hidden="true" />
            <h4 className="f11-settings-title">BakaSur</h4>
          </div>
          <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--bt-text-muted)' }}>
            Your companion's look and presence. Changes apply instantly on this device.
          </p>

          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <SystemLabel>Color</SystemLabel>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="BakaSur color">
              {(Object.keys(BAKASUR_COLOR_HEXES) as BakaSurColorId[]).map(id => {
                const active = prefs.color === id;
                return (
                  <button key={id} type="button" role="radio" aria-checked={active}
                    onClick={() => saveBakaSurPreferences({ color: id })}
                    className="w-11 h-11 rounded-xl cursor-pointer transition hover:scale-105"
                    style={{
                      background: `radial-gradient(circle at 32% 26%, ${BAKASUR_COLOR_HEXES[id].mood} 0%, rgba(0,0,0,0) 68%), #1a1625`,
                      border: `2px solid ${active ? 'var(--bt-primary)' : 'var(--bt-border)'}`,
                      boxShadow: active ? '0 0 10px rgba(139,92,246,0.35)' : 'none',
                    }}
                    aria-label={BAKASUR_COLOR_HEXES[id].label} title={BAKASUR_COLOR_HEXES[id].label}
                  />
                );
              })}
            </div>
          </div>

          {/* Presence */}
          <div className="flex flex-col gap-1.5">
            <SystemLabel>Presence</SystemLabel>
            <Segmented
              value={prefs.presence}
              options={[
                { id: 'normal', label: 'Normal' },
                { id: 'subtle', label: 'Subtle' },
                { id: 'hidden', label: 'Hidden' },
              ]}
              onChange={(v) => saveBakaSurPreferences({ presence: v as BakaSurPresence })}
              hint="Hidden removes the floating companion; the chat stays reachable from the header ⌘K-style pill."
            />
          </div>

          {/* Motion */}
          <div className="flex flex-col gap-1.5">
            <SystemLabel>Animation</SystemLabel>
            <Segmented
              value={prefs.motion}
              options={[
                { id: 'full', label: 'Full' },
                { id: 'reduced', label: 'Reduced' },
              ]}
              onChange={(v) => saveBakaSurPreferences({ motion: v as BakaSurMotion })}
              hint="Reduced freezes ambient motion; reactions still change pose. Your system-level reduced-motion setting always wins."
            />
          </div>

          {/* Scale */}
          <div className="flex flex-col gap-1.5">
            <SystemLabel>Scale</SystemLabel>
            <Segmented
              value={prefs.scale}
              options={[
                { id: 'small', label: 'Small' },
                { id: 'standard', label: 'Standard' },
                { id: 'large', label: 'Large' },
              ]}
              onChange={(v) => saveBakaSurPreferences({ scale: v as BakaSurScale })}
              hint="Hero size on your screen — clamped safely on phones."
            />
          </div>

          {/* Proactive message frequency */}
          <div className="flex flex-col gap-1.5">
            <SystemLabel>Messages</SystemLabel>
            <Segmented
              value={prefs.proactiveFrequency}
              options={[
                { id: '10s', label: '10s' },
                { id: '30s', label: '30s' },
                { id: '1m', label: '1m' },
                { id: '5m', label: '5m' },
                { id: 'off', label: 'Off' },
              ]}
              onChange={(v) => saveBakaSurPreferences({ proactiveFrequency: v as BakaSurProactiveFreq })}
              hint="How often BakaSur can proactively speak. Off silences in-app nudges entirely."
            />
          </div>

          {/* Phase 2B: AI quota — user-controlled daily turns capped by plan/host (server authoritative) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <SystemLabel>BakaSur AI turns/day</SystemLabel>
              {aiSettings && <PixelBadge tone={aiQuota && aiQuota.remaining === 0 ? 'danger' : 'success'}>{aiQuota ? `${aiQuota.remaining} left` : `${aiSettings.effectiveQuota}/day`}</PixelBadge>}
            </div>
            {isGuest ? (
              <SystemLabel tone="muted">Sign in to configure AI turns. Demo is limited to 3 turns/session.</SystemLabel>
            ) : !aiSettings ? (
              <SystemLabel tone="muted">{aiBusy ? 'Loading AI settings…' : aiError ? aiError : 'Loading…'}</SystemLabel>
            ) : (
              <>
                <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--bt-text-muted)' }}>
                  Your plan allows up to <b style={{ color: 'var(--bt-text)' }}>{aiSettings.planMax}</b> turns/day{aiSettings.hostCap !== undefined ? ` (host cap ${aiSettings.hostCap})` : ''}. Effective: <b style={{ color: 'var(--bt-text)' }}>{aiSettings.effectiveQuota}/day</b>. Server is authoritative — client cannot exceed the ceiling.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={aiSettings.planMax}
                    value={aiSettings.ai_turns_per_day}
                    onChange={e => handleAiChange(Number(e.target.value))}
                    disabled={aiBusy}
                    className="flex-1 accent-[var(--bt-primary)]"
                    aria-label="AI turns per day"
                  />
                  <span className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: 'var(--bt-text)', minWidth: 44, textAlign: 'center' }}>
                    {aiSettings.ai_turns_per_day}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={aiSettings.ai_turns_per_day}
                    onChange={e => handleAiChange(Number(e.target.value))}
                    disabled={aiBusy}
                    className="arcade-input !text-xs font-mono flex-1"
                    aria-label="AI turns per day (select)"
                  >
                    {[1,5,10,15,20,25,30].filter(v => v <= aiSettings.planMax).concat(aiSettings.planMax > 30 ? [aiSettings.planMax] : []).filter((v,i,a) => a.indexOf(v)===i).sort((a,b)=>a-b).map(v => (
                      <option key={v} value={v}>{v} turns/day</option>
                    ))}
                    {!([1,5,10,15,20,25,30, aiSettings.planMax].includes(aiSettings.ai_turns_per_day)) && (
                      <option value={aiSettings.ai_turns_per_day}>{aiSettings.ai_turns_per_day} turns/day (custom)</option>
                    )}
                  </select>
                  {aiBusy && <span className="font-mono text-[10px]" style={{ color: 'var(--bt-text-muted)' }}>Saving…</span>}
                </div>
                {aiQuota && <p className="m-0 text-[10px] font-mono" style={{ color: 'var(--bt-text-muted)' }}>Today: {aiQuota.used} used · {aiQuota.remaining} remaining{aiQuota.resetAt ? ` · resets ${new Date(aiQuota.resetAt).toLocaleTimeString()}` : ''}</p>}
                {aiError && <p className="m-0 text-[10px] font-mono" style={{ color: 'var(--bt-danger)' }}>{aiError}</p>}
                {aiSaved && !aiError && <p className="m-0 text-[10px] font-mono" style={{ color: 'var(--bt-success)' }}>Saved ✓ — effective {aiSettings.effectiveQuota}/day</p>}
              </>
            )}
          </div>
        </div>

        {/* ── NOTIFICATIONS (server-side policy; auto-saves) ── */}
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
              Device alerts from your scheduled reminders.
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

          {/* BakaSur proactive reminders (real: engine.ts + policy.ts) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <SystemLabel>BakaSur Reminders</SystemLabel>
              <PixelBadge tone={notifSettings?.enabled ? 'success' : 'default'}>{notifSettings?.enabled ? 'ACTIVE' : 'OFF'}</PixelBadge>
            </div>
            <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--bt-text-muted)' }}>
              Scheduled nudges when habits lapse, tasks are due, or milestones land.
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
          {isGuest && (
            <SystemLabel tone="muted">Notifications require sign-in.</SystemLabel>
          )}
        </div>

        {/* ── DATA ── */}
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
            <SystemLabel tone="muted" className="text-center">Adds a sample set to your signed-in account (server-side).</SystemLabel>
            {demoResult && (
              <p className="text-[10px] font-mono text-center m-0" style={{ color: demoResult.ok ? 'var(--bt-success)' : 'var(--bt-danger)' }}>
                {demoResult.message}
              </p>
            )}

            <button type="button" onClick={() => { requestClose(); setTimeout(() => onReplayWalkthrough(), 300); }}
              className="btn-ghost w-full !text-xs py-2">
              <Play className="w-4 h-4" style={{ color: 'var(--bt-primary)' }} aria-hidden="true" /> Replay Walkthrough
            </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-3 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(248,113,113,0.2)' }}>
            <span className="text-xs font-black uppercase font-mono" style={{ color: 'var(--bt-danger)' }}>
              <PixelIcon name="squareAlert" size={12} className="mr-1" /> Danger Zone
            </span>

            <div className="flex flex-col gap-1.5">
              <SystemLabel>Delete Recent Activity</SystemLabel>
              <select value={clearDays} onChange={e => setClearDays(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="arcade-input !text-xs font-mono">
                <option value={7}>The last 7 days</option>
                <option value={14}>The last 14 days</option>
                <option value={30}>The last 30 days</option>
                <option value="all">Everything (full account reset)</option>
              </select>
              <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--bt-text-muted)' }}>
                Deletes logs, events and completions from the most recent window. Older history is kept. Everything resets cannot be undone.
              </p>
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

        {/* ── ABOUT ── */}
        <div className="f11-settings-section">
          <div className="f11-settings-header">
            <span className="f11-settings-led" aria-hidden="true" />
            <h4 className="f11-settings-title">About</h4>
          </div>
          <p className="m-0 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--bt-text-muted)' }}>
            BakaTracker — a personal life OS built by Build.Srivatsa. Your life, slotted like a cartridge; your companion, watching the save file.
          </p>
          <SystemLabel tone="muted">v3.5 · local-first · Cloudflare-ready</SystemLabel>
        </div>
      </div>
    </div>
  );
};

/** Compact segmented control — shared shape for presence/motion/scale. */
const Segmented: React.FC<{
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  hint?: string;
}> = ({ value, options, onChange, hint }) => (
  <div className="flex flex-col gap-1">
    <div className="flex gap-1 rounded-xl p-1" role="radiogroup" style={{ background: 'rgba(233,230,242,0.04)', border: '1px solid var(--bt-border-soft)' }}>
      {options.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={active}
            onClick={() => onChange(o.id)}
            className="flex-1 font-mono text-[10px] uppercase py-2 rounded-lg cursor-pointer transition"
            style={{
              background: active ? 'rgba(139,92,246,0.16)' : 'transparent',
              color: active ? 'var(--bt-text)' : 'var(--bt-text-muted)',
              border: `1px solid ${active ? 'rgba(139,92,246,0.5)' : 'transparent'}`,
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
    {hint && <p className="m-0 text-[9px] leading-relaxed font-mono" style={{ color: 'var(--bt-text-disabled)' }}>{hint}</p>}
  </div>
);
