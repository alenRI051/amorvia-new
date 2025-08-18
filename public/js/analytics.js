// Tiny analytics beacon (no cookies, no user IDs)
(function(){
  const url = new URL(location.href);
  if (url.searchParams.get('noanalytics') === '1') return;

  const payload = JSON.stringify({
    p: location.pathname + location.search,
    r: document.referrer ? new URL(document.referrer).host : '',
    t: Date.now()
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/pv', payload);
  } else {
    fetch('/api/pv', { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(()=>{});
  }
})();
