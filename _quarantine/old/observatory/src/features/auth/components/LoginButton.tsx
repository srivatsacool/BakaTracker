import React from 'react';
import { useAuth } from '../hooks';

/**
 * LoginButton — INSERT COIN for the cloud save: sign in to carry your
 * save file across devices.
 */
export const LoginButton: React.FC = () => {
  const { login } = useAuth();

  return (
    <button
      onClick={() => login()}
      className="insert-coin w-full justify-center !py-2.5"
    >
      <span className="coin-slot" aria-hidden="true" />
      Continue with Google
    </button>
  );
};
