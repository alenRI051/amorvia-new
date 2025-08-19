// public/js/metrics.js - Lightweight client metrics
// Sends structured, non-PII events to /api/track using sendBeacon or fetch keepalive.

(function (global) {
  const ENDPOINT = '/api/track';
  const SID_KEY = 'amorvia:sid';
  const MODE_KEY = 'amorvia:mode';

  function sid() {
    let s = localStorage.getItem(SID_KEY);
    if (!s) {
      s = randId();
      localStorage.setItem(SID_KEY, s);
    }
    return s;
  }

  function randId() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  function ctx(extra) {
    const mode = localStorage.getItem(MODE_KEY) || 'v1';
    return {
      sid: sid(),
      mode,
      url: location.pathname,
      ref: document.referrer || undefined,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...extra
    };
  }

  function beacon(body) {
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
        return navigator.sendBeacon(ENDPOINT, blob);
      }
    } catch {}
    // fallback
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(body)
    }).catch(() => {});
  }

  function track(name, data = {}, extraCtx = {}) {
    // Only allow whitelisted names (align with server)
    const ALLOWED = new Set(['scenario_start','choice_made','line_next','act_end','save_slot','load_slot','app_init']);
    if (!ALLOWED.has(name)) return false;
    try {
      return beacon({ name, data, ctx: ctx(extraCtx) });
    } catch {
      return false;
    }
  }

  // convenience helpers
  const Metrics = {
    track,
    appInit() { track('app_init'); },
    scenarioStart(id) { track('scenario_start', { id }); },
    choiceMade(sid, act, node, index, label) { track('choice_made', { scenarioId: sid, actId: act, nodeId: node, index, label }); },
    lineNext(sid, act, from) { track('line_next', { scenarioId: sid, actId: act, nodeId: from }); },
    actEnd(sid, act, deltas) { track('act_end', { scenarioId: sid, actId: act, deltas }); },
    saveSlot(name) { track('save_slot', { name }); },
    loadSlot(name) { track('load_slot', { name }); }
  };

  // expose globally for easy use without bundlers
  global.AmorviaMetrics = Metrics;

  // auto fire init
  try { Metrics.appInit(); } catch {}

})(window);
