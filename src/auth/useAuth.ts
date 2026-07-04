import { useContext } from 'react';
import { AuthContext } from './AuthProvider';
import type { IdentityProvider } from './provider';

export const useAuth = (): IdentityProvider => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
