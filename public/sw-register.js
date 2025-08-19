// Auto-refresh SW register (no prompt). Reloads once when new SW takes control.
(function(){
  if (!('serviceWorker' in navigator)) return;

  const BUILD = '2025-08-19.3'; // bump per deploy
  const url = `/sw.js?v=${BUILD}`;

  navigator.serviceWorker.register(url).then((reg) => {
    // Ensure we only reload once per update
    let refreshed = false;
    function reloadOnce() {
      if (refreshed) return;
      refreshed = true;
      // Avoid infinite loops
      const key = 'amorvia:sw:reloaded';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
    }

    // If there's already a waiting worker, activate it immediately
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // If a new worker is installing, activate when it's ready
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    // When the controller changes (new SW takes over), reload once
    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);

    // Optional: periodic update checks
    setInterval(() => reg.update(), 60 * 60 * 1000);
  }).catch((e) => {
    console.warn('SW registration failed:', e);
  });
})();