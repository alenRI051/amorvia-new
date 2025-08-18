/* sw.js - Offline cache with update message */
const VERSION = 'v0.3.' + Date.now();
const CORE_URLS = [
  '/', '/index.html',
  '/css/styles.css', '/css/ui.patch.css',
  '/js/bootstrap.js', '/js/app.v2.js', '/js/engine/scenarioEngine.js', '/js/app.js', '/js/metrics.js',
  '/data/v2-index.json', '/data/co-parenting-with-bipolar-partner.v2.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE_URLS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isHTML(req){ return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html'); }
function isData(url){ return url.pathname.startsWith('/data/'); }
function isStatic(url){ return url.pathname.match(/^\/(js|css|assets)\//); }

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (isHTML(req)) {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, net.clone());
        return net;
      } catch (e) {
        const cache = await caches.open(VERSION);
        const cached = await cache.match(req) || await cache.match('/index.html');
        return cached || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  if (isData(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const netPromise = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return cached || netPromise || new Response(JSON.stringify({ error: 'offline' }), { headers: {'content-type':'application/json'}, status: 200 });
    })());
    return;
  }

  if (isStatic(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const netPromise = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return cached || netPromise || new Response('', { status: 504 });
    })());
    return;
  }
});

// Inform clients when a new version is ready
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
