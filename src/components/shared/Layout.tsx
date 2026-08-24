import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { calculateDailyScore, getTodayDateString } from '../../lib/utils';
import { OnboardingBanner } from './OnboardingBanner';
import { useAuth } from '../../features/auth';
import { authConfig } from '../../features/auth/config';
import { useApiClient } from '../../api/authFetch';
import { FirstRunWizard } from './FirstRunWizard';
import { ExportLifeModal } from './ExportLifeModal';
import { FirstRunSetup } from './FirstRunSetup';
import { useAppTour } from '../../lib/useAppTour';
import { ContextBar, OfflineBanner, BakaSurRail } from '../shell';
import { useStore } from '../../store/useStore';
import { InstrumentRail, RailStraddleToggle } from './layout/InstrumentRail';
import { MobileChrome } from './layout/MobileChrome';
import { SettingsModal } from './layout/SettingsModal';
import { useAppEnvironment } from './layout/useAppEnvironment';
import { useRailChrome } from './layout/useRailChrome';
import { getHudStatus } from './layout/hudStatus';

/**
 * Composition root for the app shell.
 *
 * Owns only cross-cutting shell state: modal open flags, the environment
 * (online/offline + PWA install), rail chrome (persisted + tablet + editor
 * tiers) and the first-run gate. Rendering responsibility is delegated:
 *
 *   Layout                    — composition root (this file)
 *   ├─ InstrumentRail         — desktop sidebar (+ RailStraddleToggle sibling)
 *   ├─ MobileChrome           — mobile header / workspace / bottom nav
 *   ├─ desktop <main>         — inline (too small to extract)
 *   ├─ BakaSurRail            — pre-existing shell component
 *   └─ SettingsModal          — the whole settings dialog incl. its own state
 */
export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { startTour } = useAppTour(navigate);
  const {
    habits,
    habitLogs,
    tasks,
    journal,
    settings,
    setAccentColors,
    loadDemoData,
    clearDataByDays,
    syncStatus,
  } = useStore(useShallow(s => ({
    habits: s.habits,
    habitLogs: s.habitLogs,
    tasks: s.tasks,
    journal: s.journal,
    settings: s.settings,
    setAccentColors: s.setAccentColors,
    loadDemoData: s.loadDemoData,
    clearDataByDays: s.clearDataByDays,
    syncStatus: s.syncStatus,
  })));
  const init = useStore((s) => s.init);
  const { user, login, logout, getAccessToken } = useAuth();
  const apiClient = useApiClient();
  const isGuest = user?.provider === 'guest';
  const isAuthConfigured = Boolean(authConfig.domain && authConfig.clientId);

  // Environment: online/offline + PWA install prompt.
  const { isOffline, deferredPrompt, installPWA } = useAppEnvironment();

  // Editor-route flush mode: /notes/:pageId hands the whole viewport to the
  // Excalidraw canvas (no padded main, no mobile bottom nav overlap).
  const isEditorRoute = /^\/notes\/[^/]+/.test(location.pathname);

  // Rail/assistant chrome across the three precedence tiers.
  const {
    railCollapsed,
    isAssistantCollapsed,
    assistantCollapsedEffective,
    autoIconRail,
    toggleCollapse,
    toggleAssistant,
  } = useRailChrome(isEditorRoute);

  const todayStr = getTodayDateString();
  const dailyScore = calculateDailyScore(todayStr, habits, habitLogs, tasks, journal);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Auto-load demo data for guest users exploring the app.
  useEffect(() => {
    if (isGuest && habits.length === 0) {
      loadDemoData();
    }
  }, [isGuest, habits.length, loadDemoData]);

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

  // HUD status (sidebar): the same sync-state grammar as the ContextBar lamp.
  const hudStatus = getHudStatus({
    isGuest: Boolean(isGuest),
    isOffline,
    syncStatus,
  });

  return (
    <div className="min-h-screen text-text-primary flex flex-col md:flex-row app-canvas" style={{ position: 'relative', zIndex: 1 }}>
      <div className={`app-shell-frame relative ${isAssistantCollapsed ? 'assistant-collapsed' : ''}`}>
      <InstrumentRail
        railCollapsed={railCollapsed}
        hudStatus={hudStatus}
        dailyScore={dailyScore}
        deferredPrompt={deferredPrompt}
        onInstallClick={installPWA}
        onOpenSettings={() => setShowSettingsModal(true)}
      />
      <RailStraddleToggle
        railCollapsed={railCollapsed}
        autoIconRailActive={autoIconRail}
        onToggle={toggleCollapse}
      />

      <MobileChrome
        isEditorRoute={isEditorRoute}
        isOffline={isOffline}
        assistantCollapsedEffective={assistantCollapsedEffective}
        deferredPrompt={deferredPrompt}
        onInstallClick={installPWA}
        onOpenSettings={() => setShowSettingsModal(true)}
        onToggleAssistant={toggleAssistant}
      />

      {/* Desktop Main Content Container */}
      <main className={`hidden md:block flex-1 h-screen ${isEditorRoute ? 'overflow-hidden p-0' : 'overflow-y-auto p-8'} bg-transparent`}>
        {isOffline && <OfflineBanner />}
        {!isEditorRoute && (
          <ContextBar
            isOffline={isOffline}
            onToggleAssistant={toggleAssistant}
            assistantCollapsed={assistantCollapsedEffective}
          />
        )}
        <OnboardingBanner />
        <Outlet />
      </main>
      <BakaSurRail collapsed={assistantCollapsedEffective} onToggle={toggleAssistant} />
      </div>

      {/* Settings Modal (Bottom Sheet on Mobile) — mounts fresh on every open,
          which reproduces the old opener-side input seeding exactly. */}
      {showSettingsModal && (
        <SettingsModal
          user={user}
          isGuest={Boolean(isGuest)}
          isAuthConfigured={isAuthConfigured}
          login={login}
          logout={logout}
          getAccessToken={getAccessToken}
          apiClient={apiClient as NonNullable<typeof apiClient>}
          init={init}
          clearDataByDays={clearDataByDays}
          setAccentColors={setAccentColors}
          startTour={startTour}
          initialAccentLight={settings.accent_color_light || '#8B5CF6'}
          initialAccentDark={settings.accent_color_dark || '#8B5CF6'}
          onClose={() => setShowSettingsModal(false)}
          onRequestExport={() => setShowExportModal(true)}
        />
      )}
      <ExportLifeModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
      <FirstRunWizard />
    </div>
  );
};
