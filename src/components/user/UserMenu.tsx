import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../features/auth';
import { authConfig } from '../../features/auth/config';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Sparkles, DoorOpen } from 'lucide-react';

/**
 * UserMenu — the player card. Avatar, name, and the LOG OUT lever,
 * in the observatory grammar (glass pane, instrument labels).
 *
 * The dropdown renders through a portal (fixed overlay) so it always floats
 * above the shell — the sidebar scroll container used to clip it into a
 * "nested card". Position is computed from the avatar's rect, right-aligned,
 * clamped to the viewport.
 *
 * Guests get an honest conversion surface (UX gap #5): a "Create your
 * own BakaTracker" CTA (sign-in clears the demo flag, then the real OAuth
 * flow) and a "Leave demo" action (clears the flag, resets local state,
 * returns to the Landing).
 */
export const UserMenu: React.FC = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on outside mousedown (the portal menu is inside menuRef, so menu
  // item clicks keep firing their own handlers) and on scroll (the fixed
  // overlay would otherwise dangle while the shell scrolls).
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => setIsOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [isOpen]);

  if (!user) return null;

  const isGuest = user.provider === 'guest';
  const canConvert = Boolean(authConfig.domain && authConfig.clientId);

  const toggleMenu = () => {
    if (!isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const w = 256; // w-64
      setMenuPos({ top: Math.round(r.bottom + 8), left: Math.round(Math.max(8, r.right - w)) });
    }
    setIsOpen(!isOpen);
  };

  const handleLeaveDemo = async () => {
    setIsOpen(false);
    // Demo-mode logout clears bt_demo_mode + bt_first_run and resets local
    // state; then we hand the player back to the Landing (public route).
    await logout();
    navigate('/');
  };

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        onClick={toggleMenu}
        className="flex items-center justify-center rounded-lg w-8 h-8 shrink-0 overflow-hidden cursor-pointer transition hover:scale-105"
        style={{ border: '1px solid rgba(139, 92, 246,0.35)', boxShadow: '0 0 12px rgba(139, 92, 246,0.2)' }}
        title={isGuest ? 'Demo player menu' : 'Player menu'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="user-menu"
      >
        {user.picture ? (
          <img src={user.picture} alt={user.name || 'User Profile'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full rounded-lg flex items-center justify-center" style={{ background: 'var(--arcade-gold-deep)', color: 'var(--arcade-paper)' }}>
            <span className="font-mono text-xs font-bold">{user.name?.charAt(0) || user.email?.charAt(0) || ''}</span>
          </div>
        )}
      </button>

      {isOpen &&
        menuPos &&
        createPortal(
          <div
            id="user-menu"
            ref={menuRef}
            className="fixed z-[200] w-64 cabinet p-3.5 animate-fade-in flex flex-col gap-2.5"
            style={{ top: menuPos.top, left: menuPos.left }}
            role="menu"
            aria-label={isGuest ? 'Demo player menu' : 'Player menu'}
          >
            <div className="flex items-center gap-3 pb-2.5" style={{ borderBottom: '1px solid rgba(242,242,242,0.1)' }}>
              {user.picture ? (
                <img src={user.picture} alt={user.name || 'User Profile'} className="w-10 h-10 rounded-full object-cover shrink-0" style={{ border: '1px solid rgba(139, 92, 246,0.4)' }} />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase shrink-0" style={{ background: 'linear-gradient(180deg, var(--arcade-gold), var(--arcade-gold-deep))', color: 'var(--obs-void-lift)' }}>
                  {user.name?.charAt(0) || user.email?.charAt(0) || <UserIcon className="w-5 h-5" />}
                </div>
              )}
              <div className="overflow-hidden">
                <h4 className="font-bold text-xs truncate leading-tight m-0" style={{ color: 'var(--arcade-paper)' }}>{user.name}</h4>
                <span className="text-[10px] font-mono truncate block mt-0.5" style={{ color: 'var(--arcade-paper-muted)' }}>{user.email}</span>
              </div>
            </div>

            {isGuest ? (
              <>
                <p className="m-0 px-1 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>
                  You're exploring a demo — your observations live on this device.
                </p>

                {canConvert ? (
                  <button
                    onClick={async () => {
                      setIsOpen(false);
                      await login(); // demo login clears bt_demo_mode, then real OAuth
                    }}
                    role="menuitem"
                    className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-xs font-bold font-mono cursor-pointer rounded-md transition hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(180deg, var(--arcade-gold) 0%, var(--arcade-gold-deep) 100%)',
                      border: '1px solid rgba(139, 92, 246,0.5)',
                      boxShadow: '0 0 16px rgba(139, 92, 246,0.3)',
                      color: 'var(--obs-void-lift)',
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Create your own BakaTracker</span>
                  </button>
                ) : (
                  <p className="m-0 px-1 text-[10px] leading-relaxed font-mono" style={{ color: 'var(--arcade-paper-muted)' }}>
                    Sign-in is unavailable right now — data stays on this device.
                  </p>
                )}

                <button
                  onClick={handleLeaveDemo}
                  role="menuitem"
                  className="flex items-center justify-center gap-2 w-full text-center px-3 py-2 text-xs font-bold font-mono cursor-pointer rounded-md transition"
                  style={{ color: 'var(--arcade-paper-dim)', border: '1px solid var(--obs-glass-15)', background: 'rgba(242,242,242,0.04)' }}
                >
                  <DoorOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Leave demo</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => logout()}
                className="flex items-center justify-center gap-2 w-full text-center px-3 py-2 text-xs font-bold font-mono cursor-pointer rounded-md transition"
                style={{ color: 'var(--arcade-red)', border: '1px solid rgba(255,59,92,0.35)', background: 'rgba(255,59,92,0.08)' }}
                role="menuitem"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>LOG OUT</span>
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
