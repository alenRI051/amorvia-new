(function () {
  // Allow bypass via ?nosw=1 or when running under automation (Lighthouse/CI)
  const url = new URL(location.href);
  const skipSW = url.searchParams.has('nosw') || navigator.webdriver;
  if ('serviceWorker' in navigator && !skipSW) {
    navigator.serviceWorker.register('/sw.js');
  } else {
    console.debug('[Amorvia] SW registration skipped (nosw or webdriver).');
  }
})();
