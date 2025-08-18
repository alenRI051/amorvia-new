// Register the service worker for Amorvia, skip under automation or ?nosw=1
(function(){
  const underAutomation = navigator.webdriver || new URL(location.href).searchParams.get('nosw') === '1';
  if (!('serviceWorker' in navigator) || underAutomation) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      console.log('[SW] registered with scope:', reg.scope);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            const want = confirm('Amorvia has an update. Reload now?');
            if (want) location.reload();
          }
        });
      });
      window.addEventListener('focus', async () => { try { await reg.update(); } catch {} });
    } catch (err) {
      console.warn('[SW] registration failed', err);
    }
  });
})();
