// Ultra-robust v2 → graph converter (supports steps[] or nodes[]+start)
// Signature so we can verify in console:
window.__V2CONV_SIG = 'v2conv-ULTRA-2025-09-01';

function fromSteps(acts) {
  const g = { title: 'Scenario', startId: '', nodes: {} };
  let prevId = null;
  for (let ai = 0; ai < acts.length; ai++) {
    const steps = Array.isArray(acts[ai]?.steps) ? acts[ai].steps : [];
    for (let si = 0; si < steps.length; si++) {
      const id = `a${ai + 1}s${si + 1}`;
      const step = steps[si];
      let node;
      if (typeof step === 'string') {
        node = { id, type: 'line', text: step };
      } else if (step && typeof step === 'object') {
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
                to: c?.to || c?.next || null,
              };
            })
          };
        } else if (step.type === 'end' || step.end === true) {
          node = { id, type: 'end', text: step.text || '' };
        } else if (step.to || step.next) {
          node = { id, type: 'goto', text: step.text || '', to: step.to || step.next };
        } else {
          node = { id, type: 'line', text: step.text ?? String(step) };
        }
      } else {
        node = { id, type: 'line', text: String(step) };
      }
      g.nodes[id] = node;
      if (!g.startId) g.startId = id;
      if (prevId) {
        const p = g.nodes[prevId];
        if (p && p.type !== 'choice' && p.type !== 'end' && !p.to && !p.next) p.next = id;
      }
      prevId = id;
    }
  }
  return g;
}

function fromNodes(acts) {
  // take first act; expect { start: string, nodes: Array<Node> }
  const a = acts[0] || {};
  const arr = Array.isArray(a.nodes) ? a.nodes : [];
  const g = { title: 'Scenario', startId: a.start || (arr[0]?.id ?? ''), nodes: {} };
  for (const n of arr) {
    if (!n || !n.id) continue;
    // keep as-is; normalize minimal shape
    const out = { id: n.id, type: n.type || undefined };
    if (n.text != null) out.text = n.text;
    if (n.next) out.next = n.next;
    if (n.to) out.to = n.to;
    if (Array.isArray(n.choices)) {
      out.type = 'choice';
      out.prompt = n.prompt || n.text || '';
      out.choices = n.choices.map((c, i) => ({
        label: c?.label || c?.text || `Option ${i + 1}`,
        effects: c?.effects,
        to: c?.to || c?.next || null,
      }));
    }
    if (n.type === 'end') out.type = 'end';
    g.nodes[n.id] = out;
  }
  return g;
}

export function toGraph(v2) {
  const g = { title: v2?.title || 'Scenario', startId: '', nodes: {}, meters: v2?.meters || {} };
  const acts = Array.isArray(v2?.acts) ? v2.acts : [];

  let built = { startId: '', nodes: {} };
  if (acts.some(a => Array.isArray(a?.steps))) {
    built = fromSteps(acts);
  } else if (Array.isArray(acts[0]?.nodes)) {
    built = fromNodes(acts);
  }

  g.startId = built.startId || '';
  g.nodes = built.nodes || {};

  // Fill forward defaults for choice targets; chain trivial lines
  const ids = Object.keys(g.nodes);
  const ensureNext = (i) => ids[i + 1] || 'END';

  ids.forEach((id, i) => {
    const n = g.nodes[id];
    if (!n) return;
    if (n.type === 'choice' && Array.isArray(n.choices)) {
      n.choices = n.choices.map((c, ci) => ({
        label: c.label || `Option ${ci + 1}`,
        effects: c.effects,
        to: c.to || ensureNext(i),
      }));
    } else if (!n.type || n.type === 'line') {
      if (!n.next && !n.to) n.next = ensureNext(i);
    }
  });

  if (!g.nodes.END) g.nodes.END = { id: 'END', type: 'end', text: '— End —' };
  if (!g.startId || !g.nodes[g.startId]) g.startId = ids[0] || 'END';
  return g;
}

export function ensureGraph(v2) {
  try { return toGraph(v2); }
  catch (e) {
    console.error('[v2->graph] failed', e);
    return { title: v2?.title || 'Scenario', startId: 'END', nodes: { END: { id: 'END', type: 'end', text: '— End —' } } };
  }
}

