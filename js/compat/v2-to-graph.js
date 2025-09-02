\
// /js/compat/v2-to-graph.js  — ultra-robust converter
export function isGraphLike(doc){
  return !!(doc && typeof doc === 'object' && doc.startId && doc.nodes && typeof doc.nodes === 'object');
}
function coerceChoice(c){
  if (!c) return null;
  const out = { label: c.label || 'Option', to: c.to || c.next || null };
  if (c.effects) out.effects = c.effects;
  return out;
}
function coerceNode(n, fallbackId){
  if (typeof n === 'string') return { id: fallbackId, type: 'line', text: n };
  const id = n.id || fallbackId;
  const type = n.type || (Array.isArray(n.choices) ? 'choice' : (n.to || n.next) ? 'goto' : 'line');
  const text = n.text || n.prompt || '';
  const out = { id, type, text };
  if (n.to) out.to = n.to;
  if (n.next) out.next = n.next;
  if (Array.isArray(n.choices)) {
    const choices = n.choices.map(coerceChoice).filter(Boolean);
    if (choices.length) out.choices = choices;
  }
  return out;
}
function normalizeActNodes(act, ai){
  if (act?.nodes) {
    if (Array.isArray(act.nodes)) return act.nodes.map((n, si)=>coerceNode(n, `a${ai+1}s${si+1}`));
    if (typeof act.nodes === 'object') {
      const keys = Object.keys(act.nodes);
      return keys.map((k, idx)=>coerceNode({ id:k, ...(act.nodes[k]||{}) }, `a${ai+1}s${idx+1}`));
    }
  }
  if (Array.isArray(act?.steps)) return act.steps.map((s, si)=>coerceNode(s, `a${ai+1}s${si+1}`));
  return [];
}
export function toGraph(v2){
  const nodes = {};
  let startId = '';
  const acts = Array.isArray(v2?.acts) ? v2.acts : [];
  const meta = [];
  acts.forEach((act, ai) => {
    const list = normalizeActNodes(act, ai);
    let prev = null, first = null;
    list.forEach((n, si)=>{
      const id = n.id || `a${ai+1}s${si+1}`;
      const out = coerceNode(n, id);
      nodes[id] = out;
      if (!first) first = id;
      if (!startId) startId = act?.start || first;
      if (prev) {
        const pn = nodes[prev];
        if (pn && !pn.to && !pn.next && pn.type !== 'choice' && pn.type !== 'end') pn.next = id;
      }
      prev = id;
    });
    meta.push({ first, last: prev });
  });
  for (let i=0;i<meta.length-1;i++){
    const a = meta[i], b = meta[i+1];
    if (a.last && b.first) {
      const ln = nodes[a.last];
      if (ln && !ln.to && !ln.next && ln.type !== 'choice' && ln.type !== 'end') ln.to = b.first;
    }
  }
  if (!startId) {
    const k = Object.keys(nodes);
    if (k.length) startId = k[0];
  }
  return { title: v2?.title || '', startId, nodes, meters: v2?.meters || {} };
}
export function ensureGraph(doc){
  if (isGraphLike(doc)) return doc;
  if (doc?.version === 2) return toGraph(doc);
  const acts = Array.isArray(doc?.acts) ? doc.acts : (Array.isArray(doc?.steps) ? [{ steps: doc.steps }] : []);
  return toGraph({ title: doc?.title || '', acts, meters: doc?.meters || {} });
}
