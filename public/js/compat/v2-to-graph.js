// /js/compat/v2-to-graph.js — ultra-robust converter
export function ensureGraph(v2){
  function isArr(a){ return Array.isArray(a); }
  const actsRaw = isArr(v2?.acts) ? v2.acts : [];
  // Normalize to [{steps:[...]}]
  const acts = actsRaw.map(a => isArr(a) ? { steps: a } : { steps: isArr(a?.steps) ? a.steps : [] })
                      .filter(a => a.steps.length);

  const nodes = {};
  if (!acts.length) {
    nodes.END = { id:'END', type:'end', text:'— End —' };
    return { title: v2?.title || v2?.id || 'Scenario', startId:'END', nodes };
  }

  const stepId = (ai,si)=>`a${ai}s${si}`;
  const nextOf = (ai,si)=>{
    const steps = acts[ai-1]?.steps || [];
    if (si < steps.length) return stepId(ai, si+1);
    return ai < acts.length ? stepId(ai+1, 1) : 'END';
  };

  for (let ai=1; ai<=acts.length; ai++){
    const steps = acts[ai-1].steps;
    for (let si=1; si<=steps.length; si++){
      const id = stepId(ai, si);
      const s  = steps[si-1];

      if (typeof s === 'string') {
        nodes[id] = { id, text: s, next: nextOf(ai, si) };
        continue;
      }
      if (s && isArr(s.choices) && s.choices.length){
        nodes[id] = {
          id, type:'choice', text: s.prompt || '',
          choices: s.choices.map((c,ci)=>({
            label: c?.label ?? `Option ${ci+1}`,
            effects: c?.effects || undefined,
            to: c?.to || nextOf(ai, si)
          }))
        };
        continue;
      }
      const text = s?.text ?? s?.prompt ?? '';
      const to   = s?.to   ?? s?.next   ?? nextOf(ai, si);
      nodes[id]  = { id, text: String(text), next: to };
    }
  }

  if (!nodes.END) nodes.END = { id:'END', type:'end', text:'— End —' };
  return { title: v2?.title || v2?.id || 'Scenario', startId: 'a1s1', nodes };
}
export const toGraph = ensureGraph;

