// Hardened v2 loader – always converts scenario.v2 to a graph before giving it to the engine.
import { ensureGraph } from '/js/compat/v2-to-graph.js';

// Minimal engine access helper (adjust if your engine lives elsewhere)
function eng(){
  return window.ScenarioEngine || window.AmorviaV2?.engine || window.Amorvia?.engine;
}

/** Loads by id from /data/<id>.v2.json, converts to graph, and starts the engine */
export async function loadScenarioById(id){
  const raw = await fetch(`/data/${id}.v2.json`, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('HTTP '+r.status+' '+r.url);
    return r.json();
  });
  const graph = ensureGraph(raw);
  if (!graph || !graph.startId || !graph.nodes || !graph.nodes[graph.startId]) {
    console.error('[v2] bad graph', graph);
    throw new Error('Scenario conversion failed (no start node)');
  }
  const E = eng();
  if (!E || typeof E.loadScenario !== 'function') {
    console.error('[v2] engine missing or invalid', E);
    throw new Error('Engine not available');
  }
  E.loadScenario(graph);
  if (typeof E.start === 'function') E.start(graph.startId);
  else if (typeof E.startAct === 'function') E.startAct(0);
  console.debug('[v2] started', { id, start: graph.startId, nodes: Object.keys(graph.nodes).length });
}

/** Optional init that wires a simple scenario picker if present */
export async function init(){
  // Populate picker from index if present
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
  // Hook change
  pick?.addEventListener('change', () => loadScenarioById(pick.value));
  // Autostart first option (if any)
  if (pick && pick.value) loadScenarioById(pick.value);
  // expose for addons/console
  window.AmorviaV2 = window.AmorviaV2 || {};
  window.AmorviaV2.loadScenarioById = loadScenarioById;
}
