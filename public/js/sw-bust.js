
// sw-bust.js (v9.3)
window.amorviaBustSW = async function() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.update().then(() => r.unregister())));
    console.info('[Amorvia] Service worker(s) updated/unregistered.');
  } catch (e) {
    console.warn('[Amorvia] SW bust failed:', e);
  }
};
