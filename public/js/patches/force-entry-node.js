// /js/patches/force-entry-node.js
console.log("[AmorviaPatch] force-entry-node active");

(function() {
  const orig = window.deriveEntryFromV2;
  window.deriveEntryFromV2 = function(scn) {
    if (scn && scn.entry && scn.entry.actId && scn.entry.nodeId) {
      return { actId: scn.entry.actId, nodeId: scn.entry.nodeId };
    }
    if (scn && scn.entryNode) {
      return { actId: scn.startAct || (scn.acts && scn.acts[0]?.id), nodeId: scn.entryNode };
    }
    // fallback to original
    return orig ? orig(scn) : {};
  };
})();
