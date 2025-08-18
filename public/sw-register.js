// Register the service worker for Amorvia
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then(reg => {
        console.log('[SW] registered with scope:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              console.info('[SW] new content available; will use on next load.');
            }
          });
        });
      })
      .catch(err => console.warn('[SW] registration failed', err));
  });
}
