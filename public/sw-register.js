/* Amorvia SW register — version-linked */
(async () => {
  try {
    const ver = await fetch('/version.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { version: String(Date.now()) })
      .then(d => d.version || String(Date.now()))
      .catch(() => String(Date.now()));

    // Expose to the page so bootstrap can reuse the same version
    window.__AMORVIA_VERSION__ = ver;

    if (!('serviceWorker' in navigator)) return;

    const reg = await navigator.serviceWorker.register('/service-worker.js?v=' + encodeURIComponent(ver));

    // Auto-reload once when a new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });

    // Nudge SW to check for updates when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update();
    });

    // Optional: check periodically (every 30 minutes)
    setInterval(() => reg.update(), 30 * 60 * 1000);
  } catch (e) {
    console.warn('[SW Register] failed:', e);
  }
})();
