(() => {
  const isProdHost = location.hostname === 'amorvia.eu';
  const skip = location.search.includes('nosw=1') || !isProdHost || !('serviceWorker' in navigator);

  if (skip) {
    console.log('[SW] skip register (dev/nosw/non-prod)');
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
