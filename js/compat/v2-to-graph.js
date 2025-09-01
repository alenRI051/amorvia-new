// js/compat/v2-to-graph.js
// Convert Scenario v2 document (acts/nodes arrays) to a flat graph the drop-in engine understands.
export function toGraph(doc) {
  const nodes = {};
  let startId = '';

  const acts = Array.isArray(doc.acts) ? doc.acts : [];
  acts.forEach((act, ai) => {
    const list = Array.isArray(act.nodes) ? act.nodes : [];
    let prevId = null;

    list.forEach((n, si) => {
      const id = n.id || `a${ai+1}s${si+1}`;
      const out = { id };

      // Prefer prompt for choice nodes, else text
      out.text = n.prompt || n.text || '';

      // Infer a sensible type
      const type = n.type || (Array.isArray(n.choices) ? 'choice' : (n.to || n.next) ? 'goto' : undefined);
      if (type) out.type = type;

      if (type === 'choice') {
        out.choices = (n.choices || []).map(c => ({
          label: c.label || 'Option',
          to: c.to,
          effects: c.effects
        }));
      }
      if (n.to)   out.to   = n.to;
      if (n.next) out.next = n.next;

      nodes[id] = out;

      if (!startId) startId = n.start || act.start || id;

      // Linear fallback: previous → this (only if previous had no explicit jump and wasn't a choice)
      if (prevId && !nodes[prevId].to && !nodes[prevId].next && nodes[prevId].type !== 'choice') {
        nodes[prevId].next = id;
      }
      prevId = id;
    });

    // mark act boundary (optional chaining below)
    act.__firstId = list.length ? (list[0].id || `a${ai+1}s1`) : null;
    act.__lastId  = list.length ? (list[list.length-1].id || `a${ai+1}s${list.length}`) : null;
  });

  // Optional: chain acts if last node of act has no explicit destination
  for (let ai = 0; ai < acts.length - 1; ai++) {
    const last = acts[ai].__lastId;
    const nextStart = acts[ai+1].__firstId;
    if (last && nextStart) {
      const nlast = nodes[last];
      if (nlast && !nlast.to && !nlast.next && nlast.type !== 'choice' && nlast.type !== 'end') {
        nlast.to = nextStart;
      }
    }
  }

  return { title: doc.title || '', startId, nodes };
}
