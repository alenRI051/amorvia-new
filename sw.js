const VERSION = 'v0.6-2025-09-01';
const CORE = [
  '/', '/index.html', '/css/styles.css', '/css/ui.patch.css', '/css/addons.css',
  '/js/bootstrap.js', '/js/app.v2.js?v=v0.6-2025-09-01', '/js/compat/v2-to-graph.js?v=v0.6-2025-09-01',
  '/js/engine/scenarioEngine.js', '/js/addons/extras-tabs.js', '/js/addons/art-loader.js'
];
self.addEventListener('install', e=>{ e.waitUntil(caches.open('core-'+VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/data/')) { // network-first for JSON
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request)));
});
