(async()=>{
  if (!('serviceWorker' in navigator)) return;
  try{
    const reg = await navigator.serviceWorker.register('/sw.js?v='+Date.now());
    if (reg && reg.waiting){ reg.waiting.postMessage({type:'SKIP_WAITING'}); }
  }catch(e){ console.debug('[SW] register failed', e); }
})();