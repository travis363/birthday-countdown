// Service worker — receives the birthday push and shows the notification,
// even when the app is closed.
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || 'HAPPY 12th BDAY BABY GIRL!!!!';
  const body = data.body || 'HOPE YOU HAVE AN AMAZING DAY 💖 LOVE DAD & KRISTEN';
  const url = data.url || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      vibrate: [200, 100, 200, 100, 300, 100, 400],
      tag: 'birthday',
      renotify: true,
      requireInteraction: true,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Open the app (works at a domain root or a /repo/ subpath).
  const scope = self.registration.scope;
  event.waitUntil((async () => {
    try {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Only focus a window that's actually THIS app; otherwise open a fresh one.
      for (const c of wins) {
        if (c.url && c.url.startsWith(scope) && 'focus' in c) {
          return await c.focus();
        }
      }
    } catch (_) { /* fall through to open a new window */ }
    if (self.clients.openWindow) return self.clients.openWindow(scope);
  })());
});
