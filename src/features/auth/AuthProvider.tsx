import React, { createContext, useMemo, useState } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { authConfig } from './config';
import type { IdentityProvider, User } from './types';
import { useStore } from '../../store/useStore';
import { LoadingScreen } from './components/LoadingScreen';

export const AuthContext = createContext<IdentityProvider | undefined>(undefined);

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
    return (
      <div className="min-h-screen bg-[#F8F5F0] text-black flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full border-4 border-black bg-white p-8 rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
          <h2 className="text-2xl font-black uppercase tracking-tight">Auth0 Config Missing</h2>
          <p className="font-mono text-sm leading-relaxed text-gray-700">
            It looks like your Auth0 environment variables are not set. Please create a <code className="bg-gray-100 border border-gray-300 px-1 py-0.5 rounded font-bold text-xs">.env</code> file in the project root with the following details:
          </p>
          <pre className="bg-[#FFF0F0] border-2 border-black p-4 font-mono text-xs overflow-x-auto text-danger font-bold">
{`VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-api-audience
VITE_AUTH0_REDIRECT_URI=http://localhost:5173`}
          </pre>
          <div className="text-xs text-gray-500 font-mono">
            For details, refer to the Authentication section in the README.md.
          </div>
        </div>
      </div>
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
