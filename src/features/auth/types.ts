export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'auth0';
}

export interface IdentityProvider {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (options?: any) => Promise<void>;
  logout: (options?: any) => Promise<void>;
  getAccessToken: (options?: any) => Promise<string>;
}
