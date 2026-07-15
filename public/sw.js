// sw.js — Service Worker Archangel PWA
// Stratégie : Cache-First pour les assets statiques, Network-First pour l'API

const CACHE_NAME = 'archangel-v1';
const STATIC_ASSETS = [
  '/',
  '/style.css',
  '/app.js',
  '/assets/avatar-default.svg',
  '/assets/icons/logout.jpg',
  '/assets/icons/attach.jpg',
  '/assets/icons/ephemeral.jpg',
  '/assets/icons/schedule.jpg',
  '/assets/icons/wallpaper.jpg',
  '/assets/icons/voice-call.jpg',
  '/assets/icons/scheduled-msg.jpg',
  '/assets/icons/block.jpg',
  '/assets/icons/video-call.svg',
  '/assets/icons/theme.svg',
  '/assets/icons/search.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// --- Installation : mise en cache des assets statiques ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// --- Activation : nettoyage des anciens caches ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// --- Fetch : stratégie de cache selon le type de requête ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Socket.io et API : toujours réseau (pas de cache)
  if (
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/')
  ) {
    return; // laisse le navigateur gérer normalement
  }

  // Assets statiques : Cache-First, puis réseau
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Mettre en cache les nouvelles ressources statiques valides
          if (
            response.ok &&
            response.type !== 'opaque' &&
            (url.origin === self.location.origin)
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Hors ligne : retourner la page principale depuis le cache
          if (request.destination === 'document') {
            return caches.match('/');
          }
        });
    })
  );
});

// --- Push notifications (préparation future) ---
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); }
  catch (e) { data = { title: 'Archangel', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Archangel', {
      body: data.body || 'Nouveau message',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data: data.url ? { url: data.url } : undefined,
      actions: [
        { action: 'open', title: 'Ouvrir' },
        { action: 'close', title: 'Fermer' }
      ]
    })
  );
});

// Clic sur notification : ouvrir l'application
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((w) => w.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
