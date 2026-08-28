import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Zap } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { UserMenu } from '../../user/UserMenu';
import { useAuth } from '../../../features/auth';
import { authConfig } from '../../../features/auth/config';
import { SyncStatus } from '../../shell';
import { useStore } from '../../../store/useStore';
import { PixelIcon, SystemLabel, PixelFrame } from '../../ui';
import type { HudStatus } from './hudStatus';
import { NAV_ITEMS, NAV_TONES, NAV_PIXEL_ICONS } from './constants';
import type { BeforeInstallPromptEvent } from './useAppEnvironment';

interface InstrumentRailProps {
  railCollapsed: boolean;
  hudStatus: HudStatus;
  dailyScore: number;
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstallClick: () => void;
  onOpenSettings: (seedFromSettings: boolean) => void;
}

/**
 * The desktop instrument rail (left sidebar) + its straddle collapse toggle.
 *
 * Extracted verbatim from Layout.tsx. Self-subscribes to router location,
 * auth, and the store slices it renders; everything still owned by the shell
 * root arrives via props. All element ids are preserved verbatim — the app
 * tour targets them (instrument-rail, sidebar-logo, settings-btn,
 * settings-btn-collapsed, sidebar-level-bar, nav-*, sidebar-day-progress).
 */
export const InstrumentRail: React.FC<InstrumentRailProps> = ({
  railCollapsed,
  hudStatus,
  dailyScore,
  deferredPrompt,
  onInstallClick,
  onOpenSettings,
}) => {
  const location = useLocation();
  const { user, login } = useAuth();
  const isGuest = user?.provider === 'guest';
  const isAuthConfigured = Boolean(authConfig.domain && authConfig.clientId);
  const { stats, settings } = useStore(useShallow(s => ({
    stats: s.stats,
    settings: s.settings,
  })));

  return (
    <>
      {/* Desktop Sidebar — the instrument rail */}
      <aside
        id="instrument-rail"
        className={`hidden md:flex flex-col ${railCollapsed ? 'w-20' : 'w-68'} p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 justify-between relative border-r overflow-y-auto overflow-x-hidden`}
        style={{
          background: 'linear-gradient(180deg, var(--obs-void-lift) 0%, var(--obs-void-deep) 40%, var(--obs-void) 100%)',
          borderColor: 'var(--obs-glass-7)',
          boxShadow: 'inset -1px 0 0 rgba(139, 92, 246,0.04)',
        }}
      >
        <div className="flex flex-col gap-6 min-w-0">
          {/* Logo / Marquee + Settings (always visible) */}
          <div id="sidebar-logo" className={`flex items-center ${railCollapsed ? 'justify-center' : 'justify-between gap-2'} transition-all min-w-0`}>
            <div className={`flex items-center ${railCollapsed ? '' : 'gap-2.5'} min-w-0`}>
              <div className="relative shrink-0">
                <img src="/logo.png" alt="BakaTracker Logo" className="w-8 h-8 rounded-lg object-cover" style={{ border: '1px solid rgba(139, 92, 246,0.35)', boxShadow: '0 0 20px rgba(139, 92, 246,0.25)' }} />
              </div>
              {!railCollapsed && (
                <div className="transition-all duration-300 min-w-0 leading-none">
                  <h1 className="marquee-title text-base m-0 leading-tight truncate" style={{ color: 'var(--arcade-paper)' }}>BakaTracker</h1>
                  <span className="font-mono text-[9px] truncate block mt-0.5" style={{ color: 'var(--arcade-gold)' }}>PERSONAL LIFE OS</span>
                </div>
              )}
            </div>
            {!railCollapsed && (
              <button
                id="settings-btn"
                onClick={() => onOpenSettings(true)}
                className="p-1.5 rounded-lg transition hover:scale-105 cursor-pointer shrink-0"
                style={{ border: '1px solid var(--obs-glass-15)', background: 'rgba(242,242,242,0.04)' }}
                title="Settings"
                aria-label="Settings"
              >
                <PixelIcon name="settings" size={16} color="var(--arcade-paper)" />
              </button>
            )}
          </div>

          {/* Status Card (character stats) */}
          <PixelFrame
            id="sidebar-level-bar"
            className={`${railCollapsed ? 'p-2 items-center flex flex-col gap-2.5' : 'p-3 flex flex-col gap-2.5'} transition-all min-w-0`}
            style={{ borderColor: 'rgba(139, 92, 246,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 var(--obs-glass-5)', background: 'linear-gradient(180deg, rgba(139, 92, 246,0.07) 0%, rgba(63,123,255,0.03) 100%)' }}
          >
            {railCollapsed ? (
              <div className="flex flex-col items-center gap-2.5">
                <span
                  className="font-bold font-mono text-xs px-1.5 py-0.5 rounded score-readout"
                  style={{ color: 'var(--arcade-gold)', border: '1px solid rgba(139, 92, 246,0.4)', background: 'rgba(139, 92, 246,0.12)', boxShadow: '0 0 12px rgba(139, 92, 246,0.2)' }}
                  title={`Level ${stats.level}`}
                >
                  L{stats.level}
                </span>

                {/* Save lamp */}
                <SyncStatus compact />

                {/* Theme toggle removed — dark-only world, no light CSS exists */}

                {/* Settings Toggle */}
                <button
                  id="settings-btn-collapsed"
                  onClick={() => onOpenSettings(true)}
                  className="p-1.5 rounded border transition hover:scale-105 cursor-pointer"
                  style={{ border: '1px solid var(--obs-glass-15)', background: 'rgba(242,242,242,0.04)' }}
                  title="Settings"
                >
                  <PixelIcon name="settings" size={14} color="var(--arcade-paper)" />
                </button>

                {/* User Menu (guest: Leave demo / Create your own BakaTracker) */}
                <UserMenu />
              </div>

            ) : (
              // Expanded Status Card — compact system HUD
              <>
                <div className="flex items-center justify-between min-w-0">
                  <span className="score-readout text-sm font-bold" style={{ color: 'var(--arcade-gold)' }}>LVL {stats.level}</span>
                  <span className="flex items-center gap-1.5" title={`Sync: ${hudStatus.label.toLowerCase()}`}>
                    <span className={`hud-status-dot ${hudStatus.cls}`} aria-hidden="true" />
                    <span className="font-mono text-[9px] tracking-wide" style={{ color: 'var(--arcade-paper-muted)' }}>{hudStatus.label}</span>
                  </span>
                </div>

                <div className="flex justify-between items-baseline font-mono text-[10px]">
                  <SystemLabel k="XP" tone="muted">{stats.xp} / {settings.xp_per_level}</SystemLabel>
                  <span className="score-readout" style={{ color: 'var(--arcade-gold)' }} />
                </div>
                <div className="hud-xp-track">
                  <div
                    className="hud-xp-fill"
                    style={{
                      width: `${Math.min(100, (stats.xp / Math.max(1, settings.xp_per_level)) * 100)}%`,
                      background: 'linear-gradient(90deg, var(--arcade-gold-deep) 0%, var(--arcade-gold) 100%)',
                      boxShadow: '0 0 10px rgba(139, 92, 246, 0.45)',
                    }}
                  />
                </div>

                {/* Day Progress — the day's clear count */}
                <div id="sidebar-day-progress" className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--obs-glass-7)' }}>
                  <SystemLabel tone="muted">Sky Clear</SystemLabel>
                  <span
                    className={`font-mono text-[10px] font-bold score-readout ${
                      dailyScore >= 80 ? 'text-success' : dailyScore >= 40 ? 'text-arcade-gold' : 'text-danger'
                    }`}
                  >
                    {dailyScore}%
                  </span>
                </div>

                {/* User Menu (guest: Leave demo / Create your own BakaTracker) */}
                <div className="flex items-center pt-2" style={{ borderTop: '1px solid var(--obs-glass-5)' }}>
                  <UserMenu />
                </div>
              </>
            )}
          </PixelFrame>

          {/* Demo Mode Banner (sidebar) */}
          {isGuest && !railCollapsed && (
            <div
              className="px-3 py-2.5 rounded-xl flex items-center gap-2.5"
              style={{
                background: 'rgba(139, 92, 246, 0.06)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.06)',
              }}
            >
              <div
                className="p-1 rounded-lg shrink-0"
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
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
          <nav className="flex flex-col gap-3" aria-label="Main navigation">
            {NAV_ITEMS.map(item => {
              const isActive = location.pathname === item.path || (item.path === '/today' && location.pathname === '/');
              const itemId = item.path === '/eisenhower' ? 'nav-eisenhower' : `nav-${item.name.toLowerCase()}`;
              const tone = NAV_TONES[item.path] || 'var(--arcade-paper-dim)';
              const pixelName = NAV_PIXEL_ICONS[item.path] || 'target';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  id={itemId}
                  title={item.name}
                  className={`cabinet-nav-item ${railCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} ${isActive ? 'is-active' : ''}`}
                  style={{ '--nav-color': tone } as React.CSSProperties}
                >
                  <span className="nav-led" aria-hidden="true" />
                  <PixelIcon name={pixelName as never} size={railCollapsed ? 20 : 18} color={tone} className="shrink-0" />
                  {!railCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}

            {/* Desktop PWA Install — a new cabinet */}
            {deferredPrompt && (
              <button
                onClick={onInstallClick}
                className={`cabinet-nav-item ${railCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} mt-2 cursor-pointer`}
                style={{ '--nav-color': 'var(--arcade-gold)', background: 'rgba(139, 92, 246,0.06)' } as React.CSSProperties}
                title="Install BakaTracker Desktop App"
              >
                <Download className="w-4 h-4 shrink-0" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
                {!railCollapsed && <span className="whitespace-nowrap">Install App</span>}
              </button>
            )}
          </nav>
        </div>

        {/* Footer — the save file stamp */}
        {!railCollapsed && (
          <div
            className="text-center text-[11px] font-mono mt-auto pt-4 transition-all duration-300"
            style={{ color: 'var(--arcade-paper-disabled)', borderTop: '1px solid var(--obs-glass-7)' }}
          >
            <p className="m-0">BakaTracker v2.2 · OBSERVING</p>
            <p className="font-bold mt-1 m-0" style={{ color: 'var(--arcade-paper-muted)' }}>Made by build.srivatsa</p>
          </div>
        )}
      </aside>

      {/* Toggle Sidebar Collapse Button — a sibling of the rail so it can
          straddle its edge without being clipped by the rail's overflow guards.
          NOTE: rendered by the shell root next to <InstrumentRail/> so it keeps
          its absolute position relative to the shared frame — see Layout.tsx. */}
    </>
  );
};

/** Straddle toggle button (sibling of the rail inside the shell frame). */
export const RailStraddleToggle: React.FC<{
  railCollapsed: boolean;
  autoIconRailActive: boolean;
  onToggle: () => void;
}> = ({ railCollapsed, autoIconRailActive, onToggle }) => {
  if (autoIconRailActive) return null;
  return (
    <button
      onClick={onToggle}
      className="absolute top-4 z-20 rounded-full p-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer hidden md:block"
      style={{
        left: railCollapsed ? 'calc(5rem - 14px)' : 'calc(17rem - 14px)',
        background: 'rgba(139, 92, 246, 0.12)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 0 16px rgba(139, 92, 246, 0.2)',
      }}
      title={railCollapsed ? "Expand Instrument Rail" : "Collapse Instrument Rail"}
      aria-label={railCollapsed ? "Expand instrument rail" : "Collapse instrument rail"}
      aria-expanded={!railCollapsed}
      aria-controls="instrument-rail"
    >
      {railCollapsed ? <ChevronRight className="w-4 h-4" style={{ color: 'var(--arcade-gold)' }} /> : <ChevronLeft className="w-4 h-4" style={{ color: 'var(--arcade-gold)' }} />}
    </button>
  );
};
