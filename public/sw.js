const CACHE_NAME = 'kleo-v2';
const ASSETS = [
  '/',
  '/index.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Network first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (e) => {
  let data = { title: 'Kleo', body: 'Tienes una notificación' };

  try {
    data = e.data.json();
  } catch {
    data.body = e.data?.text() || data.body;
  }

  const options = {
    body: data.body,
    icon: data.icon || '/apple-touch-icon.png',
    badge: data.badge || '/apple-touch-icon.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Abrir Kleo' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Al tocar la notificación, abrir la app
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const url = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of windowClients) {
        if (client.url.includes('kleopr.com') && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir nueva
      return clients.openWindow(url);
    })
  );
});
