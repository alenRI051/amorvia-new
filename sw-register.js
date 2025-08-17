\
/* Register the service worker */
(function() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .then(reg => {
          // optional: listen for updates
          if (reg.waiting) {
            console.info('[SW] waiting service worker ready');
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.info('[SW] new content available; will use on next load.');
              }
            });
          });
        })
        .catch(err => console.warn('[SW] registration failed', err));
    });
  }
})();
