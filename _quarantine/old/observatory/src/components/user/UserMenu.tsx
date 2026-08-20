import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../features/auth';
import { LogOut, User as UserIcon } from 'lucide-react';

/**
 * UserMenu — the player card. Avatar, name, and the LOG OUT lever,
 * in the observatory grammar (glass pane, instrument labels).
 */
export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-lg w-8 h-8 shrink-0 overflow-hidden cursor-pointer transition hover:scale-105"
        style={{ border: '1px solid rgba(111, 91, 216,0.35)', boxShadow: '0 0 12px rgba(111, 91, 216,0.2)' }}
        title="Player menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {user.picture ? (
          <img src={user.picture} alt={user.name || 'User Profile'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-xs uppercase font-mono" style={{ background: 'linear-gradient(180deg, var(--arcade-gold), var(--arcade-gold-deep))', color: '#17121c' }}>
            {user.name?.charAt(0) || user.email?.charAt(0) || <UserIcon className="w-4 h-4" />}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-11 md:bottom-auto md:top-11 z-[100] w-64 cabinet p-3.5 animate-fade-in flex flex-col gap-2.5" role="menu">
          <div className="flex items-center gap-3 pb-2.5" style={{ borderBottom: '1px solid rgba(242,242,242,0.1)' }}>
            {user.picture ? (
              <img src={user.picture} alt={user.name || 'User Profile'} className="w-10 h-10 rounded-full object-cover shrink-0" style={{ border: '1px solid rgba(111, 91, 216,0.4)' }} />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase shrink-0" style={{ background: 'linear-gradient(180deg, var(--arcade-gold), var(--arcade-gold-deep))', color: '#17121c' }}>
                {user.name?.charAt(0) || user.email?.charAt(0) || <UserIcon className="w-5 h-5" />}
              </div>
            )}
            <div className="overflow-hidden">
              <h4 className="font-bold text-xs truncate leading-tight m-0" style={{ color: 'var(--arcade-paper)' }}>{user.name}</h4>
              <span className="text-[10px] font-mono truncate block mt-0.5" style={{ color: 'var(--arcade-paper-muted)' }}>{user.email}</span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center justify-center gap-2 w-full text-center px-3 py-2 text-xs font-bold font-mono cursor-pointer rounded-md transition"
            style={{ color: 'var(--arcade-red)', border: '1px solid rgba(255,59,92,0.35)', background: 'rgba(255,59,92,0.08)' }}
            role="menuitem"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LOG OUT</span>
          </button>
        </div>
      )}
    </div>
  );
};
