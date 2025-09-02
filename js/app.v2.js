// /js/app.v2.js — canonical engine import, deduped
import { ensureGraph } from '/js/compat/v2-to-graph.js';

let enginePromise = null;
async function getEngine() {
  if (window.ScenarioEngine) return window.ScenarioEngine;
  if (!enginePromise) {
    enginePromise = import('/js/engine/scenarioEngine.js')  // no cache-buster
      .then(mod => {
        const E = window.ScenarioEngine || mod.ScenarioEngine || mod.default || mod.engine;
        if (!E) throw new Error('Engine module missing exports');
        // Pin globally for any other loaders
        if (!window.ScenarioEngine) window.ScenarioEngine = E;
        return E;
      })
      .catch(e => {
        console.error('[v2] Engine load failed', e);
        throw e;
      });
  }
  return enginePromise;
}

export async function loadScenarioById(id) {
  const raw = await fetch(`/data/${id}.v2.json?ts=${Date.now()}`, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.url);
    return r.json();
  });

  const g = ensureGraph(raw);
  if (!g?.startId || !g.nodes || !g.nodes[g.startId]) {
    console.error('[v2] still bad graph after ensureGraph', g);
    // Fabricate a minimal end scene to avoid crashing UI
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
        o.value = s.id; o.textContent = s.title || s.id;
        pick.appendChild(o);
      }
    } catch (e) { console.warn('[v2] index load failed', e); }
  }
  pick?.addEventListener('change', () => loadScenarioById(pick.value));
  if (pick && pick.value) loadScenarioById(pick.value);
  window.AmorviaV2 = Object.assign(window.AmorviaV2 || {}, { loadScenarioById });
}

init().catch(console.error);