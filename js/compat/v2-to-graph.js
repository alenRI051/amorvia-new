// /js/compat/v2-to-graph.js
// Accepts outline-style v2 docs and builds a minimal playable graph.
// v2 shape supported: { version:2, title?, meters?, acts:[ { title?, steps:[ string | {text?, prompt?, choices?, to?, end?} ] } ] }

function asChoiceList(step, nextId) {
  // normalize choices from a variety of shapes
  const out = [];
  if (!step) return out;
  if (Array.isArray(step.choices)) {
    for (const c of step.choices) {
      if (!c) continue;
      out.push({
        label: c.label ?? c.text ?? 'Option',
        effects: c.effects || undefined,
        to: (typeof c.to === 'string')
          ? c.to
          : (typeof c.toIndex === 'number' ? c.toIndex : undefined), // handled below
      });
    }
  } else if (step.options) {
    for (const k of Object.keys(step.options)) {
      const v = step.options[k];
      out.push({ label: k, to: (typeof v === 'string') ? v : undefined });
    }
  }
  // Fill missing "to" with the provided nextId (linear fallthrough)
  return out.map(ch => ({ label: ch.label || 'Option', effects: ch.effects, to: ch.to ?? nextId }));
}

export function ensureGraph(v2) {
  // If it already looks like a graph, pass it through
  if (v2 && v2.startId && v2.nodes && typeof v2.nodes === 'object') return v2;
  return toGraph(v2);
}

export function toGraph(v2) {
  const title = v2?.title || 'Scenario';
  const acts = Array.isArray(v2?.acts) ? v2.acts : [];
  const nodes = {};
  const END = 'END';
  nodes[END] = { id: END, type: 'end', text: '— End —' };

  let startId = null;
  let lastId = null;

  // Walk acts → steps, emit nodes a{act}s{step}
  acts.forEach((act, ai) => {
    const steps = Array.isArray(act?.steps) ? act.steps : [];
    steps.forEach((step, si) => {
      const id = `a${ai + 1}s${si + 1}`;
      const nextId = (si + 1 < steps.length) ? `a${ai + 1}s${si + 2}` : END;
      if (!startId) startId = id;

      // STEP VARIANTS
      if (typeof step === 'string') {
        nodes[id] = { id, type: 'line', text: step, next: nextId };
      } else if (step && typeof step === 'object') {
        // explicit end?
        if (step.end === true) {
          nodes[id] = { id, type: 'end', text: step.text || '— End —' };
        }
        // explicit goto?
        else if (typeof step.to === 'string') {
          nodes[id] = { id, type: 'goto', text: step.text || '', to: step.to };
        }
        // choice node?
        else if (step.prompt || step.choices || step.options) {
          const choices = asChoiceList(step, nextId).map((c, idx) => {
            // support numeric toIndex by translating to the id within *the same act*
            let to = c.to;
            if (typeof to === 'number') {
              const idxId = (to >= 1 && to <= steps.length) ? `a${ai + 1}s${to}` : nextId;
              to = idxId;
            }
            return { label: c.label || `Option ${idx + 1}`, effects: c.effects, to };
          });
          nodes[id] = { id, type: 'choice', prompt: step.prompt || step.text || 'Choose:', choices };
        }
        // plain line object
        else {
          nodes[id] = { id, type: 'line', text: step.text || '', next: nextId };
        }
      } else {
        // unknown → safe line
        nodes[id] = { id, type: 'line', text: '', next: nextId };
      }

      lastId = id;
    });
  });

  // No steps at all? fabricate a single endcard
  if (!startId) {
    startId = END;
  } else {
    // if last node accidentally has no exit, point to END
    if (nodes[lastId] && !nodes[lastId].next && nodes[lastId].type !== 'end' && nodes[lastId].type !== 'choice' && nodes[lastId].type !== 'goto') {
      nodes[lastId].next = END;
    }
  }

  return { title, startId, nodes };
}

