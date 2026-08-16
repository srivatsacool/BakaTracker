import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../features/auth';
import { LogOut, User as UserIcon } from 'lucide-react';

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
        className="flex items-center justify-center rounded-lg border-2 border-black bg-white hover:bg-gray-100 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer w-8 h-8 shrink-0 overflow-hidden"
        title="User Menu"
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name || 'User Profile'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-accent-pink flex items-center justify-center text-black font-bold text-xs uppercase font-mono">
            {user.name?.charAt(0) || user.email?.charAt(0) || <UserIcon className="w-4 h-4" />}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-11 md:bottom-auto md:top-11 z-[100] w-64 bg-white border-3 border-black rounded-lg p-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black animate-fade-in flex flex-col gap-2.5">
          <div className="flex items-center gap-3 border-b-2 border-black/10 pb-2.5">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name || 'User Profile'}
                className="w-10 h-10 rounded-full border-2 border-black object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-black bg-accent-pink flex items-center justify-center text-black font-bold text-sm uppercase shrink-0">
                {user.name?.charAt(0) || user.email?.charAt(0) || <UserIcon className="w-5 h-5" />}
              </div>
            )}
            <div className="overflow-hidden">
              <h4 className="font-black text-xs truncate leading-tight m-0">{user.name}</h4>
              <span className="text-[10px] font-mono text-gray-500 truncate block mt-0.5">{user.email}</span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center justify-center gap-2 w-full text-center px-3 py-2 text-xs font-black font-mono text-[#E05252] hover:bg-[#E05252]/10 border-2 border-black rounded-md transition cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LOG OUT</span>
          </button>
        </div>
      )}
    </div>
  );
};
