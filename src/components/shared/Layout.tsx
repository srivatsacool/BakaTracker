import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { calculateDailyScore, getTodayDateString } from '../../lib/utils';
import { useAuth } from '../../features/auth';
import { authConfig } from '../../features/auth/config';
import { useApiClient } from '../../api/authFetch';
import { ExportLifeModal } from './ExportLifeModal';
import {
  walkthroughScopeForUser, getWalkthroughStatus, resetWalkthrough,
} from '../../lib/walkthrough';
import { WalkthroughOverlay } from '../onboarding/WalkthroughOverlay';
import { VisitorGreeting } from '../onboarding/VisitorGreeting';
import { ContextBar, OfflineBanner, BakaSurRail, BakaSurPresence } from '../shell';
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
 * tiers) and the V3.5 canonical onboarding gate. ONE walkthrough system —
 * state in lib/walkthrough (bt_walkthrough:<scope>) — and the legacy
 * mechanisms (FirstRunWizard, FirstRunSetup, OnboardingChoice,
 * OnboardingBanner, intro.js tour) are deleted: nothing can re-show a tour
 * the user ended, on refresh or on another route.
 *
 *   Layout                    — composition root (this file)
 *   ├─ InstrumentRail         — desktop sidebar (+ RailStraddleToggle sibling)
 *   ├─ MobileChrome           — mobile header / workspace / bottom nav
 *   ├─ BakaSurPresence        — the single living character (hero ⇄ rail)
 *   ├─ WalkthroughOverlay     — canonical walkthrough (all entry points)
 *   └─ SettingsModal          — the whole settings dialog incl. its own state
 */
export const Layout: React.FC = () => {
  const location = useLocation();
  const {
    habits,
    habitLogs,
    tasks,
    journal,
    clearDataByDays,
    syncStatus,
  } = useStore(useShallow(s => ({
    habits: s.habits,
    habitLogs: s.habitLogs,
    tasks: s.tasks,
    journal: s.journal,
    clearDataByDays: s.clearDataByDays,
    syncStatus: s.syncStatus,
  })));
  const init = useStore((s) => s.init);
  const loadDemoData = useStore((s) => s.loadDemoData);
  const habitsCount = useStore((s) => s.habits.length);
  const { user, login, logout, getAccessToken } = useAuth();
  const apiClient = useApiClient();
  const isGuest = user?.provider === 'guest';
  const isAuthConfigured = Boolean(authConfig.domain && authConfig.clientId);

  // Environment: online/offline + PWA install prompt.
  const { isOffline, deferredPrompt, installPWA } = useAppEnvironment();

  // Editor-route flush mode: /notes/:pageId hands the whole viewport to the
  // Excalidraw canvas (no padded main, no hero while collapsed).
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

  /* \u2500\u2500 V3.5 canonical onboarding \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   * One walkthrough, scope-correct: the visitor/demo device has its own
   * state; an authenticated account has its own (keyed by sub). They never
   * leak into each other. Skip and Complete both persist and both suppress
   * every future auto-launch \u2014 across refresh, routes and re-renders.     */
  const walkthroughScope = walkthroughScopeForUser(isGuest ? null : user?.id);
  const [walkthroughActive, setWalkthroughActive] = useState(false);

  // Visitor greeting: once per device (bt_visit_choice), before the product
  // is interactive. Hardcoded copy \u2014 see VisitorGreeting.
  const [greetingOpen, setGreetingOpen] = useState(() => {
    try { return !localStorage.getItem('bt_visit_choice'); } catch { return false; }
  });

  // The visitor/demo device is a guest with no ledger \u2192 seed the synthetic
  // demo life (guest IS the demo; personal data lives in the auth scope).
  useEffect(() => {
    if (isGuest && habitsCount === 0) {
      loadDemoData();
    }
  }, [isGuest, habitsCount, loadDemoData]);

  // Auto-launch the walkthrough ONLY for a first-run authenticated account.
  // The visitor path launches it explicitly (\u201cEnter demo\u201d \u2192 guided tour).
  useEffect(() => {
    if (isGuest || !user?.id) return;
    if (getWalkthroughStatus(`auth:${user.id}`) === 'unset') {
      // Deferred one tick: this is an imperative launch trigger (auth state
      // arrived), not a render derivation.
      const t = window.setTimeout(() => setWalkthroughActive(true), 0);
      return () => window.clearTimeout(t);
    }
  }, [isGuest, user?.id]);

  const endGreeting = (choice: 'demo' | 'app') => {
    try { localStorage.setItem('bt_visit_choice', choice); } catch { /* private mode */ }
    setGreetingOpen(false);
  };
  const enterDemoFromGreeting = () => {
    endGreeting('demo');
    setWalkthroughActive(true); // guide the visitor through the demo product
  };

  // Replay from Settings (scope-correct): wipe, then launch.
  const replayWalkthrough = () => {
    resetWalkthrough(walkthroughScope);
    setWalkthroughActive(true);
  };
  const dismissWalkthrough = () => setWalkthroughActive(false);

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
          <Outlet />
        </main>

        <BakaSurPresence collapsed={assistantCollapsedEffective} onToggle={toggleAssistant} editorRoute={isEditorRoute}>
          <BakaSurRail collapsed={assistantCollapsedEffective} onToggle={toggleAssistant} />
        </BakaSurPresence>
      </div>

      {/* Settings Modal (Bottom Sheet on Mobile) \u2014 mounts fresh on every open. */}
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
          onReplayWalkthrough={replayWalkthrough}
          onClose={() => setShowSettingsModal(false)}
          onRequestExport={() => setShowExportModal(true)}
        />
      )}
      <ExportLifeModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />

      {/* V3.5 canonical walkthrough \u2014 the only tour that ever mounts. */}
      {walkthroughActive && (
        <WalkthroughOverlay scope={walkthroughScope} onExit={dismissWalkthrough} />
      )}

      {/* First-visit greeting (once per device; then the choice is persisted). */}
      {greetingOpen && !walkthroughActive && (
        <VisitorGreeting
          isAuthConfigured={isAuthConfigured}
          onSignIn={() => { endGreeting('app'); void login(); }}
          onEnterDemo={enterDemoFromGreeting}
          onDismiss={() => endGreeting(isGuest ? 'demo' : 'app')}
        />
      )}
    </div>
  );
};
