// Ultra-robust v2 -> graph converter for Amorvia
// Accepts v2 docs (version:2, acts:[{steps:[...]}]) and emits {title,startId,nodes:{...}}

function normalizeChoice(ch, fallbackTo) {
  if (!ch || typeof ch !== 'object') {
    return { label: String(ch ?? 'Continue'), to: fallbackTo };
  }
  const label = ch.label ?? ch.text ?? ch.title ?? 'Continue';
  const to = ch.to ?? ch.next ?? fallbackTo;
  const effects = ch.effects && typeof ch.effects === 'object' ? ch.effects : undefined;
  return { label, to, effects };
}

export function toGraph(v2) {
  // If it already looks like a graph, return as-is.
  if (v2 && v2.nodes && v2.startId) return v2;

  if (!v2 || v2.version !== 2 || !Array.isArray(v2.acts) || v2.acts.length === 0) {
    throw new Error('Invalid v2 scenario');
  }

  const nodes = {};
  let startId = null;
  const idFor = (ai, si) => `a${ai + 1}s${si + 1}`;

  v2.acts.forEach((act, ai) => {
    const steps = Array.isArray(act?.steps) ? act.steps : [];
    for (let si = 0; si < steps.length; si++) {
      const step = steps[si];
      const id = idFor(ai, si);

      // Determine next id in linear flow (same act, next step)
      const nextId = si + 1 < steps.length ? idFor(ai, si + 1) : null;

      if (typeof step === 'string') {
        nodes[id] = { id, type: 'line', text: step };
        if (nextId) nodes[id].next = nextId;
      } else if (step && (step.type === 'choice' || step.prompt || step.choices)) {
        const prompt = step.prompt ?? step.text ?? step.title ?? '';
        const list = Array.isArray(step.choices) ? step.choices : [];
        nodes[id] = {
          id,
          type: 'choice',
          prompt,
          choices: list.map(ch => normalizeChoice(ch, nextId))
        };
      } else if (step && (step.to || step.next)) {
        nodes[id] = { id, type: 'goto', to: step.to ?? step.next };
      } else {
        // Fallback: stringify objects/unknowns
        nodes[id] = { id, type: 'line', text: String(step ?? '') };
        if (nextId) nodes[id].next = nextId;
      }

      if (!startId) startId = id;
    }
  });

  // Create a terminal END node and link any dangling nodes to END
  const END = 'END';
  if (!nodes[END]) nodes[END] = { id: END, type: 'end', text: '— End —' };

  for (const n of Object.values(nodes)) {
    if (n.type === 'choice') {
      n.choices = (n.choices ?? []).map(ch =>
        ({ ...ch, to: ch.to || END })
      );
    } else if (!n.next && !n.to && n.id !== END) {
      n.next = END;
    }
  }

  return {
    title: v2.title ?? 'Scenario',
    startId,
    nodes
  };
}

export function ensureGraph(doc) {
  try { return toGraph(doc); }
  catch (e) {
    console.error('[ensureGraph] failed, fabricating minimal END graph:', e);
    return { title: doc?.title ?? 'Scenario', startId: 'END', nodes: { END: { id: 'END', type: 'end', text: '— End —' } } };
  }
}

export default ensureGraph;
