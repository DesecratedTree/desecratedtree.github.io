// DUNKSTAR offline shell.
//
// The game is a static page with no backend, so the whole app can live in the
// cache and launch from a home-screen icon with no network at all.
//
// Bump VERSION whenever shipped files change: that replaces the old cache.
const VERSION = 'dunkstar-v10';

const CORE = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './src/main.js',
  './src/config.js',
  './src/layout.js',
  './src/game.js',
  './src/world.js',
  './src/physics.js',
  './src/input.js',
  './src/storage.js',
  './src/scoring.js',
  './src/ui.js',
  './src/audio.js',
  './src/balls.js',
  './src/render/arena.js',
  './src/render/ball.js',
  './src/render/ball-skins.js',
  './src/render/fx.js',
  './src/render/hoop.js',
  './assets/basketball.png',
  './assets/balls/aurora.png',
  './assets/balls/eclipse.png',
  './assets/balls/nebula.png',
  './assets/balls/nova.png',
  './assets/balls/void.png',
  './assets/balls/watermelon.png',
  './assets/fonts/orbitron.woff2',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations go to the network first so a deploy is picked up, with the
  // cached shell as the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // Everything else: serve from cache immediately, refresh in the background.
  // ignoreSearch keeps `styles.css?v=12` matching the precached `styles.css`.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || new Response('', { status: 504, statusText: 'Offline' }));
      return cached || network;
    })
  );
});
