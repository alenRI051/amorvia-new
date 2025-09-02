// /js/compat/v2-to-graph.js
export function toGraph(v2) {
  // Already a graph?
  if (v2 && v2.startId && v2.nodes && typeof v2.nodes === 'object' && Object.keys(v2.nodes).length) {
    return v2;
  }

  const g = {
    title: v2?.title || 'Scenario',
    startId: '',
    nodes: {},
    meters: v2?.meters || {}
  };

  const acts = Array.isArray(v2?.acts) ? v2.acts : [];
  let prevId = null;

  for (let ai = 0; ai < acts.length; ai++) {
    const steps = Array.isArray(acts[ai]?.steps) ? acts[ai].steps : [];
    for (let si = 0; si < steps.length; si++) {
      const step = steps[si];
      const id = `a${ai + 1}s${si + 1}`;

      let node;
      if (typeof step === 'string') {
        node = { id, type: 'line', text: step };
      } else if (step && typeof step === 'object') {
        // Choice node?
        if (step.type === 'choice' || Array.isArray(step.choices)) {
          node = {
            id,
            type: 'choice',
            prompt: step.prompt || step.text || '',
            choices: (step.choices || []).map((c, ci) => {
              if (typeof c === 'string') return { label: c, to: null };
              return {
                label: c?.label || c?.text || `Option ${ci + 1}`,
                effects: c?.effects,
                to: c?.to || c?.next || null
              };
            })
          };
        }
        // Explicit end?
        else if (step.type === 'end' || step.end === true) {
          node = { id, type: 'end', text: step.text || '' };
        }
        // Goto?
        else if (step.to || step.next) {
          node = { id, type: 'goto', text: step.text || '', to: step.to || step.next };
        }
        // Plain line with text or unknown object → stringify fallback
        else {
          node = { id, type: 'line', text: step.text ?? String(step) };
        }
      } else {
        node = { id, type: 'line', text: String(step) };
      }

      g.nodes[id] = node;
      if (!g.startId) g.startId = id;

      // Auto-chain linear nodes: only when previous isn’t choice/end and doesn’t already link
      if (prevId) {
        const p = g.nodes[prevId];
        if (p && p.type !== 'choice' && p.type !== 'end' && !p.to && !p.next) p.next = id;
      }
      prevId = id;
    }
  }

  // Fill missing choice outputs to the next node (or END)
  const ids = Object.keys(g.nodes);
  const ensureNext = (i) => ids[i + 1] || 'END';
  ids.forEach((id, i) => {
    const n = g.nodes[id];
    if (n?.type === 'choice' && Array.isArray(n.choices)) {
      n.choices = n.choices.map((c, ci) => ({
        label: c.label || `Option ${ci + 1}`,
        effects: c.effects,
        to: c.to || ensureNext(i)
      }));
    }
  });

  // Guarantee a usable start
  if (!g.startId || !g.nodes[g.startId]) {
    g.startId = ids[0] || 'END';
  }
  if (!g.nodes[g.startId]) {
    g.nodes[g.startId] = { id: g.startId, type: 'end', text: '(empty scenario)' };
  }
  if (!g.nodes.END) g.nodes.END = { id: 'END', type: 'end', text: '— End —' };

  return g;
}

export function ensureGraph(v2) {
  try { return toGraph(v2); }
  catch (e) {
    console.error('[v2->graph] failed', e);
    return {
      title: v2?.title || 'Scenario',
      startId: 'END',
      nodes: { END: { id: 'END', type: 'end', text: '— End —' } }
    };
  }
}

