/* Amorvia patch: derive-entry-robust.patch.js
 * Makes deriveEntryFromV2 resilient to missing or ignored start fields.
 * Works even if only acts[*].nodes exist.
 */
(function () {
  function robustDeriveEntry(s) {
    if (!s || !Array.isArray(s.acts) || s.acts.length === 0) {
      return { actId: null, nodeId: null };
    }

    // Prefer explicit startAct; otherwise first act
    let actId = s.startAct || (s.acts[0] && s.acts[0].id);
    let act = s.acts.find(a => a.id === actId) || s.acts[0];

    // Resolve node: prefer top-level start, then act.start, then first node key
    let nodeId = s.start || (act && act.start);
    if (!nodeId && act && act.nodes && typeof act.nodes === 'object') {
      const keys = Object.keys(act.nodes);
      if (keys.length) nodeId = keys[0];
    }

    // As we compute, also normalize the scenario object so downstream code can rely on it
    if (act) {
      s.startAct = act.id;
      if (!act.start && nodeId) act.start = nodeId;
    }
    if (nodeId) {
      s.start = nodeId;
      s.startNode = nodeId;
      s.entryNode = nodeId;
    }

    return { actId: s.startAct || null, nodeId: nodeId || null };
  }

  // If app provides an original helper, wrap it; otherwise install ours
  const orig = window.deriveEntryFromV2;
  window.deriveEntryFromV2 = function (scenario) {
    try {
      if (typeof orig === 'function') {
        const out = orig(scenario);
        if (out && out.nodeId) return out; // original succeeded
      }
    } catch (_) { /* ignore and fall back */ }
    return robustDeriveEntry(scenario);
  };

  // Optional: expose for debugging
  window.__amorviaDeriveEntryRobust = robustDeriveEntry;
  console.info('[AmorviaPatch] derive-entry-robust.patch active');
})();
