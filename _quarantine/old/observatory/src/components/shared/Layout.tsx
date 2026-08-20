import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Flame, ListTodo, Target, BookOpen, Compass, Settings as SettingsIcon, X, Sun, Moon, ChevronLeft, ChevronRight, Download, LayoutGrid, Zap, Play, Shield, NotebookPen } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { calculateDailyScore, getTodayDateString } from '../../lib/utils';
import { OnboardingBanner } from './OnboardingBanner';
import { UserMenu } from '../user/UserMenu';
import { useAuth } from '../../features/auth';
import { authConfig } from '../../features/auth/config';
import { useApiClient } from '../../api/authFetch';
import { seedDemoData } from '../../services/demoMode';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '../../services/push';
import { NOTIF_TONES, getNotificationSettings, updateNotificationSettings, type NotificationSettings, type NotifTone } from '../../services/notificationSettings';
import { FirstRunWizard } from './FirstRunWizard';
import { FirstRunSetup } from './FirstRunSetup';
import { useAppTour } from '../../lib/useAppTour';
import { BakaSurRail, ContextBar, SyncStatus, OfflineBanner } from '../shell';

const TONE_LABELS: Record<NotifTone, string> = {
  gentle: 'Gentle',
  motivational: 'Motivational',
  funny: 'Funny',
  tsundere: 'Tsundere',
  savage: 'Savage',
  celebratory: 'Celebratory',
};

/** Tool → instrument tone (the observatory color coding). */
const NAV_TONES: Record<string, string> = {
  '/today': 'var(--arcade-gold)',
  '/habits': 'var(--arcade-green)',
  '/tasks': 'var(--arcade-red)',
  '/eisenhower': 'var(--arcade-orange)',
  '/journal': 'var(--arcade-magenta)',
  '/journey': 'var(--arcade-cobalt)',
  '/notes': 'var(--arcade-magenta)',
};

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { startTour } = useAppTour(navigate);
  const { stats, settings, habits, habitLogs, tasks, journal, theme, toggleTheme, setAccentColors, loadDemoData, clearDataByDays } = useStore();
  const { user, login, getAccessToken } = useAuth();
    const apiClient = useApiClient();
    const init = useStore((s) => s.init);
    const isGuest = user?.provider === 'guest';
  const isAuthConfigured = Boolean(authConfig.domain && authConfig.clientId);

  const todayStr = getTodayDateString();
  const dailyScore = calculateDailyScore(todayStr, habits, habitLogs, tasks, journal);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inputAccentLight, setInputAccentLight] = useState(settings.accent_color_light || '#6F5BD8');
  const [inputAccentDark, setInputAccentDark] = useState(settings.accent_color_dark || '#6F5BD8');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('bt_sidebar_collapsed') === 'true';
  });
  const [isAssistantCollapsed, setIsAssistantCollapsed] = useState(() => {
    return localStorage.getItem('bt_assistant_collapsed') === 'true';
  });

  const [clearDays, setClearDays] = useState<number | 'all'>(7);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  // BakaSur notification settings (master opt-in, tone, quiet hours).
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSaved, setNotifSaved] = useState(false);
  const notifSaveSeq = useRef(0);

  // Derived: a fetch is in flight while the modal is open with nothing loaded
  // yet and no load failure (guests never fetch, so they never see this).
  const notifLoading = showSettingsModal && !isGuest && !notifSettings && !notifError;

  // Check push subscription status on mount.
  useEffect(() => {
    isPushSubscribed().then(setIsSubscribed);
  }, []);

  // Settings modal opener — resets the BakaSur notification settings so the
  // fetch below shows a fresh loading state on every open (and on reopen after
  // a previous load failure, which doubles as a retry).
  const openSettingsModal = () => {
    setNotifSettings(null);
    setNotifError(null);
    setShowSettingsModal(true);
  };

  // Fetch notification settings whenever the settings modal opens — but only
  // for authenticated users; guests have no backend account to persist
  // preferences for (mirrors the guest guard used elsewhere in this file).
  // setState runs only in async callbacks (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!showSettingsModal || isGuest || !apiClient) return;
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
  }, [showSettingsModal, isGuest, apiClient]);

  // PWA & Offline State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Auto-load demo data for guest users exploring the app
  useEffect(() => {
    if (isGuest && habits.length === 0) {
      loadDemoData();
    }
  }, [isGuest, habits.length, loadDemoData]);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleToggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('bt_sidebar_collapsed', String(next));
  };

  const handleToggleAssistant = () => {
    const next = !isAssistantCollapsed;
    setIsAssistantCollapsed(next);
    localStorage.setItem('bt_assistant_collapsed', String(next));
  };

  const navItems = [
    { path: '/today', name: 'Today', icon: Target },
    { path: '/habits', name: 'Habits', icon: Flame },
    { path: '/tasks', name: 'Tasks', icon: ListTodo },
    { path: '/eisenhower', name: 'Matrix', icon: LayoutGrid },
    { path: '/journal', name: 'Journal', icon: BookOpen },
    { path: '/journey', name: 'Journey', icon: Compass },
    { path: '/notes', name: 'Notes', icon: NotebookPen }
  ];

  // Editor-route flush mode: /notes/:pageId hands the whole viewport to the
  // Excalidraw canvas (no padded main, no mobile bottom nav overlap).
  const isEditorRoute = /^\/notes\/[^/]+/.test(location.pathname);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setAccentColors(inputAccentLight, inputAccentDark);
    setShowSettingsModal(false);
  };

  const handleResetColors = () => {
    setInputAccentLight('#6F5BD8');
    setInputAccentDark('#6F5BD8');
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

  // Phase 3: First-run gate for authenticated accounts with no data yet.
  // A brand-new Google user lands here (empty D1) and chooses a starting
  // persona; guest/demo mode keeps the legacy wizard/demo seeding path.
  const isFirstRunEmpty =
    !isGuest &&
    habits.length === 0 &&
    tasks.length === 0 &&
    journal.length === 0 &&
    localStorage.getItem('bt_first_run') !== 'done';

  if (isFirstRunEmpty) {
    return <FirstRunSetup />;
  }

  return (
    <div className="min-h-screen text-text-primary flex flex-col md:flex-row app-canvas" style={{ position: 'relative', zIndex: 1 }}>
      <div className={`app-shell-frame ${isAssistantCollapsed ? 'assistant-collapsed' : ''}`}>
      {/* Desktop Sidebar — the instrument rail */}
      <aside
        className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} p-4 transition-all duration-300 shrink-0 justify-between relative border-r`}
        style={{
          background: 'linear-gradient(180deg, #14101f 0%, #0d0b16 40%, #08070f 100%)',
          borderColor: 'rgba(242,242,242,0.07)',
          boxShadow: 'inset -1px 0 0 rgba(111, 91, 216,0.04)',
        }}
      >
        {/* Toggle Sidebar Collapse Button */}
        <button
          onClick={handleToggleCollapse}
          className="absolute top-4 -right-3.5 rounded-full p-1 transition hidden md:block z-10 cursor-pointer"
          style={{
            background: 'rgba(111, 91, 216, 0.12)',
            border: '1px solid rgba(111, 91, 216, 0.3)',
            boxShadow: '0 0 16px rgba(111, 91, 216, 0.2)',
          }}
          title={isCollapsed ? "Expand Cabinet Row" : "Collapse Cabinet Row"}
          aria-label={isCollapsed ? "Expand cabinet row" : "Collapse cabinet row"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" style={{ color: 'var(--arcade-gold)' }} /> : <ChevronLeft className="w-4 h-4" style={{ color: 'var(--arcade-gold)' }} />}
        </button>

        <div className="flex flex-col gap-6">
          {/* Logo / Marquee */}
          <div id="sidebar-logo" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} transition-all`}>
            <div className="relative shrink-0">
              <img src="/logo.png" alt="BakaTracker Logo" className="w-10 h-10 rounded-xl object-cover" style={{ border: '1px solid rgba(111, 91, 216,0.35)', boxShadow: '0 0 20px rgba(111, 91, 216,0.25)' }} />
            </div>
            {!isCollapsed && (
              <div className="transition-all duration-300 min-w-0">
                <h1 className="marquee-title text-xl m-0 leading-none" style={{ color: 'var(--arcade-paper)' }}>BakaTracker</h1>
                <span className="font-mono text-[10px]" style={{ color: 'var(--arcade-gold)' }}>OBSERVATORY · DOME 01</span>
              </div>
            )}
          </div>

          {/* Status Card (character stats) */}
          <div
            id="sidebar-level-bar"
            className={`cabinet ${isCollapsed ? 'p-2 items-center flex flex-col gap-2.5' : 'p-4 flex flex-col gap-3'} transition-all`}
            style={{ borderColor: 'rgba(111, 91, 216,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(242,242,242,0.05)', background: 'linear-gradient(180deg, rgba(111, 91, 216,0.07) 0%, rgba(63,123,255,0.03) 100%)' }}
          >
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2.5">
                <span
                  className="font-bold font-mono text-xs px-1.5 py-0.5 rounded score-readout"
                  style={{ color: 'var(--arcade-gold)', border: '1px solid rgba(111, 91, 216,0.4)', background: 'rgba(111, 91, 216,0.12)', boxShadow: '0 0 12px rgba(111, 91, 216,0.2)' }}
                  title={`Level ${stats.level}`}
                >
                  L{stats.level}
                </span>

                {/* Save lamp */}
                <SyncStatus compact />

                {/* Theme Toggle */}
                <button
                  onClick={() => toggleTheme()}
                  className="p-1.5 rounded border transition hover:scale-105 cursor-pointer"
                  style={{ border: '1px solid rgba(242,242,242,0.15)', background: 'rgba(242,242,242,0.04)' }}
                  title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                >
                  {theme === 'light' ? <Moon className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} /> : <Sun className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} />}
                </button>

                {/* Settings Toggle */}
                <button
                  id="settings-btn-collapsed"
                  onClick={() => {
                    setInputAccentLight(settings.accent_color_light || '#6F5BD8');
                    setInputAccentDark(settings.accent_color_dark || '#6F5BD8');
                    openSettingsModal();
                  }}
                  className="p-1.5 rounded border transition hover:scale-105 cursor-pointer"
                  style={{ border: '1px solid rgba(242,242,242,0.15)', background: 'rgba(242,242,242,0.04)' }}
                  title="Settings"
                >
                  <SettingsIcon className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} />
                </button>

                {/* User Menu / Sign In */}
                {isGuest ? (
                  <button
                    onClick={() => login()}
                    className="p-1.5 rounded transition cursor-pointer hover:scale-105"
                    style={{ background: 'linear-gradient(180deg, var(--arcade-gold) 0%, var(--arcade-gold-deep) 100%)', border: '1px solid rgba(111, 91, 216,0.5)', boxShadow: '0 0 16px rgba(111, 91, 216,0.3)' }}
                    title="Sign In to carry your save across devices"
                  >
                    <Shield className="w-3.5 h-3.5" style={{ color: '#17121c' }} />
                  </button>
                ) : (
                  <UserMenu />
                )}
              </div>

            ) : (
              // Expanded Status Card layout
              <>
                <div className="flex justify-between items-center">
                  <span
                    className="font-bold font-mono text-sm px-2 py-0.5 rounded score-readout"
                    style={{ color: 'var(--arcade-gold)', border: '1px solid rgba(111, 91, 216,0.4)', background: 'rgba(111, 91, 216,0.12)', boxShadow: '0 0 12px rgba(111, 91, 216,0.2)' }}
                  >
                    LVL {stats.level}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Theme Toggle */}
                    <button
                      onClick={() => toggleTheme()}
                      className="p-1.5 rounded transition hover:scale-105 cursor-pointer"
                      style={{ border: '1px solid rgba(242,242,242,0.15)', background: 'rgba(242,242,242,0.04)' }}
                      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                    >
                      {theme === 'light' ? <Moon className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} /> : <Sun className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} />}
                    </button>

                    <SyncStatus />

                    {/* Settings Trigger */}
                    <button
                      id="settings-btn"
                      onClick={() => {
                        setInputAccentLight(settings.accent_color_light || '#6F5BD8');
                        setInputAccentDark(settings.accent_color_dark || '#6F5BD8');
                        openSettingsModal();
                      }}
                      className="p-1.5 rounded transition hover:scale-105 cursor-pointer"
                      style={{ border: '1px solid rgba(242,242,242,0.15)', background: 'rgba(242,242,242,0.04)' }}
                      title="Settings"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} />
                    </button>

                    {/* User Menu / Sign In */}
                    {isGuest ? (
                      <button
                        onClick={() => login()}
                        className="p-1.5 rounded transition cursor-pointer hover:scale-105"
                        style={{ background: 'linear-gradient(180deg, var(--arcade-gold) 0%, var(--arcade-gold-deep) 100%)', border: '1px solid rgba(111, 91, 216,0.5)', boxShadow: '0 0 16px rgba(111, 91, 216,0.3)' }}
                        title="Sign In to carry your save across devices"
                      >
                        <Shield className="w-3.5 h-3.5" style={{ color: '#17121c' }} />
                      </button>
                    ) : (
                      <UserMenu />
                    )}
                  </div>

                </div>

                {/* XP Save Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="score-readout" style={{ color: 'var(--arcade-paper-dim)' }}>XP</span>
                    <span className="score-readout" style={{ color: 'var(--arcade-gold)' }}>{stats.xp} / {settings.xp_per_level}</span>
                  </div>
                  <div
                    className="w-full h-2.5 rounded-full overflow-hidden relative"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(111, 91, 216,0.2)' }}
                  >
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(stats.xp / settings.xp_per_level) * 100}%`,
                        background: 'linear-gradient(90deg, var(--arcade-gold-deep) 0%, var(--arcade-gold) 100%)',
                        boxShadow: '0 0 12px rgba(111, 91, 216, 0.5)',
                      }}
                    />
                  </div>
                </div>

                {/* Day Progress — the day's clear count */}
                <div id="sidebar-day-progress" className="flex justify-between items-center mt-1 pt-2" style={{ borderTop: '1px solid rgba(242,242,242,0.08)' }}>
                  <span className="text-xs font-bold font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>Sky Clear:</span>
                  <span
                    className={`text-sm font-black font-mono px-2.5 py-0.5 rounded-full score-readout ${
                      dailyScore >= 80
                        ? 'text-success'
                        : dailyScore >= 40
                          ? 'text-arcade-gold'
                          : 'text-danger'
                    }`}
                    style={{
                      background:
                        dailyScore >= 80
                          ? 'rgba(61, 220, 132, 0.12)'
                          : dailyScore >= 40
                            ? 'rgba(111, 91, 216, 0.12)'
                            : 'rgba(255, 59, 92, 0.12)',
                      borderColor:
                        dailyScore >= 80
                          ? 'rgba(61, 220, 132, 0.4)'
                          : dailyScore >= 40
                            ? 'rgba(111, 91, 216, 0.4)'
                            : 'rgba(255, 59, 92, 0.4)',
                    }}
                  >
                    {dailyScore}%
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Demo Mode Banner (sidebar) */}
          {isGuest && !isCollapsed && (
            <div
              className="px-3 py-2.5 rounded-xl flex items-center gap-2.5"
              style={{
                background: 'rgba(111, 91, 216, 0.06)',
                border: '1px solid rgba(111, 91, 216, 0.25)',
                boxShadow: '0 0 20px rgba(111, 91, 216, 0.06)',
              }}
            >
              <div
                className="p-1 rounded-lg shrink-0"
                style={{
                  background: 'rgba(111, 91, 216, 0.15)',
                  border: '1px solid rgba(111, 91, 216, 0.4)',
                }}
              >
                <Zap className="w-3 h-3" style={{ color: 'var(--arcade-gold)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-[10px] leading-tight uppercase m-0" style={{ color: 'var(--arcade-gold)' }}>First Light</p>
                <p className="font-mono text-[9px] leading-tight mt-0.5 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>
                  Exploring with sample data.
                  {isAuthConfigured ? (
                    <button onClick={() => login()} className="ml-1 underline font-bold cursor-pointer" style={{ color: 'var(--arcade-gold)' }}>
                      Sign in to sync
                    </button>
                  ) : (
                    ' Data stays local.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Navigation — the cabinets on the row */}
          <nav className="flex flex-col gap-2" aria-label="Main navigation">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || (item.path === '/today' && location.pathname === '/');
              const itemId = item.path === '/eisenhower' ? 'nav-eisenhower' : `nav-${item.name.toLowerCase()}`;
              const tone = NAV_TONES[item.path] || 'var(--arcade-paper-dim)';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  id={itemId}
                  title={item.name}
                  className={`cabinet-nav-item ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} ${isActive ? 'is-active' : ''}`}
                  style={{ '--nav-color': tone } as React.CSSProperties}
                >
                  <span className="nav-led" aria-hidden="true" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}

            {/* Desktop PWA Install — a new cabinet */}
            {deferredPrompt && (
              <button
                onClick={handleInstallPWA}
                className={`cabinet-nav-item ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} mt-2 cursor-pointer`}
                style={{ '--nav-color': 'var(--arcade-gold)', background: 'rgba(111, 91, 216,0.06)' } as React.CSSProperties}
                title="Install BakaTracker Desktop App"
              >
                <Download className="w-4 h-4 shrink-0" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
                {!isCollapsed && <span>Install App</span>}
              </button>
            )}
          </nav>
        </div>

        {/* Footer — the save file stamp */}
        {!isCollapsed && (
          <div
            className="text-center text-[11px] font-mono mt-auto pt-4 transition-all duration-300"
            style={{ color: 'var(--arcade-paper-disabled)', borderTop: '1px solid rgba(242,242,242,0.07)' }}
          >
            <p className="m-0">BakaTracker v2.2 · OBSERVING</p>
            <p className="font-bold mt-1 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Made by build.srivatsa</p>
          </div>
        )}
      </aside>

      {/* Mobile Header & Bottom Navigation */}
      <div className={`md:hidden flex flex-col w-full ${isEditorRoute ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        {/* Mobile Header */}
        <header
          className="p-4 flex items-center justify-between sticky top-0 z-50 border-b"
          style={{
            background: 'linear-gradient(180deg, #14101f 0%, #0d0b16 100%)',
            borderColor: 'rgba(111, 91, 216,0.15)',
          }}
        >
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="BakaTracker Logo" className="w-8 h-8 rounded-lg object-cover" style={{ border: '1px solid rgba(111, 91, 216,0.3)', boxShadow: '0 0 14px rgba(111, 91, 216,0.2)' }} />
            <h1 className="marquee-title text-lg m-0" style={{ color: 'var(--arcade-paper)' }}>BakaTracker</h1>
          </div>

          {/* Character Quick Info */}
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-xs font-bold px-1.5 py-0.5 rounded score-readout"
              style={{ color: 'var(--arcade-gold)', border: '1px solid rgba(111, 91, 216,0.4)', background: 'rgba(111, 91, 216,0.12)' }}
            >
              LVL {stats.level}
            </span>
            <div
              className="w-16 h-2 rounded-full overflow-hidden relative"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(111, 91, 216,0.2)' }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${(stats.xp / settings.xp_per_level) * 100}%`,
                  background: 'linear-gradient(90deg, var(--arcade-gold-deep), var(--arcade-gold))',
                  boxShadow: '0 0 8px rgba(111, 91, 216, 0.5)',
                }}
              />
            </div>

            {/* PWA Install Button (Mobile) */}
            {deferredPrompt && (
              <button
                onClick={handleInstallPWA}
                className="p-1 rounded cursor-pointer"
                style={{ border: '1px solid rgba(111, 91, 216,0.35)', background: 'rgba(111, 91, 216,0.1)' }}
                title="Install BakaTracker App"
              >
                <Download className="w-3.5 h-3.5" style={{ color: 'var(--arcade-gold)' }} />
              </button>
            )}

            {/* Mobile Theme Toggle */}
            <button
              onClick={() => toggleTheme()}
              className="p-1 rounded cursor-pointer"
              style={{ border: '1px solid rgba(242,242,242,0.15)', background: 'rgba(242,242,242,0.04)' }}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} /> : <Sun className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} />}
            </button>

            <button
              onClick={() => {
                setInputAccentLight(settings.accent_color_light || '#6F5BD8');
                setInputAccentDark(settings.accent_color_dark || '#6F5BD8');
                openSettingsModal();
              }}
              className="p-1 rounded cursor-pointer"
              style={{ border: '1px solid rgba(242,242,242,0.15)', background: 'rgba(242,242,242,0.04)' }}
              title="Settings"
            >
              <SettingsIcon className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} />
            </button>

            {/* User Menu / Sign In */}
            {isGuest ? (
              <button
                onClick={() => login()}
                className="p-1 rounded cursor-pointer"
                style={{ background: 'linear-gradient(180deg, var(--arcade-gold) 0%, var(--arcade-gold-deep) 100%)', border: '1px solid rgba(111, 91, 216,0.5)' }}
                title="Sign In to carry your save across devices"
              >
                <Shield className="w-3.5 h-3.5" style={{ color: '#17121c' }} />
              </button>
            ) : (
              <UserMenu />
            )}
          </div>
        </header>

        {/* Offline Banner */}
        {isOffline && <OfflineBanner />}

        {/* Scrollable Container */}
        <main className={`flex-1 ${isEditorRoute ? 'overflow-hidden p-0 min-h-0' : 'overflow-y-auto pb-24 p-4'}`}>
          {!isEditorRoute && (
            <ContextBar
              isOffline={isOffline}
              onToggleAssistant={handleToggleAssistant}
              assistantCollapsed={isAssistantCollapsed}
            />
          )}
          <OnboardingBanner />
          <Outlet />
        </main>

        {/* Mobile Navigation Bar (hidden on editor routes so it doesn't overlap the canvas) */}
        {!isEditorRoute && (
          <nav
            className="cabinet-nav-mobile"
            style={{
              borderColor: 'rgba(111, 91, 216, 0.15)',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
            }}
            aria-label="Mobile navigation"
          >
          {navItems.map(item => {
            const isActive = location.pathname === item.path || (item.path === '/today' && location.pathname === '/');
            const Icon = item.icon;
            const tone = NAV_TONES[item.path] || 'var(--arcade-paper-disabled)';
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-3 py-1.5 rounded-xl transition-all active:scale-95 no-underline ${
                  isActive ? '' : ''
                }`}
                style={{
                  background: isActive ? 'rgba(111, 91, 216,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(111, 91, 216,0.35)' : '1px solid transparent',
                  boxShadow: isActive ? '0 0 16px rgba(111, 91, 216,0.18)' : 'none',
                }}
              >
                <Icon className="w-5 h-5" style={{ color: isActive ? tone : 'var(--arcade-paper-disabled)' }} />
                <span className="text-[10px] font-bold font-mono mt-0.5" style={{ color: isActive ? 'var(--arcade-paper-dim)' : 'var(--arcade-paper-disabled)' }}>{item.name}</span>
              </Link>
            );
          })}
          </nav>
        )}
      </div>

      {/* Desktop Main Content Container */}
      <main className={`hidden md:block flex-1 h-screen ${isEditorRoute ? 'overflow-hidden p-0' : 'overflow-y-auto p-8'} bg-transparent`}>
        {isOffline && <OfflineBanner />}
        {!isEditorRoute && (
          <ContextBar
            isOffline={isOffline}
            onToggleAssistant={handleToggleAssistant}
            assistantCollapsed={isAssistantCollapsed}
          />
        )}
        <OnboardingBanner />
        <Outlet />
      </main>
      <BakaSurRail collapsed={isAssistantCollapsed} onToggle={handleToggleAssistant} />
      </div>

      {/* Settings Modal (Bottom Sheet on Mobile) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center max-sm:items-end p-0 sm:p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="glass-strong p-6 w-full max-w-md flex flex-col gap-4 max-sm:rounded-b-none max-sm:rounded-t-2xl max-h-[90vh] overflow-y-auto"
            style={{ color: 'var(--arcade-paper)' }}
          >
            <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid rgba(242,242,242,0.1)' }}>
              <h3 className="text-lg font-bold flex items-center gap-2 m-0">
                <SettingsIcon className="w-5 h-5" style={{ color: 'var(--arcade-gold)' }} />
                <span>BakaTracker Settings</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="icon-button"
                aria-label="Close settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs leading-relaxed font-mono m-0" style={{ color: 'var(--arcade-paper-muted)' }}>
              Your workspace is local-first. Sign in only when you want to sync this journey to your own BakaTracker Worker; the arcade and its daily actions remain available offline.
            </p>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              {/* Accent Color Config Pickers */}
              <div className="flex flex-col gap-3 pt-3" style={{ borderTop: '1px solid rgba(242,242,242,0.08)' }}>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black font-mono" style={{ color: 'var(--arcade-paper-dim)' }}>Aurora Accent Colors</label>
                  <button
                    type="button"
                    onClick={handleResetColors}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer transition"
                    style={{ border: '1px solid rgba(242,242,242,0.15)', background: 'rgba(242,242,242,0.05)' }}
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
                      placeholder="#6F5BD8"
                      className="arcade-input !text-xs w-24 uppercase font-mono py-1 px-2 shrink-0"
                      maxLength={7}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      required
                    />
                    <div className="flex gap-1.5 ml-auto overflow-x-auto no-scrollbar py-1">
                      {['#6F5BD8', '#5A8CFF', '#5FD8C4', '#E86A9A', '#FF6B6B', '#E8B45A'].map(c => (
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
                      placeholder="#6F5BD8"
                      className="arcade-input !text-xs w-24 uppercase font-mono py-1 px-2 shrink-0"
                      maxLength={7}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      required
                    />
                    <div className="flex gap-1.5 ml-auto overflow-x-auto no-scrollbar py-1">
                      {['#6F5BD8', '#5A8CFF', '#5FD8C4', '#E86A9A', '#FF6B6B', '#E8B45A'].map(c => (
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

                {/* Push Notifications */}
                <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid rgba(242,242,242,0.08)' }}>
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
                <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid rgba(242,242,242,0.08)' }}>
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

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
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

            {/* Data Management Section */}
            <div className="pt-4 flex flex-col gap-4 mt-2" style={{ borderTop: '1px solid rgba(242,242,242,0.08)' }}>
              <h4 className="text-sm font-black uppercase font-mono tracking-wider m-0" style={{ color: 'var(--arcade-paper-dim)' }}>Data Management</h4>

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
                                  setShowSettingsModal(false);
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
                      setShowSettingsModal(false);
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
      )}
      <FirstRunWizard />
    </div>
  );
};
