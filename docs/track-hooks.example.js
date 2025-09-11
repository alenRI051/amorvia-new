// Example listeners to send events to your tracking endpoint.
document.addEventListener('amorvia:hc-toggled', e => {
  // fetch('/api/track', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ event:'hc_toggled', on:e.detail.on }) });
  console.log('[track] hc_toggled', e.detail);
});

document.addEventListener('amorvia:reset', () => {
  // fetch('/api/track', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ event:'reset_ui' }) });
  console.log('[track] reset_ui');
});