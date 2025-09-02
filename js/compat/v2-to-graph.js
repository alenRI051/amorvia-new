// /js/compat/v2-to-graph.js
// Ultra-robust v2 -> engine graph converter
// Input v2 shape: { version:2, id, title, meters?, acts:[ { title?, steps:[ string | {prompt, choices:[{label, effects?, to?}]} ] } ] }
// Output graph shape: { title, startId, nodes: { [id]: { id, text?, type?, choices?, to?, next? } } }

function isArr(a) { return Array.isArray(a); }
function stepId(ai, si) { return `a${ai}s${si}`; }
function hasSteps(act) { return act && isArr(act.steps) && act.steps.length > 0; }

export function ensureGraph(v2) {
  try {
    if (!v2 || +v2.version !== 2) throw new Error('Invalid v2 scenario');

    const acts = isArr(v2.acts) ? v2.acts : [];
    const nodes = {};
    let startId = null;

    // precompute which acts actually have steps
    const actIdxs = acts.map((a, i) => ({ i: i + 1, len: (a?.steps?.length || 0) })).filter(x => x.len > 0);
    if (actIdxs.length === 0) {
      // graceful minimal graph
      nodes.END = { id: 'END', type: 'end', text: '— End —' };
      return { title: v2.title || v2.id || 'Scenario', startId: 'END', nodes };
    }
    startId = stepId(actIdxs[0].i, 1);

    // helper to compute the default "next" id
    function nextOf(ai, si) {
      const act = acts[ai - 1];
      const steps = act?.steps || [];
      // next step in same act?
      if (si < steps.length) return stepId(ai, si + 1);
      // otherwise first step of the next non-empty act
      for (let k = 0; k < actIdxs.length; k++) {
        if (actIdxs[k].i === ai && actIdxs[k + 1]) {
          return stepId(actIdxs[k + 1].i, 1);
        }
      }
      return 'END';
    }

    // build nodes
    for (let ai = 1; ai <= acts.length; ai++) {
      const act = acts[ai - 1];
      if (!hasSteps(act)) continue;
      const steps = act.steps;

      for (let si = 1; si <= steps.length; si++) {
        const id = stepId(ai, si);
        const s = steps[si - 1];

        // string -> simple line, auto-continue
        if (typeof s === 'string') {
          nodes[id] = { id, text: s, next: nextOf(ai, si) };
          continue;
        }

        // object with choices -> choice node
        if (s && typeof s === 'object' && isArr(s.choices) && s.choices.length > 0) {
          const choices = s.choices.map((c, idx) => ({
            label: c?.label ?? `Option ${idx + 1}`,
            effects: c?.effects || undefined,
            to: c?.to || nextOf(ai, si)
          }));
          nodes[id] = {
            id,
            type: 'choice',
            text: s.prompt || '',
            choices
          };
          continue;
        }

        // object without choices -> treat as a line; prefer text/prompt fields, auto-continue
        const text = s?.text ?? s?.prompt ?? '';
        nodes[id] = { id, text: String(text), next: nextOf(ai, si) };
      }
    }

    // ensure END
    if (!nodes.END) nodes.END = { id: 'END', type: 'end', text: '— End —' };

    return {
      title: v2.title || v2.id || 'Scenario',
      startId,
      nodes
    };
  } catch (e) {
    console.error('[v2->graph] conversion failed:', e);
    // last-resort minimal graph
    return { title: v2?.title || v2?.id || 'Scenario', startId: 'END', nodes: { END: { id: 'END', type: 'end', text: '— End —' } } };
  }
}

// alias for older imports
export const toGraph = ensureGraph;

// handy console helper for quick validation
if (!window.__consoleEnsureGraph) {
  window.__consoleEnsureGraph = (raw) => {
    const g = ensureGraph(raw);
    console.log('[ensureGraph]', { startId: g.startId, nodes: Object.keys(g.nodes).length });
    return g;
  };
}

