/* Amorvia Service Worker — offline caching */
const SW_VERSION = 'v1.0.1';
const STATIC_CACHE = `amorvia-static-${SW_VERSION}`;
const RUNTIME_CACHE = `amorvia-runtime-${SW_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/bootstrap.js',
  '/favicon.png',
  '/manifest.json',
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
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (!key.includes(SW_VERSION)) return caches.delete(key);
    }));
    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    self.clients.claim();
  })());
});

function sameOrigin(u) { try { return new URL(u).origin === self.location.origin; } catch { return false; } }

self.addEventListener('fetch', (event) => {
  const r = event.request;
  if (r.method !== 'GET') return;
  if (!sameOrigin(r.url)) return;
  const url = new URL(r.url);
  if (url.pathname.startsWith('/api/health')) return;
  if (r.headers.has('range')) return;

  if (r.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const net = await fetch(r);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(r, net.clone());
        return net;
      } catch {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match('/index.html')) || cache.match('/offline.html');
      }
    })());
    return;
  }

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
      const cached = await cache.match(r);
      if (cached) return cached;
      try {
        const res = await fetch(r);
        if (res.ok && res.type === 'basic') cache.put(r, res.clone());
        return res;
      } catch {
        const fallback = await cache.match('/offline.html');
        return cached || fallback || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.endsWith('.json') || url.pathname.startsWith('/data/')) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      try {
        const res = await fetch(r, { cache: 'no-store' });
        cache.put(r, res.clone());
        return res;
      } catch {
        const cached = await cache.match(r);
        return cached || new Response(JSON.stringify({ offline: true }), {
          headers: { 'Content-Type': 'application/json' }, status: 200
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(r);
    if (cached) return cached;
    try {
      const res = await fetch(r);
      if (res.ok && res.type === 'basic') cache.put(r, res.clone());
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});
