/* Amorvia patch: fetch-normalize-entry.v2.patch.js
 * Hooks fetch() to normalize .v2.json scenarios before they're returned.
 */
(function () {
  async function normalizeScenario(raw) {
    if (!raw || !Array.isArray(raw.acts) || raw.acts.length === 0) return raw;

    // Pick act
    let actId = raw.startAct || raw.acts[0].id;
    let act = raw.acts.find(a => a.id === actId) || raw.acts[0];

    // Pick node
    let nodeId = raw.start || (act && act.start);
    if (!nodeId && act && act.nodes && typeof act.nodes === 'object') {
      const keys = Object.keys(act.nodes);
      if (keys.length) nodeId = keys[0];
    }

    if (act) {
      raw.startAct = act.id;
      if (!act.start && nodeId) act.start = nodeId;
    }
    if (nodeId) {
      raw.start = nodeId;
      raw.startNode = nodeId;
      raw.entryNode = nodeId;
    }

    return raw;
  }

  const origFetch = window.fetch;
  window.fetch = async function (url, opts) {
    const res = await origFetch(url, opts);
    if (typeof url === 'string' && url.endsWith('.v2.json')) {
      try {
        const clone = res.clone();
        const data = await clone.json();
        const fixed = await normalizeScenario(data);
        // Repackage into a new Response so downstream code sees corrected JSON
        return new Response(JSON.stringify(fixed), {
          status: res.status,
          statusText: res.statusText,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        console.warn('[AmorviaPatch] Failed to normalize', url, e);
        return res;
      }
    }
    return res;
  };

  console.info('[AmorviaPatch] fetch-normalize-entry.v2.patch active');
})();
