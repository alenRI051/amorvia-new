(function () {
  const url = new URL(location.href);
  const skipSW = url.searchParams.has('nosw') || navigator.webdriver;
  if ('serviceWorker' in navigator && !skipSW) {
    navigator.serviceWorker.register('/sw.js');
  }
})();
