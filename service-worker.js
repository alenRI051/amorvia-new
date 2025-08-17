\
/* Amorvia Service Worker — offline caching
   Strategy summary:
   - Precache app shell (index, CSS, JS, icons, manifest)
   - Cache-first for static assets (/css, /js, /assets, /icons, /favicon.png)
   - Network-first for JSON/data (to keep scenarios fresh)
   - Network-first for navigations with offline fallback to /offline.html
   - Skip /api/health and third-party requests
*/

const SW_VERSION = 'v1.0.0';
const STATIC_CACHE = `amorvia-static-${SW_VERSION}`;
const RUNTIME_CACHE = `amorvia-runtime-${SW_VERSION}`;

// Core files to precache (adjust if filenames change)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/bootstrap.js',
  '/favicon.png',
  '/manifest.json',
  // icons (if present)
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS.filter(Boolean)))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean old caches
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (!key.includes(SW_VERSION)) {
          return caches.delete(key);
        }
      })
    );
    // Enable navigation preload for faster network-first navigations
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    self.clients.claim();
  })());
});

function isSameOrigin(url) {
  try {
    const u = new URL(url);
    return u.origin === self.location.origin;
  } catch (_) {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass non-same-origin requests
  if (!isSameOrigin(request.url)) return;

  // Bypass API health check
  if (url.pathname.startsWith('/api/health')) return;

  // Avoid caching range requests (media)
  if (request.headers.has('range')) return;

  // NAVIGATION requests (user enters/refreshes a page)
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Try network first with navigation preload, then cache, then offline page
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const network = await fetch(request);
        // Put a copy in runtime cache
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, network.clone());
        return network;
      } catch (err) {
        // Fallback to cached index.html (SPA) or offline page
        const cache = await caches.open(STATIC_CACHE);
        const cachedIndex = await cache.match('/index.html');
        return cachedIndex || cache.match('/offline.html');
      }
    })());
    return;
  }

  // STATIC assets: cache-first
  if (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.png' ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        // Only cache successful, basic/opaque responses from our origin
        if (res.ok && res.type === 'basic') {
          cache.put(request, res.clone());
        }
        return res;
      } catch (err) {
        // attempt offline fallback for images/icons if available
        const fallback = await cache.match('/offline.html');
        return cached || fallback || Response.error();
      }
    })());
    return;
  }

  // JSON/data: network-first with cache fallback
  if (url.pathname.endsWith('.json') || url.pathname.startsWith('/data/')) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      try {
        const res = await fetch(request, { cache: 'no-store' });
        cache.put(request, res.clone());
        return res;
      } catch (err) {
        const cached = await cache.match(request);
        return cached || new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }
    })());
    return;
  }

  // Default: try cache, then network
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const res = await fetch(request);
      if (res.ok && res.type === 'basic') {
        cache.put(request, res.clone());
      }
      return res;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});
