/* Amorvia patch: fetch-normalize-entry.patch.js
 * Ensures every .v2.json scenario has a usable entry node immediately after fetch.
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

  const origGetJSON = window.getJSON;
  if (typeof origGetJSON === 'function') {
    window.getJSON = async function (url, ...args) {
      const data = await origGetJSON(url, ...args);
      if (typeof url === 'string' && url.endsWith('.v2.json')) {
        return normalizeScenario(data);
      }
      return data;
    };
    console.info('[AmorviaPatch] fetch-normalize-entry.patch active');
  } else {
    console.warn('[AmorviaPatch] getJSON not found; patch skipped');
  }
})();
