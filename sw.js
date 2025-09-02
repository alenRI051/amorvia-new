const VERSION='v0.6-'+Date.now();
self.addEventListener('install', e=>{ self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(clients.claim()); });
self.addEventListener('fetch', e=>{
  const url=new URL(e.request.url);
  if (e.request.method==='GET' && url.origin===location.origin){
    e.respondWith((async()=>{
      try{ return await fetch(e.request); }catch{ return caches.match('/index.html'); }
    })());
  }
});
