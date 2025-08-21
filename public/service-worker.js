/* Amorvia Service Worker — versioned caches, auto-activate */
const SCRIPT_URL = (self.registration && self.registration.scriptURL) || self.location.href;
const VERSION = new URL(SCRIPT_URL, self.location).searchParams.get('v') || 'dev';
const PREFIX = 'amorvia';
const STATIC = `${PREFIX}-static-${VERSION}`;
const RUNTIME = `${PREFIX}-rt-${VERSION}`;

// Core assets to precache (add ?v= to align cache keys)
const v = (u) => {
  try {
    const url = new URL(u, self.location.origin);
    url.searchParams.set('v', VERSION);
    return url.toString();
  } catch { return u; }
};

const CORE = [
  '/', '/index.html',
  v('/css/styles.css'),
  v('/css/ui.patch.css'),
  v('/js/bootstrap.js')
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC).then((cache) => cache.addAll(CORE)).catch(()=>{})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith(PREFIX) && !k.endsWith(VERSION))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Strategy helpers
const isHTMLNavigation = (req) => req.mode === 'navigate' ||
  (req.headers.get('accept') || '').includes('text/html');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navigation: network-first with cache fallback for offline
  if (isHTMLNavigation(req)) {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(RUNTIME);
        cache.put(req, net.clone());
        return net;
      } catch {
        const cache = await caches.open(RUNTIME);
        const match = await cache.match(req) || await caches.match('/index.html');
        return match || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate
  if (url.origin === location.origin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/'))) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then((net) => {
        cache.put(req, net.clone());
        return net;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }

  // Default: pass-through
});
