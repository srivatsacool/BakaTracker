import React, { createContext, useMemo, useState } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { authConfig } from './config';
import type { IdentityProvider, User } from './types';
import { useStore } from '../../store/useStore';
import { LoadingScreen } from './components/LoadingScreen';

export const AuthContext = createContext<IdentityProvider | undefined>(undefined);

/** Guest/demo provider used when Auth0 is not configured or user skips login */
const guestProvider: IdentityProvider = {
  user: {
    id: 'guest',
    email: 'guest@demo.local',
    name: 'Guest Explorer',
    picture: undefined,
    provider: 'guest',
  },
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: async () => {
    // No-op in guest mode (handled by UI)
  },
  logout: async () => {
    // No-op in guest mode
  },
  getAccessToken: async () => '',
};

const AuthProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user: auth0User,
    isAuthenticated: auth0Authenticated,
    isLoading: auth0Loading,
    error: auth0Error,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Clear state on logout
  const resetStore = useStore(state => state.resetStore);

  // Demo mode: when Auth0 IS configured but user chose "Explore Demo"
  const [isDemoMode, _setDemoMode] = useState(() =>
    localStorage.getItem('bt_demo_mode') === 'true'
  );

  if (isDemoMode) {
    const demoOverrides: IdentityProvider = {
      ...guestProvider,
      login: async (options) => {
        // Sign in: clear demo mode, redirect to Auth0
        localStorage.removeItem('bt_demo_mode');
        localStorage.removeItem('bt_first_run');
        setIsRedirecting(true);
        try {
          await loginWithRedirect(options);
        } finally {
          setIsRedirecting(false);
        }
      },
      logout: async () => {
        localStorage.removeItem('bt_demo_mode');
        localStorage.removeItem('bt_first_run');
        resetStore();
      },
    };
    return (
      <AuthContext.Provider value={demoOverrides}>
        {children}
      </AuthContext.Provider>
    );
  }

  const mappedUser = useMemo<User | null>(() => {
    if (!auth0User || !auth0User.sub || !auth0User.email) {
      return null;
    }
    return {
      id: auth0User.sub,
      email: auth0User.email,
      name: auth0User.name || auth0User.nickname || 'Authenticated User',
      picture: auth0User.picture,
      provider: 'auth0',
    };
  }, [auth0User]);

  const value = useMemo<IdentityProvider>(() => ({
    user: mappedUser,
    isAuthenticated: auth0Authenticated,
    isLoading: auth0Loading || isSigningOut,
    error: auth0Error || null,
    login: async (options) => {
      setIsRedirecting(true);
      try {
        await loginWithRedirect(options);
      } finally {
        setIsRedirecting(false);
      }
    },
    logout: async (options) => {
      setIsSigningOut(true);
      try {
        // Clear local storage and Zustand state
        resetStore();
        await auth0Logout({
          logoutParams: {
            returnTo: options?.returnTo || window.location.origin,
          },
          ...options,
        });
      } finally {
        setIsSigningOut(false);
      }
    },
    getAccessToken: async (options) => {
      return (await getAccessTokenSilently(options)) as unknown as string;
    },
  }), [mappedUser, auth0Authenticated, auth0Loading, isSigningOut, auth0Error, loginWithRedirect, auth0Logout, getAccessTokenSilently, resetStore]);

  // Handle simplified loading states
  const isCallback = window.location.search.includes('code=') && window.location.search.includes('state=');
  
  const loadingMessage = isSigningOut
    ? 'Signing out...'
    : isRedirecting
      ? 'Checking session...' // Keep it simple and transition smooth
      : isCallback
        ? 'Signing in...'
        : 'Checking session...';

  const showLoading = auth0Loading || isSigningOut || isRedirecting;

  if (showLoading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authConfig.domain || !authConfig.clientId) {
    // No Auth0 configured — run in guest/demo mode so the app is fully accessible
    return (
      <AuthContext.Provider value={guestProvider}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <Auth0Provider
      domain={authConfig.domain}
      clientId={authConfig.clientId}
      authorizationParams={{
        redirect_uri: authConfig.redirectUri,
        audience: authConfig.audience || undefined,
        scope: 'openid profile email',
      }}
      cacheLocation="memory"
      useRefreshTokens={false}
    >
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </Auth0Provider>
  );
};
