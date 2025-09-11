// Reset UI: clears Amorvia UI prefs and reloads with cache-bust.
(function() {
  function cacheBustReload() {
    const url = new URL(window.location.href);
    url.searchParams.set('devcache', Date.now().toString(36));
    // Many builds use service workers; do a hard-ish reload.
    window.location.replace(url.toString());
  }

  function safeReset() {
    try {
      const removePrefixes = ['amorvia:'];
      const removeExact = [
        // Add known UI keys here if needed
        'app:theme',
        'app:contrast',
        'ui:layout'
      ];

      // Remove by prefix
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (removePrefixes.some(p => key.startsWith(p)) || removeExact.includes(key)) {
          localStorage.removeItem(key);
        }
      }

      // Clear session storage UI hints
      try { sessionStorage.clear(); } catch (e) {}

      // Also remove potential SW hints
      try {
        caches && caches.keys && caches.keys().then(keys => {
          keys.forEach(k => caches.delete(k));
        });
      } catch (e) {}

    } catch (err) {
      console.warn('Reset UI encountered an error:', err);
    } finally {
      cacheBustReload();
    }
  }

  // expose globally for toolbar-buttons.js
  window.amorviaResetUI = { run: safeReset };
})();