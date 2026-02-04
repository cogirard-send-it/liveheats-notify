// v6 — bump this number when you change the SW to bust caches

// Handle incoming push messages and MUST show a visible notification on iOS.
self.addEventListener('push', (event) => {
  let data = { title: 'LiveHeats Update', body: 'New event update' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    // Non-JSON payload — keep defaults
  }

  const options = {
    body: data.body,
    icon: '/liveheats-notify/icon.png',
    badge: '/liveheats-notify/icon.png',
    data: {
      url: data.url || '/liveheats-notify/'
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/liveheats-notify/';

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        if (client.url.includes('/liveheats-notify/') && 'focus' in client) {
          await client.focus();
          return;
        }
      } catch (_) {}
    }
    if (clients.openWindow) {
      await clients.openWindow(targetUrl);
    }
  })());
});

self.addEventListener('install', () => {
  self.skipWaiting?.();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
