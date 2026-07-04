import type { User } from '../types/User';

export interface IdentityProvider {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (options?: any) => Promise<void>;
  logout: (options?: any) => Promise<void>;
  getAccessToken: (options?: any) => Promise<string>;
}
