import React from 'react';
import { useAuth } from '../hooks';

export const LoginButton: React.FC = () => {
  const { login } = useAuth();

  return (
    <button
      onClick={() => login()}
      className="neo-button bg-accent-pink text-black text-sm font-bold w-full uppercase tracking-tight py-2.5 px-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
    >
      Continue with Google
    </button>
  );
};
