const CACHE_NAME = 'the-table-search-shell-v1';
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/data/content-manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const requestUrl = new URL(event.request.url);
        if (requestUrl.origin !== self.location.origin) {
          return response;
        }

        const shouldCache = requestUrl.pathname === '/' ||
          requestUrl.pathname.endsWith('.html') ||
          requestUrl.pathname.startsWith('/data/');

        if (shouldCache) {
          const cloned = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }

        return response;
      });
    })
  );
});

