self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());

// Cache a tiny shell for offline friendliness (optional)
const SHELL = ['/', '/index.html', '/css/styles.css', '/css/styles-hotfix.css'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open('shell-v1').then(c => c.addAll(SHELL)).catch(()=>{}));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // Never cache dynamic scenario data
  if (req.url.includes('/data/')) return;
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
