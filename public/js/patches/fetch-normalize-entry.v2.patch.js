/* Amorvia patch: normalize v2 scenario fetch responses
 * - Guarantees startAct/start/startNode/entryNode/entry{actId,nodeId}
 * - Mirrors steps{} to nodes[] for engines that only read nodes[]
 * - Prefers non-reserved ids (e.g., a1_line1) over literal "start"
 */
(function () {
  function firstKeyNonReserved(steps) {
    if (!steps || typeof steps !== 'object') return null;
    const keys = Object.keys(steps);
    const preferred = keys.find(k => /^a\d+_line\d+$/i.test(k));
    if (preferred) return preferred;
    const nonReserved = keys.find(k => !/^start$/i.test(k) && !/^end/i.test(k));
    return nonReserved || keys[0] || null;
  }

  function toNodesArray(steps) {
    if (!steps || typeof steps !== 'object') return [];
    const keys = Object.keys(steps).sort((a, b) => {
      const ra = /^start$/i.test(a) ? 1 : 0;
      const rb = /^start$/i.test(b) ? 1 : 0;
      return ra - rb || a.localeCompare(b);
    });
    return keys.map(k => steps[k]).filter(Boolean);
  }

  function normalizeAct(act) {
    if (!act || typeof act !== 'object') return act;

    // Steps array → map
    if (Array.isArray(act.steps)) {
      const map = {};
      for (const n of act.steps) if (n && n.id) map[n.id] = n;
      act.steps = map;
    }
    // If only nodes[] exists, derive steps map from it
    if (!act.steps && Array.isArray(act.nodes)) {
      const map = {};
      for (const n of act.nodes) if (n && n.id) map[n.id] = n;
      act.steps = map;
    }
    // Always provide nodes[]
    act.nodes = Array.isArray(act.nodes) ? act.nodes : toNodesArray(act.steps);

    // Ensure act.start
    if (!act.start) {
      act.start = firstKeyNonReserved(act.steps) ||
                  (act.nodes[0] && act.nodes[0].id) || null;
    }
    return act;
  }

  function computeEntry(s) {
    if (!s || !Array.isArray(s.acts) || !s.acts.length) {
      return { actId: null, nodeId: null };
    }
    s.acts = s.acts.map(normalizeAct);

    const act = s.acts.find(a => a.id === s.startAct) || s.acts[0];
    let nodeId = s.start || act?.start;

    if (!nodeId && act?.steps) nodeId = firstKeyNonReserved(act.steps);
    if (!nodeId && act?.nodes?.length) nodeId = act.nodes[0]?.id || null;

    return { actId: act?.id || s.startAct || null, nodeId: nodeId || null };
  }

  const origFetch = window.fetch;
  window.fetch = async function (url, opts) {
    const res = await origFetch(url, opts);

    if (typeof url === 'string' && url.endsWith('.v2.json')) {
      try {
        const data = await res.clone().json();

        const entry = computeEntry(data);

        if (entry.actId) data.startAct = entry.actId;
        if (entry.nodeId) {
          data.start = entry.nodeId;
          data.startNode = entry.nodeId;
          data.entryNode = entry.nodeId;
        }
        data.entry = { actId: entry.actId, nodeId: entry.nodeId };

        // ensure nodes[] exists on every act after compute
        if (Array.isArray(data.acts)) data.acts = data.acts.map(normalizeAct);

        // DEBUG (first load) — uncomment if you want to see it once
        // console.log('[AmorviaPatch] normalized', { entry: data.entry, a0: data.acts?.[0] });

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
