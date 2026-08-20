/**
 * Custom Service Worker for BakaTracker.
 *
 * Handles incoming Web Push notifications and notification-click navigation.
 * The browser-side push subscription (PushManager.subscribe) happens in the
 * main thread — this SW only RECEIVES push events.
 *
 * vite-plugin-pwa injectManifest mode replaces the placeholder
 * `self.__WB_MANIFEST` with the precache list at build time.
 */

self.__WB_MANIFEST;

// --- Push handler -----------------------------------------------------------
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Not JSON — show raw text.
    payload = { title: 'BakaTracker', body: event.data.text() };
  }

  const title = payload.title ?? 'BakaTracker';
  const body = payload.body ?? '';
  const icon = payload.icon ?? '/logo.png';
  const badge = payload.badge ?? '/logo.png';
  const tag = payload.tag ?? 'bakatracker-notification';
  const url = payload.url ?? '/';
  const priority = payload.priority ?? 'normal';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url },
      // Low priority notifications are silent (no sound / no heads-up on mobile).
      silent: priority === 'low',
      // Keep the notification in the tray until the user acts.
      requireInteraction: priority === 'high',
    }),
  );
});

// --- Notification click handler ---------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/';
  const origin = self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a BakaTracker window is already open, focus it and navigate.
      for (const client of clientList) {
        if (client.url.startsWith(origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window.
      self.clients.openWindow(targetUrl);
    }),
  );
});
