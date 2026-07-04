export const config = {
  auth: {
    domain: (import.meta.env.VITE_AUTH0_DOMAIN as string) || '',
    clientId: (import.meta.env.VITE_AUTH0_CLIENT_ID as string) || '',
    audience: (import.meta.env.VITE_AUTH0_AUDIENCE as string) || '',
    redirectUri: (import.meta.env.VITE_AUTH0_REDIRECT_URI as string) || window.location.origin,
  },
  api: {
    baseUrl: (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000',
    version: 'v1',
  },
};

console.log(import.meta.env);