/* Amorvia Service Worker — offline caching */
const SW_VERSION = 'v1.1.0';
const STATIC_CACHE = `amorvia-static-${SW_VERSION}`;
const RUNTIME_CACHE = `amorvia-runtime-${SW_VERSION}`;
const PRECACHE_URLS = ['/', '/index.html', '/css/styles.css', '/js/bootstrap.js', '/favicon.png', '/manifest.json', '/offline.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS.filter(Boolean))));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => !key.includes(SW_VERSION) && caches.delete(key)));
    if ('navigationPreload' in self.registration) await self.registration.navigationPreload.enable();
    self.clients.claim();
  })());
});
function sameOrigin(u){ try{ return new URL(u).origin === self.location.origin }catch{ return false } }
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!sameOrigin(req.url)) return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/health')) return;
  if (req.headers.has('range')) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const net = await fetch(req);
        const c = await caches.open(RUNTIME_CACHE);
        c.put(req, net.clone());
        return net;
      } catch {
        const c = await caches.open(STATIC_CACHE);
        return (await c.match('/index.html')) || c.match('/offline.html');
      }
    })());
    return;
  }
  if (url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname === '/favicon.png' || url.pathname === '/manifest.json') {
    event.respondWith((async () => {
      const c = await caches.open(STATIC_CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok && res.type === 'basic') c.put(req, res.clone());
        return res;
      } catch {
        return hit || (await c.match('/offline.html')) || Response.error();
      }
    })());
    return;
  }
  if (url.pathname.endsWith('.json') || url.pathname.startsWith('/data/')) {
    event.respondWith((async () => {
      const c = await caches.open(RUNTIME_CACHE);
      try {
        const res = await fetch(req, { cache: 'no-store' });
        c.put(req, res.clone());
        return res;
      } catch {
        const hit = await c.match(req);
        return hit || new Response(JSON.stringify({ offline: true }), { headers: { 'Content-Type': 'application/json' }, status: 200 });
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const c = await caches.open(RUNTIME_CACHE);
    const hit = await c.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') c.put(req, res.clone());
      return res;
    } catch {
      return hit || Response.error();
    }
  })());
});
