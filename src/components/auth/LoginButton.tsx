import React from 'react';
import { useAuth } from '../../auth/useAuth';

export const LoginButton: React.FC = () => {
  const { login } = useAuth();

  return (
    <button
      onClick={() => login()}
      className="neo-button bg-accent-pink text-black text-sm font-bold w-full"
    >
      Log In
    </button>
  );
};
