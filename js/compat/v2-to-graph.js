\
// js/compat/v2-to-graph.js
// Ultra-robust v2 -> engine graph converter.
// Accepts:
//  - Graph-like { startId, nodes }
//  - v2 { version:2, acts:[ {nodes:[]}|{steps:[]} ], meters?, title? }
//  - steps as strings OR objects ({text,prompt,choices,to,next,type})
//  - nodes as array OR object map
//  - missing act.start -> inferred
//  - links acts linearly if needed

export function isGraphLike(doc){
  return !!(doc && typeof doc === 'object' && doc.startId && doc.nodes && typeof doc.nodes === 'object');
}

function coerceChoice(c){
  if (!c) return null;
  const out = {
    label: c.label || 'Option',
    to: c.to || c.next || null,
  };
  if (c.effects) out.effects = c.effects;
  return out;
}

function coerceNode(n, fallbackId){
  if (typeof n === 'string') {
    return { id: fallbackId, type: 'line', text: n };
  }
  const id = n.id || fallbackId;
  const type = n.type || (Array.isArray(n.choices) ? 'choice' : (n.to || n.next) ? 'goto' : undefined) || 'line';
  const text = n.text || n.prompt || '';
  const out = { id, type, text };
  if (n.to) out.to = n.to;
  if (n.next) out.next = n.next;
  if (Array.isArray(n.choices)) {
    out.choices = n.choices.map(coerceChoice).filter(Boolean);
    if (out.choices.length === 0) delete out.choices;
  }
  return out;
}

function normalizeActNodes(act, ai){
  // nodes: can be array or object map
  if (act && act.nodes) {
    if (Array.isArray(act.nodes)) {
      return act.nodes.map((n, si) => coerceNode(n, `a${ai+1}s${si+1}`));
    }
    if (typeof act.nodes === 'object') {
      const arr = Object.keys(act.nodes).sort().map((k, idx) => coerceNode({ id:k, ...(act.nodes[k]||{}) }, `a${ai+1}s${idx+1}`));
      return arr;
    }
  }
  // steps: array of strings or objects
  if (Array.isArray(act?.steps)) {
    return act.steps.map((s, si) => coerceNode(s, `a${ai+1}s${si+1}`));
  }
  // nothing usable
  return [];
}

export function toGraph(doc){
  const nodes = {};
  let startId = '';

  const acts = Array.isArray(doc?.acts) ? doc.acts : [];
  const actMeta = [];

  acts.forEach((act, ai) => {
    const list = normalizeActNodes(act, ai);
    let prevId = null;
    let firstIdInAct = null;

    list.forEach((n, si) => {
      const id = n.id || `a${ai+1}s${si+1}`;
      const out = coerceNode(n, id);
      nodes[id] = out;

      if (!firstIdInAct) firstIdInAct = id;
      if (!startId) startId = (act && act.start) || firstIdInAct;

      // link prev -> this if prev has no explicit next/to and is not a choice/end
      if (prevId) {
        const pn = nodes[prevId];
        if (pn && !pn.to && !pn.next && pn.type !== 'choice' && pn.type !== 'end') {
          pn.next = id;
        }
      }
      prevId = id;
    });

    actMeta.push({ first: firstIdInAct, last: prevId });
  });

  // chain acts if needed
  for (let i=0; i<actMeta.length-1; i++){
    const last = actMeta[i].last;
    const nextFirst = actMeta[i+1].first;
    if (last && nextFirst) {
      const ln = nodes[last];
      if (ln && !ln.to && !ln.next && ln.type !== 'choice' && ln.type !== 'end') {
        ln.to = nextFirst;
      }
    }
  }

  // finalize startId fallback
  if (!startId) {
    const keys = Object.keys(nodes);
    if (keys.length) startId = keys[0];
  }

  return { title: doc?.title || '', startId, nodes, meters: doc?.meters || {} };
}

export function ensureGraph(doc){
  if (isGraphLike(doc)) return doc;
  if (doc?.version === 2) return toGraph(doc);
  // ultra-fallback coercion
  const acts = Array.isArray(doc?.acts) ? doc.acts : (Array.isArray(doc?.steps) ? [{ steps: doc.steps }] : []);
  return toGraph({ title: doc?.title || '', acts, meters: doc?.meters || {} });
}
