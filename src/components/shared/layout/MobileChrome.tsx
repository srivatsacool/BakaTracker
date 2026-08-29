import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { UserMenu } from '../../user/UserMenu';
import { OfflineBanner, ContextBar } from '../../shell';
import { useStore } from '../../../store/useStore';
import { PixelIcon, SystemLabel } from '../../ui';
import { NAV_TONES, NAV_PIXEL_ICONS } from './constants';
import type { BeforeInstallPromptEvent } from './useAppEnvironment';

interface MobileChromeProps {
  isEditorRoute: boolean;
  isOffline: boolean;
  assistantCollapsedEffective: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstallClick: () => void;
  onOpenSettings: () => void;
  onToggleAssistant: () => void;
}

/**
 * V3.5 mobile chrome: header + scrollable workspace + bottom navigation.
 *
 * Bottom nav = four primary instruments (Today / Habits / Tasks / Matrix)
 * plus MORE, which exposes everything else reachable in two taps:
 * Journal, Journey, Notes, BakaSur chat, Settings. All app routes are
 * reachable on mobile; the desktop rail keeps its own full list.
 */
const NAV_PRIMARY = [
  { path: '/today', name: 'Today' },
  { path: '/habits', name: 'Habits' },
  { path: '/tasks', name: 'Tasks' },
  { path: '/eisenhower', name: 'Matrix' },
]

const NAV_MORE = [
  { path: '/journal', name: 'Journal' },
  { path: '/journey', name: 'Journey' },
  { path: '/notes', name: 'Notes' },
  { path: '/bakasur', name: 'BakaSur Chat' },
]

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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close the More sheet when the route settles elsewhere (deferred tick:
  // imperative dismissal, not a render derivation).
  useEffect(() => {
    if (!moreOpen) return;
    const t = window.setTimeout(() => setMoreOpen(false), 0);
    return () => window.clearTimeout(t);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  // Escape closes; focus lands on the panel for keyboard users.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false) };
    document.addEventListener('keydown', onKey);
    moreRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const moreActive = NAV_MORE.some(i => pathname === i.path);

  return (
    <div className={`md:hidden flex flex-col w-full ${isEditorRoute ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {/* Mobile Header — V3.5: the dead 'always dark' sun button is gone;
          the theme is the theme, and pretending otherwise was a lie of UI. */}
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
          <SystemLabel k="LVL" tone="primary">{stats.level}</SystemLabel>
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
              className="p-2 rounded cursor-pointer"
              style={{ border: '1px solid rgba(139, 92, 246,0.35)', background: 'rgba(139, 92, 246,0.1)' }}
              title="Install BakaTracker App"
              aria-label="Install BakaTracker app"
            >
              <PixelIcon name="download" size={14} color="var(--arcade-gold)" />
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded cursor-pointer"
            style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.08)' }}
            title="Settings"
            aria-label="Open settings"
          >
            <PixelIcon name="settings" size={16} color="var(--arcade-paper)" />
          </button>

          {/* User Menu (guest: Leave demo / Create your own BakaTracker) */}
          <UserMenu />
        </div>
      </header>

      {/* Offline Banner */}
      {isOffline && <OfflineBanner />}

      {/* Scrollable Container */}
      <main className={`flex-1 ${isEditorRoute ? 'overflow-hidden p-0 min-h-0' : 'overflow-y-auto pb-28 p-4'}`}>
        {!isEditorRoute && (
          <div className="hidden md:block">
            <ContextBar
              isOffline={isOffline}
              onToggleAssistant={onToggleAssistant}
              assistantCollapsed={assistantCollapsedEffective}
            />
          </div>
        )}
        <Outlet />
      </main>

      {/* ── MORE sheet (Journal/Journey/Notes/BakaSur) ── */}
      {!isEditorRoute && moreOpen && (
        <div className="fixed inset-0 z-[130]" role="dialog" aria-modal="true" aria-label="More navigation">
          <button
            type="button"
            aria-label="Close more menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 w-full h-full cursor-pointer"
            style={{ background: 'rgba(4,5,15,0.65)', backdropFilter: 'blur(2px)' }}
          />
          <div
            ref={moreRef}
            tabIndex={-1}
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] outline-none"
            style={{ background: '#151021', border: '1px solid rgba(139,92,246,0.25)', borderBottom: 'none', boxShadow: '0 -12px 40px rgba(0,0,0,0.6)' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: 'rgba(233,230,242,0.15)' }} />
            <SystemLabel tone="muted" className="mb-2 block">MORE INSTRUMENTS</SystemLabel>
            <div className="flex flex-col gap-1">
              {NAV_MORE.map(item => {
                const isActive = pathname === item.path;
                const tone = NAV_TONES[item.path] || 'var(--arcade-paper-dim)';
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-3.5 rounded-xl no-underline transition active:scale-[0.99] group"
                    style={{
                      background: isActive ? 'rgba(139, 92, 246,0.12)' : 'rgba(242,242,242,0.02)',
                      border: `1px solid ${isActive ? 'rgba(139, 92, 246,0.35)' : 'rgba(233,230,242,0.06)'}`,
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                      <PixelIcon name={(NAV_PIXEL_ICONS[item.path] || 'target') as never} size={20} color={isActive ? tone : 'var(--arcade-paper-dim)'} />
                      <span className="font-mono text-xs font-bold" style={{ color: isActive ? 'var(--arcade-paper)' : 'var(--arcade-paper-dim)' }}>{item.name}</span>
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: tone }} aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom navigation: 4 primary + More ── */}
      {!isEditorRoute && (
        <nav
          className="cabinet-nav-mobile"
          style={{
            borderColor: 'rgba(139, 92, 246, 0.15)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
          }}
          aria-label="Mobile navigation"
        >
          {NAV_PRIMARY.map(item => {
            const isActive = pathname === item.path || (item.path === '/today' && pathname === '/');
            const pixelName = NAV_PIXEL_ICONS[item.path] || 'target';
            const tone = NAV_TONES[item.path] || 'var(--arcade-paper-disabled)';
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-2 py-1.5 rounded-xl transition-all active:scale-95 no-underline"
                style={{
                  background: isActive ? 'rgba(139, 92, 246,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(139, 92, 246,0.35)' : '1px solid transparent',
                  boxShadow: isActive ? '0 0 16px rgba(139, 92, 246,0.18)' : 'none',
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <PixelIcon name={pixelName as never} size={20} color={isActive ? tone : 'var(--arcade-paper-disabled)'} />
                <span className="text-[10px] font-bold font-mono mt-0.5" style={{ color: isActive ? 'var(--arcade-paper-dim)' : 'var(--arcade-paper-disabled)' }}>{item.name}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(o => !o)}
            className="flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-2 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
            style={{
              background: moreOpen || moreActive ? 'rgba(139, 92, 246,0.1)' : 'transparent',
              border: moreOpen || moreActive ? '1px solid rgba(139, 92, 246,0.35)' : '1px solid transparent',
              boxShadow: moreOpen || moreActive ? '0 0 16px rgba(139, 92, 246,0.18)' : 'none',
              color: moreOpen || moreActive ? 'var(--arcade-paper-dim)' : 'var(--arcade-paper-disabled)',
            }}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-label="More sections"
          >
            <span className="text-[18px] leading-[20px]" aria-hidden="true">⋯</span>
            <span className="text-[10px] font-bold font-mono mt-0.5">More</span>
          </button>
        </nav>
      )}
    </div>
  );
};
