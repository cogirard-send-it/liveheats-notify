// v5 — bump this number (v6, v7, ...) whenever you change the SW to bust caches

// Handle incoming push messages and MUST show a visible notification on iOS.
self.addEventListener('push', (event) => {
  // Expect JSON payloads like: { title: "...", body: "...", url: "..." }
  // If nothing provided, show a generic update message.
  let data = { title: 'LiveHeats Update', body: 'New event update' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    // If payload isn't JSON, fall back to default message
  }

  const options = {
    body: data.body,
    // Optional: add an icon you host in your repo (drop a PNG into the repo if you want)
    // Make sure the path includes your repo subfolder on GitHub Pages.
    icon: '/liveheats-notify/icon.png',
    badge: '/liveheats-notify/icon.png', // optional; iOS ignores badge, safe to include
    data: {
      // Store a target URL so we can navigate/focus on click
      url: data.url || '/liveheats-notify/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Focus an existing app window if it’s already open; otherwise open the app.
// This improves UX so taps take the user back to your PWA.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url)
