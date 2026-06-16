const CACHE_NAME = 'magic-wall-v1';
const CORE_ASSETS = [
  './magic-wall.html',
  './magic-wall-remote.html',
  './icon-wall-192.png',
  './icon-wall-512.png',
  './icon-remote-192.png',
  './icon-remote-512.png',
];

// Install: pre-cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML, cache-first for CDN assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET, chrome-extension, etc
  if (e.request.method !== 'GET') return;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // CDN assets (fonts, libraries): cache-first
  if (url.hostname.includes('cdn') || url.hostname.includes('unpkg') ||
      url.hostname.includes('googleapis') || url.hostname.includes('gstatic') ||
      url.hostname.includes('jsdelivr')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Same-origin: network-first, fallback to cache
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
});
