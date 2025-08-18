/* sw.js - Offline cache for Amorvia */
const VERSION = 'v0.2.' + Date.now();
const CORE_URLS = [
  '/', '/index.html',
  '/css/styles.css', '/css/ui.patch.css',
  '/js/bootstrap.js', '/js/app.v2.js', '/js/engine/scenarioEngine.js', '/js/app.js',
  '/data/v2-index.json', '/data/co-parenting-with-bipolar-partner.v2.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const results = await Promise.allSettled(CORE_URLS.map(u => fetch(u, { cache: 'no-store' })));
    const ok = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.ok) ok.push(new Response(r.value.clone().body, { headers: r.value.headers }));
      else console.warn('[sw] skip precache', CORE_URLS[i]);
    });
    // Add to cache by refetching OK ones to keep request info
    await cache.addAll(CORE_URLS.filter((u, i) => results[i].status === 'fulfilled' && results[i].value.ok));
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
    // Network first for HTML
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
    // Cache-first for data (works offline), update in background
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const netPromise = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return cached || netPromise || new Response(JSON.stringify({ error: 'offline' }), { headers: {'content-type':'application/json'}, status: 200 });
    })());
    return;
  }

  if (isStatic(url)) {
    // Stale-while-revalidate for JS/CSS/assets
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const netPromise = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return cached || netPromise || new Response('', { status: 504 });
    })());
    return;
  }
});
