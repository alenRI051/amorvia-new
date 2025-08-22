
(async function(){
  const ensure = await import('/js/compat/v2-to-graph.js');
  const engine = () => (window.ScenarioEngine || window.AmorviaV2?.engine || window.Amorvia?.engine || null);

  async function fetchV2(id){
    const r = await fetch(`/data/${id}.v2.json`, { cache:'no-cache' });
    if (!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }

  async function loadAndStart(id){
    const raw = await fetchV2(id);
    const graph = ensure.ensureGraph(raw);
    const e = engine();
    if (e?.loadScenario){
      e.loadScenario(graph);
      if (typeof e.start === 'function') e.start(graph.startId);
      else if (typeof e.startAct === 'function') e.startAct(0);
    }
    return graph;
  }

  const targets = [
    ['AmorviaV2','loadScenarioById'],
    ['','loadScenarioById'],
    ['Amorvia','loadScenarioById']
  ];
  for (const [ns,key] of targets){
    const ctx = ns ? (window[ns] = window[ns] || {}) : window;
    if (typeof ctx[key] === 'function'){
      const orig = ctx[key].bind(ctx);
      ctx[key] = async function(id){
        try { return await loadAndStart(id); }
        catch(e){ console.warn('[ensure-graph] fallback to original:', e); return orig(id); }
      };
    }
  }

  window.addEventListener('amorvia:select-scenario', async (ev)=>{
    const id = ev?.detail?.id;
    if (!id) return;
    try{ await loadAndStart(id); }catch(e){ console.warn('[ensure-graph] event load failed', e); }
  });

  window.ensureGraphLoadById = loadAndStart;
})();
