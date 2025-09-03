// Amorvia fetch hotfix shim (repo-aligned)
// - Rewrites "/public/data/..." -> "/data/..."
// - Forces cache: 'no-store'
// - Adds cache-busting when ?devcache=0 is present
(function () {
  if (!window.fetch) return;
  const q = new URL(location.href).searchParams;
  const bust = q.has('devcache') && q.get('devcache') === '0';

  const toRequest = (input, init = {}) => {
    try {
      if (typeof input === 'string') {
        let url = input;
        if (url.startsWith('/public/data/')) {
          url = url.replace(/^\/public\/data\//, '/data/');
        }
        if (bust) {
          const sep = url.includes('?') ? '&' : '?';
          url = `${url}${sep}t=${Date.now()}`;
        }
        return [url, init];
      } else if (input instanceof Request) {
        let url = input.url;
        if (url.includes('/public/data/')) {
          url = url.replace('/public/data/', '/data/');
        }
        if (bust) {
          const u = new URL(url, location.origin);
          u.searchParams.set('t', String(Date.now()));
          url = u.toString();
        }
        const nextInit = Object.assign({}, input, init);
        return [url, nextInit];
      }
    } catch (e) {
      console.warn('[Amorvia] fetch hotfix failed to parse input', e);
    }
    return [input, init];
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init = {}) {
    const [url, nextInit] = toRequest(input, init);
    const merged = Object.assign({ cache: 'no-store' }, nextInit);
    try {
      const res = await originalFetch(url, merged);
      if (!res.ok) console.warn('[Amorvia] fetch non-OK', res.status, url);
      return res;
    } catch (err) {
      console.error('[Amorvia] fetch error', url, err);
      throw err;
    }
  };

  console.debug('[Amorvia] fetch hotfix active. devcache=0 -> cache busting enabled.');
})();
