// /js/app.v2.js — loader sig v2025-09-02+memo
import { ensureGraph } from '/js/compat/v2-to-graph.js';

let _enginePromise; // memoize engine import so it only loads once

async function getEngine() {
  if (window.ScenarioEngine) return window.ScenarioEngine;
  if (_enginePromise) return _enginePromise;

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

  _enginePromise = (async () => {
    let lastErr;
    for (const p of paths) {
      try {
        const m = await import(p + '?v=' + Date.now());
        const E = window.ScenarioEngine || m.ScenarioEngine || m.engine || m.default;
        if (E && (E.loadScenario || E.start || E.startAct)) {
          console.info('[v2] engine loaded from', p);
          // Cache globally for any other modules
          window.ScenarioEngine = E;
          return E;
        }
      } catch (e) {
        lastErr = e;
      }
    }
    console.error('[v2] Engine load failed', lastErr);
    throw new Error('engine missing');
  })();

  return _enginePromise;
}

export async function loadScenarioById(id) {
  const raw = await fetch(`/data/${id}.v2.json?ts=${Date.now()}`, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.url);
    return r.json();
  });
  const g = ensureGraph(raw);
  if (!g.nodes || !g.startId || !g.nodes[g.startId]) {
    console.error('[v2] still bad graph after ensureGraph', g);
    // Fallback end node so UI never crashes
    g.startId = 'END';
    g.nodes = { END: { id: 'END', type: 'end', text: '— End —' } };
  }

  const E = await getEngine();
  if (typeof E.loadScenario === 'function') E.loadScenario(g);
  if (typeof E.start === 'function') E.start(g.startId);
  else if (typeof E.startAct === 'function') E.startAct(0);
}

export async function init() {
  const pick = document.getElementById('scenarioPicker');
  if (pick && !pick.options.length) {
    try {
      const idx = await fetch('/data/v2-index.json?ts=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
      const list = Array.isArray(idx?.scenarios) ? idx.scenarios : [];
      for (const s of list) {
        const o = document.createElement('option');
        o.value = s.id;
        o.textContent = s.title || s.id;
        pick.appendChild(o);
      }
    } catch (e) {
      console.warn('[v2] index load failed', e);
    }
  }
  pick?.addEventListener('change', () => loadScenarioById(pick.value));
  if (pick && pick.value) loadScenarioById(pick.value);
  window.AmorviaV2 = Object.assign(window.AmorviaV2 || {}, { loadScenarioById });
}

init().catch(console.error);
