import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Download, Settings as SettingsIcon, Sun } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { UserMenu } from '../../user/UserMenu';
import { OfflineBanner, ContextBar } from '../../shell';
import { OnboardingBanner } from '../OnboardingBanner';
import { useStore } from '../../../store/useStore';
import { NAV_ITEMS, NAV_TONES } from './constants';
import type { BeforeInstallPromptEvent } from './useAppEnvironment';

interface MobileChromeProps {
  isEditorRoute: boolean;
  isOffline: boolean;
  assistantCollapsedEffective: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstallClick: () => void;
  onOpenSettings: (seedFromSettings: boolean) => void;
  onToggleAssistant: () => void;
}

/**
 * Mobile header + scrollable workspace + bottom navigation.
 *
 * Extracted verbatim from Layout.tsx (`md:hidden` branch). Self-subscribes to
 * the store slices it renders; the shell root passes chrome state and
 * callbacks. The ContextBar copy inside the `hidden md:block` wrapper is
 * intentional — the desktop ContextBar lives in the desktop <main> and this
 * mirror keeps the mobile DOM shape identical to the pre-refactor output.
 */
export const MobileChrome: React.FC<MobileChromeProps> = ({
  isEditorRoute,
  isOffline,
  assistantCollapsedEffective,
  deferredPrompt,
  onInstallClick,
  onOpenSettings,
  onToggleAssistant,
}) => {
  const { stats, settings } = useStore(useShallow(s => ({
    stats: s.stats,
    settings: s.settings,
  })));
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className={`md:hidden flex flex-col w-full ${isEditorRoute ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {/* Mobile Header */}
      <header
        className="p-4 flex items-center justify-between sticky top-0 z-50 border-b"
        style={{
          background: 'linear-gradient(180deg, #14101f 0%, #0d0b16 100%)',
          borderColor: 'rgba(139, 92, 246,0.15)',
        }}
      >
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="BakaTracker Logo" className="w-8 h-8 rounded-lg object-cover" style={{ border: '1px solid rgba(139, 92, 246,0.3)', boxShadow: '0 0 14px rgba(139, 92, 246,0.2)' }} />
          <h1 className="marquee-title text-lg m-0" style={{ color: 'var(--arcade-paper)' }}>BakaTracker</h1>
        </div>

        {/* Character Quick Info */}
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xs font-bold px-1.5 py-0.5 rounded score-readout"
            style={{ color: 'var(--arcade-gold)', border: '1px solid rgba(139, 92, 246,0.4)', background: 'rgba(139, 92, 246,0.12)' }}
          >
            LVL {stats.level}
          </span>
          <div
            className="w-16 h-2 rounded-full overflow-hidden relative"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139, 92, 246,0.2)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(stats.xp / settings.xp_per_level) * 100}%`,
                background: 'linear-gradient(90deg, var(--arcade-gold-deep), var(--arcade-gold))',
                boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
              }}
            />
          </div>

          {/* PWA Install Button (Mobile) */}
          {deferredPrompt && (
            <button
              onClick={onInstallClick}
              className="p-1 rounded cursor-pointer"
              style={{ border: '1px solid rgba(139, 92, 246,0.35)', background: 'rgba(139, 92, 246,0.1)' }}
              title="Install BakaTracker App"
            >
              <Download className="w-3.5 h-3.5" style={{ color: 'var(--arcade-gold)' }} />
            </button>
          )}

          {/* Mobile Theme Toggle */}
          <button
            title="Dark mode (always)"
            disabled
            className="p-1 rounded opacity-40 cursor-default"
            style={{ border: '1px solid var(--obs-glass-15)', background: 'rgba(242,242,242,0.04)' }}
          >
            <Sun className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} />
          </button>

          <button
            onClick={() => onOpenSettings(true)}
            className="p-1 rounded cursor-pointer"
            style={{ border: '1px solid var(--obs-glass-15)', background: 'rgba(242,242,242,0.04)' }}
            title="Settings"
          >
            <SettingsIcon className="w-3.5 h-3.5" style={{ color: 'var(--arcade-paper)' }} />
          </button>

          {/* User Menu (guest: Leave demo / Create your own BakaTracker) */}
          <UserMenu />
        </div>
      </header>

      {/* Offline Banner */}
      {isOffline && <OfflineBanner />}

      {/* Scrollable Container */}
      <main className={`flex-1 ${isEditorRoute ? 'overflow-hidden p-0 min-h-0' : 'overflow-y-auto pb-24 p-4'}`}>
        {!isEditorRoute && (
          <div className="hidden md:block">
            <ContextBar
              isOffline={isOffline}
              onToggleAssistant={onToggleAssistant}
              assistantCollapsed={assistantCollapsedEffective}
            />
          </div>
        )}
        <OnboardingBanner />
        <Outlet />
      </main>

      {/* Mobile Navigation Bar (hidden on editor routes so it doesn't overlap the canvas) */}
      {!isEditorRoute && (
        <nav
          className="cabinet-nav-mobile"
          style={{
            borderColor: 'rgba(139, 92, 246, 0.15)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
          }}
          aria-label="Mobile navigation"
        >
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.path || (item.path === '/today' && pathname === '/');
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
                  background: isActive ? 'rgba(139, 92, 246,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(139, 92, 246,0.35)' : '1px solid transparent',
                  boxShadow: isActive ? '0 0 16px rgba(139, 92, 246,0.18)' : 'none',
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
  );
};
