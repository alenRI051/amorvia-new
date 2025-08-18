// sw-register.js
(function(){
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(reg){
      console.log('[sw] registered', reg.scope);
      reg.addEventListener('updatefound', function(){
        const newWorker = reg.installing;
        newWorker && newWorker.addEventListener('statechange', function(){
          if (newWorker.state === 'installed') console.log('[sw] new content available');
        });
      });
    }).catch(function(err){
      console.warn('[sw] registration failed', err);
    });
  });
})();