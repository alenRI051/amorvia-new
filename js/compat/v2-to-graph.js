// Ultra-robust v2 -> graph converter (ESM)
// Accepts flexible v2 docs and returns { title, startId, nodes }
export function ensureGraph(v2){
  try{
    // Already a graph?
    if (v2 && v2.startId && v2.nodes && typeof v2.nodes === 'object'){
      return { title: v2.title || "", startId: v2.startId, nodes: v2.nodes };
    }
    const acts = Array.isArray(v2?.acts) ? v2.acts : [];
    const nodes = {};
    let startId = "";

    function addNode(n){
      if (!n.id) throw new Error("node missing id");
      nodes[n.id] = n;
    }

    function chainSteps(actIndex, steps){
      let prevId = "";
      for (let i=0;i<steps.length;i++){
        const id = `a${actIndex+1}s${i+1}`;
        if (!startId) startId = id;
        const n = { id, type: "line", text: String(steps[i] ?? "") };
        addNode(n);
        if (prevId) nodes[prevId].next = id;
        prevId = id;
      }
      return prevId; // last id
    }

    function copyNodes(actIndex, arr){
      let localStart = "";
      let lastId = "";
      for (let i=0;i<arr.length;i++){
        const src = arr[i] || {};
        const id = src.id || `a${actIndex+1}s${i+1}`;
        const dst = {
          id,
          type: src.type && ["line","choice","goto","end"].includes(src.type) ? src.type : undefined,
          text: src.text || undefined,
          next: src.next || undefined,
          to: src.to || undefined,
          choices: Array.isArray(src.choices) ? src.choices.map(c => ({
            label: c.label || "Option",
            to: c.to || id, // fallback to self if missing
            effects: c.effects || undefined
          })) : undefined
        };
        addNode(dst);
        if (!localStart) localStart = id;
        if (lastId && !nodes[lastId].next && !nodes[lastId].to && dst.id !== lastId){
          nodes[lastId].next = id;
        }
        lastId = id;
      }
      if (!startId) startId = localStart;
      return { localStart, lastId };
    }

    let lastOfPrev = "";
    acts.forEach((a, idx) => {
      if (Array.isArray(a?.nodes) && a.nodes.length){
        const { localStart, lastId } = copyNodes(idx, a.nodes);
        if (lastOfPrev && localStart && !nodes[lastOfPrev].next && !nodes[lastOfPrev].to){
          nodes[lastOfPrev].to = localStart;
        }
        lastOfPrev = lastId || lastOfPrev;
      } else if (Array.isArray(a?.steps) && a.steps.length){
        const tail = chainSteps(idx, a.steps);
        if (lastOfPrev && tail){
          // Connect previous act tail to this act head if not already linked
          const head = `a${idx+1}s1`;
          if (!nodes[lastOfPrev].next && !nodes[lastOfPrev].to){
            nodes[lastOfPrev].to = head;
          }
        }
        lastOfPrev = tail || lastOfPrev;
      }
    });

    if (!startId || !nodes[startId]){
      // Fallback minimal
      startId = "END";
      nodes[startId] = { id: "END", type: "end", text: "— End —" };
    }
    return { title: v2?.title || "", startId, nodes };
  }catch(e){
    console.warn("[ensureGraph] failed, returning minimal", e);
    return { title: v2?.title || "", startId: "END", nodes: { END: { id: "END", type: "end", text: "— End —" } } };
  }
}