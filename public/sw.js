/* M8 - offline support.
   Static assets: cache-first (they are hashed by deploy, refreshed on activate).
   Pages: network-first with a cache fallback, then the offline page.
   Text styling itself never needs the network — the engine is precached. */
const VERSION = 'stylix-v4';
const PRECACHE = [
  '/',
  '/offline.html',
  '/css/main.css',
  '/css/offline.css',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/js/ui.js',
  '/js/lib.js',
  '/js/generator.js',
  '/js/analytics.js',
  '/js/engine/engine.js',
  '/js/engine/mappings.js',
  '/js/engine/decorators.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const STATIC = /\.(?:css|js|svg|png|webmanifest|woff2?)$/;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (STATIC.test(url.pathname)) {
    // Stale-while-revalidate: instant cached response, and the fresh file is
    // fetched in the background so the next visit gets the update.
    event.respondWith(
      caches.match(request).then((cached) => {
        const refresh = fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return res;
          })
          .catch(() => cached || new Response('Offline', { status: 503, statusText: 'Offline' }));
        return cached || refresh;
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && request.mode === 'navigate') {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(request)) || (await caches.match('/offline.html'))),
  );
});
