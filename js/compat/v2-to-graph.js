
// Ultra-robust v2 -> engine graph converter
// Accepts:
//  - Already graph-like {startId, nodes} -> returns as-is
//  - v2 compact: {version:2, meters?, acts:[{title?, steps:[string|{text|prompt|choices|to|type}] }...]}
export function ensureGraph(v2){
  if (!v2 || typeof v2 !== 'object') throw new Error('Invalid v2 doc');
  if (v2.startId && v2.nodes) return v2; // already a graph

  const graph = { title: v2.title || '', startId: '', nodes: {}, meters: v2.meters || {} };

  // Prefer explicit start field if present
  if (v2.start) graph.startId = String(v2.start);

  let madeAny = false;
  const acts = Array.isArray(v2.acts) ? v2.acts : [];
  for (let ai=0; ai<acts.length; ai++){
    const steps = Array.isArray(acts[ai].steps) ? acts[ai].steps : [];
    for (let si=0; si<steps.length; si++){
      madeAny = true;
      const id = `a${ai+1}s${si+1}`;
      const nextId = `a${ai+1}s${si+2}`;
      const nextActStart = `a${ai+2}s1`;
      const step = steps[si];

      // Normalize step object
      let node = { id };
      if (typeof step === 'string'){
        node.type = 'line';
        node.text = step;
      } else if (step && typeof step === 'object'){
        // Choice step (prompt + choices)
        if (Array.isArray(step.choices)){
          node.type = 'choice';
          node.text = step.prompt || step.text || '';
          node.choices = step.choices.map((c, idx) => {
            const lbl = (c && (c.label || c.text)) || `Option ${idx+1}`;
            let to = c && (c.to || c.next);
            if (!to){
              // Default: next step in same act else first step of next act else END
              if (steps[si+1]) to = nextId;
              else if (acts[ai+1]?.steps?.length) to = nextActStart;
              else to = 'END';
            }
            return { label: lbl, to, effects: c?.effects };
          });
        } else if (step.type === 'goto' && step.to){
          node.type = 'goto';
          node.text = step.text || '';
          node.to = step.to;
        } else {
          node.type = step.type || 'line';
          node.text = step.text || '';
        }
      } else {
        node.type = 'line';
        node.text = String(step ?? '');
      }

      // Default linear link when not choice/goto with explicit to
      if (node.type !== 'choice' && !node.to && si < steps.length-1){
        node.next = nextId;
      } else if (!node.to && si === steps.length-1){
        // last in act -> next act or END
        if (acts[ai+1]?.steps?.length) node.next = nextActStart;
      }

      graph.nodes[id] = node;
      if (!graph.startId) graph.startId = id;
    }
  }

  if (!madeAny){
    // Fallback: single END node
    graph.startId = 'END';
    graph.nodes.END = { id: 'END', type: 'end', text: '— End —' };
  } else {
    // Ensure terminal END node is resolvable
    if (!graph.nodes.END){
      graph.nodes.END = { id: 'END', type: 'end', text: '— End —' };
    }
  }
  return graph;
}
