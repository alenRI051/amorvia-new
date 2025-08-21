(async () => {
  try {
    const ver = await fetch('/version.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { version: String(Date.now()) })
      .then(d => d.version || String(Date.now()))
      .catch(() => String(Date.now()));
    window.__AMORVIA_VERSION__ = ver;
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.register('/service-worker.js?v=' + encodeURIComponent(ver));
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshing) return; refreshing = true; location.reload(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update(); });
    setInterval(() => reg.update(), 30 * 60 * 1000);
  } catch (e) { console.warn('[SW Register] failed:', e); }
})();
