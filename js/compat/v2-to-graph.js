// js/compat/v2-to-graph.js
// Utilities to feed ScenarioEngine from a v2 scenario document
// Exports:
//   - toGraph(doc): convert v2 doc (acts/nodes arrays) → flat graph
//   - ensureGraph(doc): return doc if already graph-shaped, else convert
//
// Graph shape expected by ScenarioEngine:
//   { title, startId, nodes: { [id]: { id, text, type?, choices?, to?, next? } }, meters? }

export function isGraphLike(doc){
  return !!(doc && typeof doc === 'object' && doc.startId && doc.nodes && typeof doc.nodes === 'object');
}

export function toGraph(doc){
  const nodes = {};
  let startId = '';

  const acts = Array.isArray(doc?.acts) ? doc.acts : [];
  acts.forEach((act, ai) => {
    const list = Array.isArray(act?.nodes) ? act.nodes : [];
    let prevId = null;

    list.forEach((n, si) => {
      const id = n.id || `a${ai+1}s${si+1}`;
      const out = { id };

      // Prefer prompt text if present (for choice nodes), else regular text
      out.text = n.prompt || n.text || '';

      // Infer a sensible type if omitted
      const inferred = Array.isArray(n.choices) ? 'choice' : (n.to || n.next) ? 'goto' : undefined;
      const type = n.type || inferred;
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

      // Linear fallback: previous → this (if previous wasn't branched and had no explicit jump)
      if (prevId && !nodes[prevId].to && !nodes[prevId].next && nodes[prevId].type !== 'choice') {
        nodes[prevId].next = id;
      }
      prevId = id;
    });

    // Mark act boundaries (for optional chaining)
    act.__firstId = list.length ? (list[0].id || `a${ai+1}s1`) : null;
    act.__lastId  = list.length ? (list[list.length-1].id || `a${ai+1}s${list.length}`) : null;
  });

  // Optional: chain acts end → start if no explicit jump
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

  return { title: doc?.title || '', startId, nodes, meters: doc?.meters || {} };
}

export function ensureGraph(doc){
  if (isGraphLike(doc)) return doc;
  if (doc?.version === 2) return toGraph(doc);
  // Fallback: try to coerce a minimal doc shape (single act / nodes)
  const coerced = { title: doc?.title || '', acts: Array.isArray(doc?.acts) ? doc.acts : [{ start: doc?.start, nodes: doc?.nodes || [] }], meters: doc?.meters || {} };
  return toGraph(coerced);
}
