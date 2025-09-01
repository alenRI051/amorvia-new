// v2 loader with robust engine autoload
import { ensureGraph } from '/js/compat/v2-to-graph.js';

let _enginePromise;
async function getEngine() {
  // Existing global?
  if (window.ScenarioEngine) return window.ScenarioEngine;
  if (_enginePromise) return _enginePromise;

  const candidates = [
    '/js/engine/scenarioEngine.js',
    '/js/engine/scenario-engine.js',
    '/js/engine/ScenarioEngine.js',
    '/js/scenarioEngine.js',
    '/js/ScenarioEngine.js',
    '/engine/scenarioEngine.js',
    '/engine/ScenarioEngine.js',
    '/scenarioEngine.js'                 // <-- seen in earlier stack traces
  ];

  _enginePromise = (async () => {
    let lastErr;
    for (const p of candidates) {
      try {
        const mod = await import(p);
        const E = window.ScenarioEngine || mod.ScenarioEngine || mod.engine || mod.default;
        if (E && (typeof E.loadScenario === 'function' || typeof E.start === 'function' || typeof E.startAct === 'function')) {
          console.info('[v2] engine loaded from', p);
          // Attach globally for other modules
          if (!window.ScenarioEngine) window.ScenarioEngine = E;
          return E;
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error('Engine not available (tried: ' + candidates.join(', ') + ')');
  })();

  return _enginePromise;
}

export async function loadScenarioById(id){
  const raw = await fetch(`/data/${id}.v2.json`, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('HTTP '+r.status+' '+r.url);
    return r.json();
  });
  const graph = ensureGraph(raw);
  if (!graph?.startId || !graph.nodes?.[graph.startId]) {
    console.error('[v2] bad graph', graph);
    throw new Error('Scenario conversion failed (no start node)');
  }

  const E = await getEngine();
  if (!E?.loadScenario && typeof E !== 'object') throw new Error('Engine not available');

  // Normalize simple engine API variants
  const api = E;
  if (typeof api.loadScenario === 'function') api.loadScenario(graph);
  if (typeof api.start === 'function') api.start(graph.startId);
  else if (typeof api.startAct === 'function') api.startAct(0);

  console.debug('[v2] started', { id, start: graph.startId, nodes: Object.keys(graph.nodes).length });
}

export async function init(){
  const pick = document.getElementById('scenarioPicker');
  if (pick && !pick.options.length) {
    try {
      const idx = await fetch('/data/v2-index.json', { cache:'no-store' }).then(r=>r.json());
      const list = Array.isArray(idx?.scenarios) ? idx.scenarios : [];
      for (const s of list) {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.title || s.id;
        pick.appendChild(o);
      }
    } catch {}
  }
  pick?.addEventListener('change', () => loadScenarioById(pick.value));
  if (pick && pick.value) loadScenarioById(pick.value);
  window.AmorviaV2 = window.AmorviaV2 || {};
  window.AmorviaV2.loadScenarioById = loadScenarioById;
}
