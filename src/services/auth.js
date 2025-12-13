// Google Authentication Service
import { GOOGLE_CONFIG } from '../config/google';

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient = null;

// Load the GAPI script
export const loadGapiScript = () => {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      gapiLoaded = true;
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gapiLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

// Load the GIS (Google Identity Services) script
export const loadGisScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      gisLoaded = true;
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

// Initialize GAPI client
export const initGapiClient = async () => {
  await loadGapiScript();
  
  return new Promise((resolve, reject) => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: GOOGLE_CONFIG.API_KEY,
          discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Initialize GIS token client
export const initTokenClient = async (onTokenResponse) => {
  await loadGisScript();
  
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CONFIG.CLIENT_ID,
    scope: GOOGLE_CONFIG.SCOPES,
    callback: onTokenResponse,
  });
  
  return tokenClient;
};

// Sign in user
export const signIn = () => {
  if (!tokenClient) {
    console.error('Token client not initialized');
    return;
  }
  
  // Check if we need consent or just an access token
  if (window.gapi.client.getToken() === null) {
    // Prompt user to select account and consent
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    // Skip consent if already granted
    tokenClient.requestAccessToken({ prompt: '' });
  }
};

// Sign out user
export const signOut = () => {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken(null);
  }
};

// Get current user info
export const getCurrentUser = async () => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${window.gapi.client.getToken()?.access_token}`,
      },
    });
    
    if (!response.ok) throw new Error('Failed to get user info');
    
    return await response.json();
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return window.gapi?.client?.getToken() !== null;
};
