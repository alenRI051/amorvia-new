// /js/app.v2.js — loader sig v2025-09-02
import { ensureGraph } from '/js/compat/v2-to-graph.js';

async function getEngine() {
  if (window.ScenarioEngine) return window.ScenarioEngine;
  const paths = [
    '/js/engine/scenarioEngine.js',
    '/js/engine/scenario-engine.js',
    '/js/engine/ScenarioEngine.js',
    '/js/scenarioEngine.js',
    '/js/ScenarioEngine.js',
    '/engine/scenarioEngine.js',
    '/engine/ScenarioEngine.js',
    '/scenarioEngine.js'
  ];
  let lastErr;
  for (const p of paths) {
    try {
      const m = await import(p + '?v=' + Date.now());
      const E = window.ScenarioEngine || m.ScenarioEngine || m.engine || m.default;
      if (E && (E.loadScenario || E.start || E.startAct)) {
        console.info('[v2] engine loaded from', p);
        window.ScenarioEngine = E;
        return E;
      }
    } catch (e) { lastErr = e; }
  }
  console.error('[v2] Engine load failed:', lastErr);
  throw new Error('engine missing');
}

export async function loadScenarioById(id) {
  const raw = await fetch(`/data/${id}.v2.json?ts=${Date.now()}`, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.url);
    return r.json();
  });
  const g = ensureGraph(raw);
  if (!g.nodes || !g.startId || !g.nodes[g.startId]) {
    console.error('[v2] still bad graph after ensureGraph', g);
    g.startId = 'END';
    g.nodes = { END: { id: 'END', type: 'end', text: '— End —' } };
  }

  const E = await getEngine();
  if (E.loadScenario) E.loadScenario(g);
  if (E.start) E.start(g.startId);
  else if (E.startAct) E.startAct(0);
}

export async function init() {
  const pick = document.getElementById('scenarioPicker');
  if (pick && !pick.options.length) {
    try {
      const idx = await fetch('/data/v2-index.json?ts=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
      (idx.scenarios || []).forEach(s => {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.title || s.id; pick.appendChild(o);
      });
    } catch (e) { console.warn('[v2] index load failed', e); }
  }
  pick?.addEventListener('change', () => loadScenarioById(pick.value));
  if (pick && pick.value) loadScenarioById(pick.value);
  window.AmorviaV2 = Object.assign(window.AmorviaV2 || {}, { loadScenarioById });
}

init().catch(console.error);
