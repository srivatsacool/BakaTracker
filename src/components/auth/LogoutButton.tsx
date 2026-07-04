import React from 'react';
import { useAuth } from '../../auth/useAuth';

export const LogoutButton: React.FC = () => {
  const { logout } = useAuth();

  return (
    <button
      onClick={() => logout()}
      className="w-full text-left px-4 py-2 text-sm font-bold font-mono text-[#FF5C5C] hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded"
    >
      Log Out
    </button>
  );
};
