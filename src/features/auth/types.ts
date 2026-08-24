export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google' | 'guest';
}

/** Metadata about the current session mode */
export type AuthMode = 'authenticated' | 'guest' | 'loading' | 'unauthenticated';

export interface IdentityProvider {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  /* eslint-disable @typescript-eslint/no-explicit-any -- polymorphic auth boundary: login/logout/getAccessToken accept provider-specific options */
  login: (options?: any) => Promise<void>;
  logout: (options?: any) => Promise<void>;
  getAccessToken: (options?: any) => Promise<string>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
