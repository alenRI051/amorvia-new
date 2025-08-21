const SCRIPT_URL = (self.registration && self.registration.scriptURL) || self.location.href;
const VERSION = new URL(SCRIPT_URL, self.location).searchParams.get('v') || 'dev';
const PREFIX = 'amorvia';
const STATIC = `${PREFIX}-static-${VERSION}`;
const RUNTIME = `${PREFIX}-rt-${VERSION}`;
const v = (u) => { try { const url = new URL(u, self.location.origin); url.searchParams.set('v', VERSION); return url.toString(); } catch { return u; } };
const CORE = ['/', '/index.html', v('/css/styles.css'), v('/css/ui.patch.css'), v('/js/bootstrap.js')];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC).then(cache => cache.addAll(CORE)).catch(()=>{}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&!k.endsWith(VERSION)).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

const isHTML = (req) => req.mode === 'navigate' || (req.headers.get('accept')||'').includes('text/html');
self.addEventListener('fetch', (event) => {
  const req = event.request; if (req.method!=='GET') return; const url = new URL(req.url);
  if (isHTML(req)) {
    event.respondWith((async()=>{
      try{ const net=await fetch(req); const c=await caches.open(RUNTIME); c.put(req, net.clone()); return net; }
      catch{ const c=await caches.open(RUNTIME); return await c.match(req) || await caches.match('/index.html') || new Response('<h1>Offline</h1>', {headers:{'Content-Type':'text/html'}}); }
    })());
    return;
  }
  if (url.origin===location.origin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/'))) {
    event.respondWith((async()=>{ const c=await caches.open(RUNTIME); const hit=await c.match(req); const fetcher=fetch(req).then(net=>{ c.put(req, net.clone()); return net; }).catch(()=>hit); return hit || fetcher; })());
    return;
  }
});
