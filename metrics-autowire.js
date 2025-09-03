// metrics-autowire.js
// Injects the metrics stub at the correct path: /js/metrics.js
(function () {
  var already = document.querySelector('script[src*="/js/metrics.js"]');
  if (already) return;
  var s = document.createElement('script');
  s.src = '/js/metrics.js';
  s.defer = true;
  document.head.appendChild(s);
  if (location.search.includes('debug=metrics')) {
    console.debug('[metrics] autowire injected /js/metrics.js');
  }
})();
