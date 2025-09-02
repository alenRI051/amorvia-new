import * as conv from '/js/compat/v2-to-graph.js';

function safeEnsureGraph(v2){
  try {
    const fn = conv.ensureGraph || conv.toGraph;
    const g1 = fn?.(v2);
    if (g1?.startId && g1.nodes?.[g1.startId]) return g1;
  } catch {}
  // minimal fallback in case converter failed
  const nodes = { END:{id:'END',type:'end',text:'— End —'} };
  return { title: v2?.title || v2?.id || 'Scenario', startId:'END', nodes };
}

async function getEngine(){
  if (window.ScenarioEngine) return window.ScenarioEngine;
  const paths=[
    '/js/engine/scenarioEngine.js','/js/engine/scenario-engine.js','/js/engine/ScenarioEngine.js',
    '/js/scenarioEngine.js','/js/ScenarioEngine.js','/engine/scenarioEngine.js','/engine/ScenarioEngine.js','/scenarioEngine.js'
  ];
  for (const p of paths) {
    try {
      const m = await import(p + '?v=' + Date.now());
      const E = window.ScenarioEngine || m.ScenarioEngine || m.engine || m.default;
      if (E && (E.loadScenario || E.start || E.startAct)) { window.ScenarioEngine = E; return E; }
    } catch {}
  }
  throw new Error('engine missing');
}

export async function loadScenarioById(id){
  const raw = await fetch(`/data/${id}.v2.json?ts=${Date.now()}`, {cache:'no-store'}).then(r=>r.json());
  const g   = safeEnsureGraph(raw);
  const E   = await getEngine();
  E.loadScenario?.(g);
  (E.start?.(g.startId)) ?? (E.startAct?.(0));
}

export async function init(){
  const pick = document.getElementById('scenarioPicker');
  if (pick && !pick.options.length) {
    try {
      const idx = await fetch('/data/v2-index.json?ts='+Date.now(), {cache:'no-store'}).then(r=>r.json());
      (idx.scenarios||[]).forEach(s => {
        const o=document.createElement('option'); o.value=s.id; o.textContent=s.title||s.id; pick.appendChild(o);
      });
    } catch(e){ console.warn('[v2] index load failed', e); }
  }
  pick?.addEventListener('change', ()=>loadScenarioById(pick.value));
  if (pick?.value) loadScenarioById(pick.value);
  window.AmorviaV2 = Object.assign(window.AmorviaV2||{}, { loadScenarioById });
}
init().catch(console.error);

