if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[Amorvia] Service Worker registered:', reg);
      })
      .catch(err => {
        console.error('[Amorvia] Service Worker registration failed:', err);
      });
  });
}
