// js/compat/v2-to-graph.js
// v2 -> engine graph converter with support for legacy `acts[].steps[]` outlines.

export function isGraphLike(doc){
  return !!(doc && typeof doc === 'object' && doc.startId && doc.nodes && typeof doc.nodes === 'object');
}

function normalizeActNodes(act, ai){
  // Prefer explicit `nodes` if present.
  if (Array.isArray(act?.nodes) && act.nodes.length) {
    // Ensure ids exist.
    return act.nodes.map((n, si) => ({
      id: n.id || `a${ai+1}s${si+1}`,
      type: n.type,
      text: n.text,
      prompt: n.prompt,
      to: n.to,
      next: n.next,
      choices: Array.isArray(n.choices) ? n.choices.map(c => ({
        label: c.label || 'Option',
        to: c.to,
        effects: c.effects
      })) : undefined
    }));
  }

  // Legacy: `steps` was an array of strings (outline)
  if (Array.isArray(act?.steps) && act.steps.length) {
    return act.steps.map((s, si) => ({
      id: `a${ai+1}s${si+1}`,
      type: 'line',
      text: String(s ?? '')
    }));
  }

  return [];
}

export function toGraph(doc){
  const nodes = {};
  let startId = '';

  const acts = Array.isArray(doc?.acts) ? doc.acts : [];
  acts.forEach((act, ai) => {
    const list = normalizeActNodes(act, ai);
    let prevId = null;

    list.forEach((n, si) => {
      const id = n.id || `a${ai+1}s${si+1}`;
      const out = { id };

      // Prefer prompt for choice, else text.
      out.text = n.prompt || n.text || '';

      // Infer type if omitted
      const inferred = Array.isArray(n.choices) ? 'choice' : (n.to || n.next) ? 'goto' : (n.type || undefined);
      if (inferred) out.type = inferred;

      if (out.type === 'choice') {
        out.choices = (n.choices || []).map(c => ({
          label: c.label || 'Option',
          to: c.to,
          effects: c.effects
        }));
      }
      if (n.to)   out.to   = n.to;
      if (n.next) out.next = n.next;

      nodes[id] = out;

      if (!startId) startId = act.start || id;

      // Linear fallback: previous → this
      if (prevId && !nodes[prevId].to && !nodes[prevId].next && nodes[prevId].type !== 'choice') {
        nodes[prevId].next = id;
      }
      prevId = id;
    });

    // Mark act boundaries
    act.__firstId = list.length ? (list[0].id || `a${ai+1}s1`) : null;
    act.__lastId  = list.length ? (list[list.length-1].id || `a${ai+1}s${list.length}`) : null;
  });

  // Chain acts if needed
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
  // Fallback minimal coercion
  const coerced = { title: doc?.title || '', acts: Array.isArray(doc?.acts) ? doc.acts : [{ start: doc?.start, nodes: doc?.nodes || doc?.steps || [] }], meters: doc?.meters || {} };
  return toGraph(coerced);
}
