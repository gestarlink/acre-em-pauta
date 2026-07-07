/* Acre em Pauta — push-only service worker (no caching) */
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { payload = { title: event.data && event.data.text() }; }
  const title = payload.title || "Acre em Pauta";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon.png",
    badge: "/favicon.png",
    image: payload.image || undefined,
    tag: payload.tag || "aep-news",
    renotify: true,
    data: { url: payload.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cls) => {
      for (const c of cls) {
        try {
          const u = new URL(c.url);
          if (u.pathname === url && "focus" in c) return c.focus();
        } catch (_) {}
      }
      return self.clients.openWindow(url);
    })
  );
});