(function () {
  try {
    const url = new URL(location.href);
    const skip = url.searchParams.has('nosw') || navigator.webdriver;
    if ('serviceWorker' in navigator && !skip) {
      navigator.serviceWorker.register('/sw.js');
    } else {
      console.debug('[Amorvia] SW registration skipped');
    }
  } catch (e) {
    console.warn('[Amorvia] SW register error:', e);
  }
})();
