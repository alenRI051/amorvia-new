// /public/js/sw-register.js
(() => {
  const isProdHost = location.hostname === 'amorvia.eu';
  const skip = location.search.includes('nosw=1') ||
               !isProdHost ||                    // only run on prod host
               !('serviceWorker' in navigator);

  if (skip) {
    console.log('[SW] skip register (dev/nosw/non-prod)');
    // If a SW was previously installed, unregister it in dev:
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations?.().then(regs => regs.forEach(r => r.unregister()));
    }
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('[SW] register failed', err);
    });
  });
})();
