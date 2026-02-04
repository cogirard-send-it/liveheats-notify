// v4
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'LiveHeats Update', body: 'New event update' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/liveheats-notify/icon.png' // optional if you add an icon file
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/liveheats-notify/') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/liveheats-notify/');
    })
  );
});
self.addEventListener("push", (event) => {
  const data = event.data?.json() || { title: "Update", body: "New LiveHeats event update" };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png"
    })
  );
});
