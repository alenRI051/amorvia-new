// sw-register.js with update toast
(function(){
  if (!('serviceWorker' in navigator)) return;

  function injectToast(){
    if (document.getElementById('sw-toast')) return;
    const el = document.createElement('div');
    el.id = 'sw-toast';
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.bottom = '20px';
    el.style.transform = 'translateX(-50%)';
    el.style.padding = '10px 14px';
    el.style.background = '#111827';
    el.style.color = '#e5e7eb';
    el.style.border = '1px solid #374151';
    el.style.borderRadius = '12px';
    el.style.boxShadow = '0 10px 25px rgba(0,0,0,.35)';
    el.style.zIndex = '9999';
    el.style.display = 'none';
    el.innerHTML = 'New version available <button id="sw-reload" style="margin-left:8px;padding:4px 8px;">Refresh</button>';
    document.body.appendChild(el);
    return el;
  }

  function showToast(reg){
    const t = injectToast();
    t.style.display = 'block';
    const btn = document.getElementById('sw-reload');
    btn.onclick = function(){
      if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      location.reload();
    };
  }

  window.addEventListener('load', function(){
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(reg){
      console.log('[sw] registered', reg.scope);

      // If there is an updated SW waiting, show toast
      if (reg.waiting) showToast(reg);

      reg.addEventListener('updatefound', function(){
        const newWorker = reg.installing;
        newWorker && newWorker.addEventListener('statechange', function(){
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast(reg);
          }
        });
      });

      // Listen for controllerchange to auto-hide toast after reload
      navigator.serviceWorker.addEventListener('controllerchange', function(){
        const t = document.getElementById('sw-toast'); if (t) t.style.display = 'none';
      });
    }).catch(function(err){
      console.warn('[sw] registration failed', err);
    });
  });
})();