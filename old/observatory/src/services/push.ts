/**
 * Web Push subscription manager — the browser-side counterpart to the
 * worker's WebPushDelivery. Handles subscribing/unsubscribing to push
 * notifications and registering the subscription with the backend.
 *
 * VAPID public key is read from `import.meta.env.VITE_VAPID_PUBLIC_KEY`
 * (set via env / wrangler vars at build time). The private key is a
 * Wrangler secret — never exposed to the browser.
 */

/** Convert a base64url string to a Uint8Array (required by PushManager). */
function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 ? '='.repeat(4 - (base64.length % 4)) : '';
  const binary = atob(base64 + pad);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function getVapidPublicKey(): string | null {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY ?? null;
}

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL as string;
}

/** How long to wait for an active service worker before giving up. */
const SW_READY_TIMEOUT_MS = 5_000;

/**
 * Resolve the active service worker registration, or null when no service
 * worker is registered within `timeoutMs`.
 *
 * `navigator.serviceWorker.ready` NEVER settles (and never rejects) when no
 * SW is registered — e.g. local dev with vite-plugin-pwa devOptions disabled.
 * Awaiting it directly hangs the caller forever; every caller here races it
 * against a timeout so the UI can fall back to the graceful error path.
 */
async function readyServiceWorker(
  timeoutMs = SW_READY_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

/**
 * Subscribe the current browser to Web Push notifications.
 *
 * Flow:
 * 1. Ensure the service worker is registered (vite-plugin-pwa handles this,
 *    but we also call `navigator.serviceWorker.ready` to be certain).
 * 2. Check for an existing subscription (idempotent).
 * 3. Call `pushManager.subscribe()` with the VAPID public key.
 * 4. POST the subscription to the backend via `/push/subscription`.
 * 5. Store the subscription endpoint in localStorage for later cleanup.
 */
export async function subscribeToPush(accessToken: string): Promise<{ success: boolean; message?: string }> {
  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    return { success: false, message: 'Push notifications are not configured (missing VAPID key).' };
  }

  // VAPID keys must be URL-safe base64 → buffer for the browser.
  const applicationServerKey = base64UrlToBuffer(vapidKey);

  const registration = await readyServiceWorker();
  if (!registration) {
    return { success: false, message: 'Service worker not available. Try installing the app first.' };
  }

  let subscription: PushSubscription | null = null;
  try {
    subscription = await registration.pushManager.getSubscription();
  } catch {
    // No existing subscription — will create one.
  }

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowed') || msg.includes('permission')) {
        return { success: false, message: 'Push notification permission denied. Enable notifications in your browser settings.' };
      }
      return { success: false, message: `Failed to subscribe to push: ${msg}` };
    }
  }

  // Send the subscription to the backend.
  const endpoint = subscription.endpoint;
  const p256dh = btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const auth = btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const apiBase = getApiBaseUrl();
  try {
    const res = await fetch(`${apiBase}/api/v1/push/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        endpoint,
        keys: { p256dh, auth },
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, message: body.message || `Server rejected subscription (${res.status}).` };
    }
  } catch {
    return { success: false, message: 'Failed to register subscription with server. Check your connection.' };
  }

  // Remember the endpoint for later unsubscribe.
  localStorage.setItem('bt_push_endpoint', endpoint);

  return { success: true };
}

/**
 * Unsubscribe from push notifications and remove the subscription from the
 * backend. Idempotent — if already unsubscribed, returns success.
 */
export async function unsubscribeFromPush(accessToken: string): Promise<{ success: boolean; message?: string }> {
  const savedEndpoint = localStorage.getItem('bt_push_endpoint');

  const registration = await readyServiceWorker();
  if (!registration) {
    return { success: false, message: 'Service worker not available.' };
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  } catch {
    // Best effort — continue with backend cleanup.
  }

  // Remove from backend.
  const apiBase = getApiBaseUrl();
  try {
    await fetch(`${apiBase}/api/v1/push/subscription`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
      // If we have the endpoint from localStorage, send it for targeted removal.
      ...(savedEndpoint ? { body: JSON.stringify({ endpoint: savedEndpoint }) } : {}),
    });
  } catch {
    // Best effort.
  }

  localStorage.removeItem('bt_push_endpoint');

  return { success: true };
}

/**
 * Check if the current browser is already subscribed to push notifications.
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    const registration = await readyServiceWorker();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}
