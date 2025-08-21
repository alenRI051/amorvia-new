
export function toGraph(v2){
  if (!v2 || !Array.isArray(v2.acts)) throw new Error('Invalid v2 scenario');
  const nodes = {};
  const idFor = (a, s) => `a${a}s${s}`;
  let firstId = null;
  v2.acts.forEach((act, ai) => {
    const steps = Array.isArray(act.steps) ? act.steps : [];
    steps.forEach((st, si) => {
      const id = idFor(ai, si);
      if (!firstId) firstId = id;
      let text = (typeof st === 'string') ? st : (st.text ?? '');
      const choices = [];
      if (st && Array.isArray(st.choices)) {
        st.choices.forEach((c, ci) => {
          if (typeof c !== 'object') return;
          if (typeof c.goto === 'number') choices.push({ label: c.label || c.text || `Option ${ci+1}`, to: idFor(ai, c.goto) });
          else if (typeof c.gotoAct === 'number') choices.push({ label: c.label || c.text || `Option ${ci+1}`, to: idFor(c.gotoAct, 0) });
          else choices.push({ label: c.label || c.text || `Option ${ci+1}`, to: idFor(ai, si+1) });
        });
      } else {
        const next = (si+1 < steps.length) ? idFor(ai, si+1) : ((ai+1 < v2.acts.length) ? idFor(ai+1, 0) : null);
        if (next) choices.push({ label: 'Continue', to: next });
      }
      nodes[id] = { id, text, choices };
    });
  });
  return { schema: 'scenario.graph', version: 1, title: v2.title || v2.id, startId: firstId, nodes };
}
export function ensureGraph(doc){
  if (!doc) throw new Error('No doc');
  if (doc.nodes && doc.startId) return doc;
  if (doc.schema === 'scenario.v2') return toGraph(doc);
  return doc;
}
