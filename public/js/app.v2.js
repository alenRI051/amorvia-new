// /public/js/app.v2.js
import { ensureGraph } from '/js/compat/v2-to-graph.js';

// Try to find or import the engine on demand
let _enginePromise;
async function getEngine() {
  if (window.ScenarioEngine) return window.ScenarioEngine;
  if (!_enginePromise) {
    // Adjust the first path if your file lives elsewhere
    const candidates = [
      '/js/engine/scenarioEngine.js',
      '/js/engine/ScenarioEngine.js',
      '/js/scenarioEngine.js'
    ];
    _enginePromise = (async () => {
      let lastErr;
      for (const p of candidates) {
        try {
          const mod = await import(p);
          return window.ScenarioEngine || mod.ScenarioEngine || mod.default;
        } catch (e) { lastErr = e; }
      }
      throw new Error('Engine not available (tried: ' + candidates.join(', ') + ') ' + (lastErr?.message || ''));
    })();
  }
  return _enginePromise;
}

/** Loads /data/<id>.v2.json, converts to graph, and starts the engine */
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
  if (!E?.loadScenario) throw new Error('Engine not available');

  E.loadScenario(graph);
  if (typeof E.start === 'function') E.start(graph.startId);
  else if (typeof E.startAct === 'function') E.startAct(0);

  console.debug('[v2] started', { id, start: graph.startId, nodes: Object.keys(graph.nodes).length });
}

/** Optional init: populate picker and autostart */
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

