// v2 loader with robust engine autoload + converter
import { ensureGraph } from '/js/compat/v2-to-graph.js';

let _enginePromise;
async function getEngine(){
  if (window.ScenarioEngine) return window.ScenarioEngine;
  if (_enginePromise) return _enginePromise;
  const candidates = ['/js/engine/scenarioEngine.js','/js/engine/scenario-engine.js','/js/engine/ScenarioEngine.js','/js/scenarioEngine.js','/js/ScenarioEngine.js','/engine/scenarioEngine.js','/engine/ScenarioEngine.js','/scenarioEngine.js'];
  _enginePromise = (async()=>{
    let last;
    for (const p of candidates){
      try{
        const mod = await import(p + '?v=' + Date.now());
        const E = window.ScenarioEngine || mod.ScenarioEngine || mod.engine || mod.default;
        if (E && (E.loadScenario || E.start || E.startAct)){ if (!window.ScenarioEngine) window.ScenarioEngine = E; console.info('[v2] engine loaded from', p); return E; }
      }catch(e){ last = e; }
    }
    throw new Error('Engine not available (tried: '+candidates.join(', ')+')');
  })();
  return _enginePromise;
}

export async function loadScenarioById(id){
  const raw = await fetch(`/data/${id}.v2.json?ts=${Date.now()}`, { cache: 'no-store' }).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status+' '+r.url); return r.json(); });
  const graph = ensureGraph(raw);
  if (!graph?.startId || !graph.nodes?.[graph.startId]) { console.error('[v2] bad graph', graph); throw new Error('Scenario conversion failed (no start node)'); }
  const E = await getEngine();
  if (typeof E.loadScenario === 'function') E.loadScenario(graph);
  if (typeof E.start === 'function') E.start(graph.startId);
  else if (typeof E.startAct === 'function') E.startAct(0);
  window.currentScenarioId = id;
  console.debug('[v2] started', { id, start: graph.startId, nodes: Object.keys(graph.nodes).length });
}

export async function init(){
  const pick = document.getElementById('scenarioPicker');
  if (pick && !pick.options.length){
    try{
      const idx = await fetch('/data/v2-index.json?ts='+Date.now(), { cache:'no-store' }).then(r=>r.json());
      (idx.scenarios||[]).forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.title || s.id; pick.appendChild(o); });
    }catch{}
  }
  pick?.addEventListener('change', () => loadScenarioById(pick.value));
  if (pick && pick.value) loadScenarioById(pick.value); else if (pick && pick.options.length){ pick.selectedIndex = 0; loadScenarioById(pick.value); }
  const restart = document.getElementById('restartAct');
  restart?.addEventListener('click', () => { if (window.currentScenarioId) loadScenarioById(window.currentScenarioId); });
  window.AmorviaV2 = window.AmorviaV2 || {}; window.AmorviaV2.loadScenarioById = loadScenarioById;
}
