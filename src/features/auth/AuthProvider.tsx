import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authConfig } from './config';
import type { IdentityProvider, User } from './types';
import { useStore } from '../../store/useStore';
import { LoadingScreen } from './components/LoadingScreen';

export const AuthContext = createContext<IdentityProvider | undefined>(undefined);
// eslint-disable-next-line react-refresh/only-export-components
export type { IdentityProvider };

// ---------------------------------------------------------------------------
// OAuth client helpers (RFC 7636 PKCE + RFC 7591 dynamic client registration)
//
// The Worker is the OAuth provider for this SPA. We register ourselves as a
// public client (no secret, PKCE only), redirect to the Worker's /authorize,
// the Worker handles Google consent, and we exchange the returned code at
// /token. The access token then authenticates every REST call.
// ---------------------------------------------------------------------------

const SESSION_TOKEN = 'bt_oauth_token';
const SESSION_REFRESH = 'bt_oauth_refresh';
const SESSION_EXPIRES = 'bt_oauth_expires_at';
const SESSION_VERIFIER = 'bt_oauth_verifier';
const SESSION_STATE = 'bt_oauth_state';
const SESSION_CLIENT = 'bt_oauth_client_id';

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(len: number): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(len)));
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

const workerBaseUrl = () => authConfig.domain.replace(/\/$/, '');
const redirectUri = () => authConfig.redirectUri;

/** Guest/demo provider used when OAuth is not configured or user skips login */
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
    // No-op in guest mode (handled by DemoButton in the UI)
  },
  logout: async () => {
    // No-op in guest mode
  },
  getAccessToken: async () => '',
};

/** Register this app as a public OAuth client on the Worker (RFC 7591). */
async function ensureClientId(): Promise<string> {
  const cached = sessionStorage.getItem(SESSION_CLIENT);
  if (cached) return cached;

  const res = await fetch(`${workerBaseUrl()}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'BakaTracker PWA',
      redirect_uris: [redirectUri()],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: 'openid profile email',
    }),
  });
  if (!res.ok) throw new Error(`Client registration failed (${res.status})`);
  const data = await res.json();
  // workers-oauth-provider returns `client_id` (snake_case, RFC 7591).
  const clientId = data.client_id || data.clientId;
  if (!clientId) throw new Error('Client registration returned no client_id');
  sessionStorage.setItem(SESSION_CLIENT, clientId);
  return clientId;
}

const AuthProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const resetStore = useStore((state) => state.resetStore);

  // Demo mode: when OAuth IS configured but user chose "Explore Demo"
  const isDemoMode = useMemo(() => localStorage.getItem('bt_demo_mode') === 'true', []);

  const getAccessToken = useCallback(async (_options?: unknown): Promise<string> => {
    const token = sessionStorage.getItem(SESSION_TOKEN);
    if (!token) return '';
    const expiresAt = Number(sessionStorage.getItem(SESSION_EXPIRES)) || 0;
    if (Date.now() < expiresAt) return token;

    // Expired (or nearly): try the refresh token once.
    const refresh = sessionStorage.getItem(SESSION_REFRESH);
    if (!refresh) {
      sessionStorage.removeItem(SESSION_TOKEN);
      return '';
    }
    const res = await fetch(`${workerBaseUrl()}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh,
        client_id: sessionStorage.getItem(SESSION_CLIENT) || (await ensureClientId()),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      sessionStorage.removeItem(SESSION_TOKEN);
      sessionStorage.removeItem(SESSION_REFRESH);
      sessionStorage.removeItem(SESSION_EXPIRES);
      return '';
    }
    sessionStorage.setItem(SESSION_TOKEN, data.access_token);
    if (data.refresh_token) sessionStorage.setItem(SESSION_REFRESH, data.refresh_token);
    sessionStorage.setItem(SESSION_EXPIRES, String(Date.now() + (data.expires_in ?? 3600) * 1000));
    return data.access_token;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate the user profile from the worker (whoami) using the stored token.
  const hydrate = useCallback(async (): Promise<boolean> => {
    const token = await getAccessToken();
    if (!token) return false;
    try {
      const res = await fetch(`${workerBaseUrl()}/api/v1/whoami`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const profile = await res.json();
      setUser({
        id: profile.sub,
        email: profile.email || '',
        name: profile.name || 'Authenticated User',
        provider: 'google',
      });
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  }, [getAccessToken]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      // 1) OAuth callback: `?code=...&state=...` after the Worker redirects back.
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const storedState = sessionStorage.getItem(SESSION_STATE);
      const verifier = sessionStorage.getItem(SESSION_VERIFIER);

      if (code && state && state === storedState && verifier) {
        try {
          const clientId = await ensureClientId();
          const res = await fetch(`${workerBaseUrl()}/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: redirectUri(),
              client_id: clientId,
              code_verifier: verifier,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.access_token) {
            throw new Error(data.error_description || data.error || 'Token exchange failed');
          }
          sessionStorage.setItem(SESSION_TOKEN, data.access_token);
          if (data.refresh_token) sessionStorage.setItem(SESSION_REFRESH, data.refresh_token);
          sessionStorage.setItem(SESSION_EXPIRES, String(Date.now() + (data.expires_in ?? 3600) * 1000));
          sessionStorage.removeItem(SESSION_VERIFIER);
          sessionStorage.removeItem(SESSION_STATE);
          // Clean the URL so a reload doesn't re-consume the code.
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e : new Error('Sign-in failed'));
        }
      }

      // 2) Existing session: hydrate from whoami.
      if (!cancelled) {
        const ok = await hydrate();
        if (!ok) {
          // No usable session — stay anonymous; ProtectedRoute bounces to Landing.
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
      if (!cancelled) setIsLoading(false);
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const login = useCallback(async () => {
    setIsRedirecting(true);
    try {
      const clientId = await ensureClientId();
      const verifier = randomString(32);
      const challenge = await pkceChallenge(verifier);
      const state = randomString(16);
      sessionStorage.setItem(SESSION_VERIFIER, verifier);
      sessionStorage.setItem(SESSION_STATE, state);

      const url = new URL(`${workerBaseUrl()}/authorize`);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri());
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid profile email');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
      window.location.href = url.toString();
    } catch (e) {
      setIsRedirecting(false);
      setError(e instanceof Error ? e : new Error('Unable to start sign-in'));
    }
  }, []);

  const logout = useCallback(async (options?: { returnTo?: string }) => {
    setIsSigningOut(true);
    try {
      resetStore();
      sessionStorage.removeItem(SESSION_TOKEN);
      sessionStorage.removeItem(SESSION_REFRESH);
      sessionStorage.removeItem(SESSION_EXPIRES);
      sessionStorage.removeItem(SESSION_VERIFIER);
      sessionStorage.removeItem(SESSION_STATE);
      window.location.href = options?.returnTo || redirectUri();
    } finally {
      setIsSigningOut(false);
    }
  }, [resetStore]);

  // Build the context value BEFORE any conditional returns so React hooks
  // always fire in the same order every render.
  const contextValue: IdentityProvider = isDemoMode
    ? {
        ...guestProvider,
        login: async () => {
          localStorage.removeItem('bt_demo_mode');
          localStorage.removeItem('bt_first_run');
          await login();
        },
        logout: async () => {
          localStorage.removeItem('bt_demo_mode');
          localStorage.removeItem('bt_first_run');
          resetStore();
        },
      }
    : {
        user,
        isAuthenticated,
        isLoading: isLoading || isSigningOut,
        error,
        login,
        logout,
        getAccessToken,
      };

  // Handle simplified loading states
  const isCallback = typeof window !== 'undefined'
    ? window.location.search.includes('code=') && window.location.search.includes('state=')
    : false;

  const loadingMessage = isSigningOut
    ? 'Signing out...'
    : isRedirecting
      ? 'Checking session...'
      : isCallback
        ? 'Signing in...'
        : 'Checking session...';

  if (isLoading || isSigningOut || isRedirecting) {
    return <LoadingScreen message={loadingMessage} />;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authConfig.domain || !authConfig.clientId) {
    // No Google OAuth configured — run in guest/demo mode so the app is fully accessible
    return (
      <AuthContext.Provider value={guestProvider}>
        {children}
      </AuthContext.Provider>
    );
  }

  return <AuthProviderInner>{children}</AuthProviderInner>;
};
