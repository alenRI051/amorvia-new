\
// /js/app.v2.js  (cache-busted compat + robust engine autoload)
import { /* placeholder to keep ESM */ } from 'data:text/javascript,export default null';

const BUILD = (window.AMORVIA_BUILD || 'v' + new Date().toISOString().slice(0,10));
const COMPAT_URL = `/js/compat/v2-to-graph.js?v=${BUILD}`;

let _enginePromise;
async function getEngine(){
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
    '/scenarioEngine.js'
  ];

  _enginePromise = (async () => {
    let last;
    for (const p of candidates) {
      try {
        const mod = await import(p + '?v=' + BUILD);
        const E = window.ScenarioEngine || mod.ScenarioEngine || mod.engine || mod.default;
        if (E && (E.loadScenario || E.start || E.startAct)) {
          if (!window.ScenarioEngine) window.ScenarioEngine = E;
          console.info('[v2] engine loaded from', p);
          return E;
        }
      } catch(e){ last = e; }
    }
    throw last || new Error('Engine not available');
  })();
  return _enginePromise;
}

async function ensureCompat(){
  const m = await import(COMPAT_URL);
  const ensure = m.ensureGraph || m.toGraph || ((d)=>d);
  return { ensure, raw: m };
}

export async function loadScenarioById(id){
  const res = await fetch(`/data/${id}.v2.json?ts=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP '+res.status+' '+res.url);
  const raw = await res.json();

  const { ensure } = await ensureCompat();
  let graph = ensure(raw);

  // Safety: if still not a usable graph, try toGraph explicitly
  if (!graph?.startId || !graph.nodes?.[graph.startId]) {
    try {
      const m = await import(COMPAT_URL);
      if (typeof m.toGraph === 'function') graph = m.toGraph(raw);
    } catch {}
  }
  if (!graph?.startId || !graph.nodes?.[graph.startId]) {
    console.error('[v2] bad graph after compat', graph);
    throw new Error('Scenario conversion failed (no start node)');
  }

  const E = await getEngine();
  if (typeof E.loadScenario === 'function') E.loadScenario(graph);
  if (typeof E.start === 'function') E.start(graph.startId);
  else if (typeof E.startAct === 'function') E.startAct(0);
}

export async function init(){
  const pick = document.getElementById('scenarioPicker');
  try {
    if (pick && !pick.options.length) {
      const idx = await fetch('/data/v2-index.json?ts='+Date.now(), { cache:'no-store' }).then(r=>r.json());
      const list = Array.isArray(idx?.scenarios) ? idx.scenarios : [];
      for (const s of list) {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.title || s.id;
        pick.appendChild(o);
      }
    }
  } catch (e) { console.warn('[v2] index load failed', e); }

  pick?.addEventListener('change', () => loadScenarioById(pick.value));
  if (pick?.value) loadScenarioById(pick.value);

  window.AmorviaV2 = window.AmorviaV2 || {};
  window.AmorviaV2.loadScenarioById = loadScenarioById;
  console.info('[v2] app.v2 ready', { BUILD, COMPAT_URL });
}
