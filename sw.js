const VERSION = 'v0.6-' + Date.now();
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(['/','/index.html','/css/styles.css','/css/ui.patch.css','/js/bootstrap.js','/js/app.v2.js','/js/compat/v2-to-graph.js','/js/engine/scenarioEngine.js','/js/addons/extras-tabs.js','/js/addons/art-loader.js','/data/v2-index.json'])));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(caches.match(request).then(res => res || fetch(request)));
});
