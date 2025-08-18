/* Amorvia Service Worker — adds runtime cache for /data/*.v2.json */
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // simple cleanup of old caches if you ever change names
    const keep = new Set(['v2-data']);
    const names = await caches.keys();
    await Promise.all(names.map(n => keep.has(n) ? null : caches.delete(n)));
    await self.clients.claim();
  })());
});

// Stale-While-Revalidate for scenario v2 JSON
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin .v2.json under /data/
  if (url.origin === location.origin && url.pathname.startsWith('/data/') && url.pathname.endsWith('.v2.json')) {
    event.respondWith((async () => {
      const cache = await caches.open('v2-data');
      const cached = await cache.match(req);
      const network = fetch(req).then(async (res) => {
        if (res && res.ok) {
          cache.put(req, res.clone()).catch(()=>{});
        }
        return res;
      }).catch(() => null);

      // Serve fast if cached, update in background
      if (cached) return cached;
      // Fallback to network (or offline error)
      return (await network) || new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    })());
  }
});
