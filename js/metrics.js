// /js/metrics.js — safe no-op stub
(function (global) {
  const log = (...args) => {
    if (location.search.includes('debug=metrics')) {
      console.debug('[metrics]', ...args);
    }
  };
  const api = {
    init(opts = {}) { log('init', opts); },
    pageview(path = location.pathname) { log('pageview', path); },
    event(name, params = {}) { log('event', name, params); },
    setUser(user = {}) { log('setUser', user); },
    time(name, ms) { log('time', name, ms); },
  };
  global.metrics = api;
  if (typeof window !== 'undefined') window.Metrics = api;
})(typeof window !== 'undefined' ? window : globalThis);

export default (typeof window !== 'undefined' ? window.metrics : globalThis.metrics);
