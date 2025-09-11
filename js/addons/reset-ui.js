// Reset UI: clears Amorvia UI prefs and reloads with cache-bust.
// Now dispatches 'amorvia:reset' before reload.
(function() {
  function cacheBustReload() {
    const url = new URL(window.location.href);
    url.searchParams.set('devcache', Date.now().toString(36));
    window.location.replace(url.toString());
  }

  function safeReset() {
    try {
      const removePrefixes = ['amorvia:'];
      const removeExact = ['app:theme','app:contrast','ui:layout'];

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (removePrefixes.some(p => key.startsWith(p)) || removeExact.includes(key)) {
          localStorage.removeItem(key);
        }
      }

      try { sessionStorage.clear(); } catch (e) {}

      try {
        caches && caches.keys && caches.keys().then(keys => { keys.forEach(k => caches.delete(k)); });
      } catch (e) {}

      // Let the app know a reset occurred
      document.dispatchEvent(new CustomEvent('amorvia:reset'));

    } catch (err) {
      console.warn('Reset UI encountered an error:', err);
    } finally {
      cacheBustReload();
    }
  }

  // expose globally for toolbar-buttons.js and shortcuts
  window.amorviaResetUI = { run: safeReset };
})();