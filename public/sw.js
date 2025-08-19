// Amorvia Service Worker
// Deterministic version (bump on each deploy)
const VERSION = 'v0.5-2025-08-19';
const CACHE_NAME = `amorvia-${VERSION}`;

// Precache essentials
const CORE = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE)).catch(() => null));
  // keep waiting state for update prompt UX
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k.startsWith('amorvia-') && k !== CACHE_NAME ? caches.delete(k) : null));
  })());
  self.clients.claim();
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(req, {ignoreVary:true});
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(req, {ignoreVary:true});
  if (hit) return hit;
  const fresh = await fetch(req);
  cache.put(req, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, {ignoreVary:true});
  const fetching = fetch(req).then(res => { cache.put(req, res.clone()); return res; }).catch(() => null);
  return cached || await fetching;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  const isNav = event.request.mode === 'navigate' || (event.request.destination === 'document');
  const isData = url.pathname.startsWith('/data/');
  const isStatic = /\/(?:js|css|assets)\//.test(url.pathname);

  if (isNav) { event.respondWith(networkFirst(event.request)); return; }
  if (isData) { event.respondWith(staleWhileRevalidate(event.request)); return; }
  if (isStatic){ event.respondWith(cacheFirst(event.request)); return; }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
