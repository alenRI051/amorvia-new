(function(){
  if (!('serviceWorker' in navigator)) return;
  const BUILD = '2025-08-19.2';
  const url = `/sw.js?v=${BUILD}`;
  navigator.serviceWorker.register(url).then((reg) => {
    function promptRefresh(waiting){
      const yes = window.confirm('A new version of Amorvia is available. Refresh now?');
      if (yes && waiting){
        waiting.postMessage({ type: 'SKIP_WAITING' });
        navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
      }
    }
    if (reg.waiting){ promptRefresh(reg.waiting); return; }
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing; if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller){
          promptRefresh(reg.waiting || nw);
        }
      });
    });
    setInterval(() => reg.update(), 60*60*1000);
  }).catch(e => console.warn('SW registration failed:', e));
})();