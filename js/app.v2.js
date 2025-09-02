// /js/app.v2.js — memoized engine loader (v2025-09-02-e)
import { ensureGraph } from '/js/compat/v2-to-graph.js';

let _enginePromise = null;
async function getEngine(){
  if (window.ScenarioEngine) return window.ScenarioEngine;
  if (_enginePromise) return _enginePromise;
  const path = '/js/engine/scenarioEngine.js'; // canonical path
  _enginePromise = import(path).then(mod => {
    const E = window.ScenarioEngine || mod.ScenarioEngine || mod.default || mod.engine;
    if (!E) throw new Error('Engine module missing exports');
    window.ScenarioEngine = E;
    return E;
  }).catch(err => { console.error('[v2] engine import failed', err); throw err; });
  return _enginePromise;
}

export async function loadScenarioById(id){
  const raw = await fetch(`/data/${id}.v2.json?ts=${Date.now()}`, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.url);
    return r.json();
  });
  const g = ensureGraph(raw);
  if (!g?.startId || !g.nodes?.[g.startId]) {
    console.error('[v2] bad graph after ensureGraph', g);
    g.startId = 'END'; g.nodes = { END: { id:'END', type:'end', text:'— End —' } };
  }

  const E = await getEngine();
  if (typeof E.loadScenario === 'function') E.loadScenario(g);
  if (typeof E.start === 'function') E.start(g.startId);
  else if (typeof E.startAct === 'function') E.startAct(0);
}

export async function init(){
  const pick = document.getElementById('scenarioPicker');
  if (pick && !pick.options.length) {
    try {
      const idx = await fetch('/data/v2-index.json?ts='+Date.now(), { cache:'no-store' }).then(r=>r.json());
      (idx.scenarios || []).forEach(s => {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.title || s.id; pick.appendChild(o);
      });
    } catch(e){ console.warn('[v2] index load failed', e); }
  }
  pick?.addEventListener('change', () => loadScenarioById(pick.value));
  if (pick && pick.value) loadScenarioById(pick.value);
  window.AmorviaV2 = Object.assign(window.AmorviaV2 || {}, { loadScenarioById });
}

init().catch(console.error);
