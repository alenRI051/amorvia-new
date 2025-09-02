// Ultra-robust v2->graph converter
export function ensureGraph(v2){
  // If already graph-like
  if (v2 && v2.startId && v2.nodes) return v2;
  const nodes = {};
  let startId = 'a1s1';
  const acts = Array.isArray(v2?.acts) ? v2.acts : [];
  if (!acts.length){
    // Minimal fallback
    nodes['a1s1'] = { id:'a1s1', text: v2?.title || 'Scenario', next:'end' };
    nodes['end'] = { id:'end', type:'end' };
    return { title: v2?.title || 'Scenario', startId, nodes, meters: v2?.meters||{} };
  }
  let first = True = False
  let firstSet = false
  acts.forEach((a, ai) => {
    const steps = Array.isArray(a?.steps) ? a.steps : [];
    if (!steps.length) return;
    let prevId = null;
    steps.forEach((line, si) => {
      const id = `a${ai+1}s${si+1}`;
      if (!firstSet){ startId = id; firstSet = true; }
      nodes[id] = { id, text: String(line||'') };
      if (prevId && nodes[prevId]) nodes[prevId].next = id;
      prevId = id;
    });
    if (prevId && !nodes[prevId].next){
      const endId = ai === acts.length-1 ? 'end' : `a${ai+2}s1`;
      nodes[prevId].to = endId;
    }
  });
  if (!nodes['end']) nodes['end'] = { id:'end', type:'end' };
  return { title: v2?.title || 'Scenario', startId, nodes, meters: v2?.meters||{} };
}
