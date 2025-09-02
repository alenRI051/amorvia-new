// /js/compat/v2-to-graph.js — tolerant converter
export function ensureGraph(v2){
  try{
    if (!v2) throw new Error('no doc');
    // Already graph-like?
    if (v2.startId && v2.nodes) return v2;

    const acts = Array.isArray(v2.acts) ? v2.acts : [];
    const nodes = {};
    let startId = null;
    let prevId = null;
    let actIndex = 0;
    for (const act of acts){
      actIndex++;
      const steps = Array.isArray(act.steps) ? act.steps : [];
      let stepIndex = 0;
      for (const s of steps){
        stepIndex++;
        const id = `a${actIndex}s${stepIndex}`;
        if (!startId) startId = id;
        nodes[id] = { id, type:'line', text: String(s||'') };
        if (prevId) nodes[prevId].next = id;
        prevId = id;
      }
    }
    if (!startId){
      // fabricate one node
      startId = 'a1s1';
      nodes[startId] = { id:startId, type:'line', text: v2.title || 'Start' };
    }else{
      // end marker
      const endId = 'END';
      nodes[prevId].next = endId;
      nodes[endId] = { id:endId, type:'end', text:'— End —' };
    }
    return { title: v2.title || v2.id || 'Scenario', startId, nodes };
  }catch(e){
    console.error('[ensureGraph] failed', e);
    return { title:'Error', startId:'END', nodes:{ END:{ id:'END', type:'end', text:'— End —' } } };
  }
}
