/* Amorvia patch: normalize v2 scenario fetch responses
 * - Guarantees: startAct, start, startNode, entryNode, entry{actId,nodeId}
 * - Prefers non-reserved node ids (e.g. a1_line1) over a literal "start"
 */
(function () {
  function firstKeyNonReserved(steps) {
    if (!steps || typeof steps !== 'object') return null;
    const keys = Object.keys(steps);
    // Prefer aN_lineM shape
    const preferred = keys.find(k => /^a\d+_line\d+$/i.test(k));
    if (preferred) return preferred;
    // Otherwise, first key that's not 'start' or 'end*'
    const nonReserved = keys.find(k => !/^start$/i.test(k) && !/^end/i.test(k));
    return nonReserved || keys[0] || null;
  }

  function computeEntry(s) {
    if (!s || !Array.isArray(s.acts) || !s.acts.length) return { actId: null, nodeId: null };
    const act = s.acts.find(a => a.id === s.startAct) || s.acts[0];
    let nodeId = s.start || act?.start;

    // steps may be map or array
    const steps = act && act.steps;
    if (!nodeId) {
      if (Array.isArray(steps) && steps.length) nodeId = steps[0]?.id || null;
      else if (steps && typeof steps === 'object') nodeId = firstKeyNonReserved(steps);
    }
    // nodes fallback
    if (!nodeId && act?.nodes) {
      const n = act.nodes;
      if (Array.isArray(n) && n.length) nodeId = n[0]?.id || null;
      else if (n && typeof n === 'object') nodeId = firstKeyNonReserved(n);
    }

    return { actId: act?.id || s.startAct || null, nodeId: nodeId || null };
  }

  const origFetch = window.fetch;
  window.fetch = async function (url, opts) {
    const res = await origFetch(url, opts);

    if (typeof url === 'string' && url.endsWith('.v2.json')) {
      try {
        const clone = res.clone();
        const data = await clone.json();
        const entry = computeEntry(data);

        if (entry.actId) data.startAct = entry.actId;
        if (entry.nodeId) {
          data.start = entry.nodeId;
          data.startNode = entry.nodeId;
          data.entryNode = entry.nodeId;
        }
        // always provide explicit entry object
        data.entry = { actId: entry.actId, nodeId: entry.nodeId };

        return new Response(JSON.stringify(data), {
          status: res.status,
          statusText: res.statusText,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        console.warn('[AmorviaPatch] normalize failed for', url, e);
        return res;
      }
    }
    return res;
  };

  console.info('[AmorviaPatch] fetch-normalize-entry.v2.patch active');
})();
