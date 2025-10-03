/* Amorvia patch: fetch-normalize-entry.v2.patch.js */
(function () {
  function computeEntry(s) {
    if (!s || !Array.isArray(s.acts) || s.acts.length === 0) return { actId: null, nodeId: null };

    let act = s.acts.find(a => a.id === s.startAct) || s.acts[0];
    let nodeId = s.start || act?.start;

    // steps may be object-map or array; fallback to first key/id
    if (!nodeId && act?.steps) {
      if (Array.isArray(act.steps) && act.steps.length) nodeId = act.steps[0]?.id;
      else if (typeof act.steps === 'object') {
        const keys = Object.keys(act.steps);
        if (keys.length) nodeId = keys[0];
      }
    }
    // nodes fallback (object-map or array)
    if (!nodeId && act?.nodes) {
      if (Array.isArray(act.nodes) && act.nodes.length) nodeId = act.nodes[0]?.id;
      else if (typeof act.nodes === 'object') {
        const keys = Object.keys(act.nodes);
        if (keys.length) nodeId = keys[0];
      }
    }

    const actId = act?.id || s.startAct || null;
    return { actId, nodeId: nodeId || null };
  }

  const origFetch = window.fetch;
  window.fetch = async function (url, opts) {
    const res = await origFetch(url, opts);

    if (typeof url === 'string' && url.endsWith('.v2.json')) {
      try {
        const clone = res.clone();
        const data = await clone.json();

        const entry = computeEntry(data);

        // Normalize all fields engines might look for
        if (entry.actId) data.startAct = entry.actId;
        if (entry.nodeId) {
          data.start = entry.nodeId;
          data.startNode = entry.nodeId;
          data.entryNode = entry.nodeId;
        }
        // ✨ Critical: also set an explicit 'entry' object
        data.entry = { actId: entry.actId, nodeId: entry.nodeId };

        return new Response(JSON.stringify(data), {
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

  console.info('[AmorviaPatch] fetch-normalize-entry.v2.patch active (with entry object)');
})();
