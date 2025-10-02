// v2 loader wired to ScenarioEngine (module-first, global fallback)
// ---------------------------------------------------------------
// - Resolves engine from import OR window.ScenarioEngine (no race/poll)
// - Derives a safe entry from v2 (act1 → start → resolve one goto)
// - Converts to graph if needed via v2ToGraph
// - Starts on a renderable node
// - Works with <select id="scenarioPicker"> and Restart button

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

// One-shot guard
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

/* ----------------------- resolve engine once ----------------------- */
const Engine =
  // prefer explicit export if present
  (ImportedEngine && (ImportedEngine.ScenarioEngine || ImportedEngine.default)) ||
  // else the whole module might be the engine
  ImportedEngine ||
  // as last resort use the global (drop-in)
  window.ScenarioEngine;

if (!Engine) {
  console.error('[Amorvia] ScenarioEngine module/global not found.');
}

// verify method names (your build uses LoadScenario + start)
const hasLoadScenario = typeof Engine?.LoadScenario === 'function';
const hasStart = typeof Engine?.start === 'function';
console.log('[Amorvia] Engine resolved:', {
  via: Engine === window.ScenarioEngine ? 'global' : 'module',
  hasLoadScenario,
  hasStart,
  keys: Engine ? Object.keys(Engine) : []
});

/* ----------------------- fetch helpers ----------------------- */
const devBust = location.search.includes('devcache=0') ? `?ts=${Date.now()}` : '';
const noStore = { cache: 'no-store' };

async function getJSON(url) {
  const res = await fetch(url + devBust, noStore);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return await res.json();
}

async function loadIndex() {
  const idx = await getJSON('/data/v2-index.json');
  return Array.isArray(idx) ? idx : (idx.scenarios || []);
}

/* ----------------------- UI wiring ----------------------- */
function renderList(list) {
  const container = document.getElementById('scenarioListV2'); // optional
  const picker = document.getElementById('scenarioPicker');    // primary
  if (picker) picker.innerHTML = '';
  if (container) container.innerHTML = '';

  list.forEach((item, i) => {
    const id = item.id || item;
    const title = item.title || item.id || String(item);

    if (picker) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = title;
      if (i === 0) opt.selected = true;
      picker.appendChild(opt);
    }

    if (container) {
      const el = document.createElement('div');
      el.className = 'item text-white';
      el.textContent = title;
      el.dataset.id = id;
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', 'false');
      el.tabIndex = 0;
      el.addEventListener('click', () => startScenario(id));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startScenario(id); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); el.nextElementSibling?.focus?.(); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); el.previousElementSibling?.focus?.(); }
      });
      container.appendChild(el);
    }
  });

  if (picker) picker.addEventListener('change', () => startScenario(picker.value));
}

/* ----------------------- format helpers ----------------------- */
function toGraphIfNeeded(data) {
  const looksGraph = data && typeof data === 'object' && data.startId && data.nodes && typeof data.nodes === 'object';
  return looksGraph ? data : v2ToGraph(data);
}

function deriveEntryFromV2(raw) {
  const act = raw?.acts?.find(a => a.id === 'act1') || raw?.acts?.[0];
  if (!act || !Array.isArray(act.nodes) || act.nodes.length === 0) return { actId: null, nodeId: null };

  let node = act.nodes.find(n => n.id === 'start') || act.nodes[0];
  if (node?.type?.toLowerCase() === 'goto' && node.to) {
    const hop = act.nodes.find(n => n.id === node.to);
    if (hop) node = hop;
  }
  return { actId: act.id || null, nodeId: node?.id || null };
}

function rememberLast(id) { try { localStorage.setItem('amorvia:lastScenario', id); } catch {} }
function recallLast() { try { return localStorage.getItem('amorvia:lastScenario'); } catch { return null; } }

/* ----------------------- core start ----------------------- */
async function startScenario(id) {
  try {
    if (!hasLoadScenario || !hasStart) {
      throw new Error('ScenarioEngine API not ready (need LoadScenario + start). Keys: ' + (Engine ? Object.keys(Engine) : []));
    }

    const raw = await getJSON(`/data/${id}.v2.json`);

    const entry = deriveEntryFromV2(raw);
    if (!entry.nodeId) throw new Error('Scenario has no entry node.');

    const graph = toGraphIfNeeded(raw);

    // Load (your engine expects graph shape here)
    Engine.LoadScenario(graph);

    // Choose a safe startId (resolve one goto hop)
    let startId = graph.startId;
    if (!startId || !graph.nodes?.[startId]) {
      startId = entry.nodeId;
    } else {
      const s = graph.nodes[startId];
      if (s?.type?.toLowerCase() === 'goto' && s.to && graph.nodes?.[s.to]) {
        startId = s.to;
      }
    }

    // Start
    Engine.start(startId);
    console.log('[Amorvia] started at', startId, graph.nodes?.[startId]);

    // Reflect in UI
    document.querySelectorAll('#scenarioListV2 .item').forEach(el => {
      const on = el.dataset.id === id;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', String(on));
    });
    const picker = document.getElementById('scenarioPicker');
    if (picker) picker.value = id;

    rememberLast(id);
  } catch (e) {
    console.error('[Amorvia] Failed to start scenario', id, e);
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.textContent = `Failed to load scenario ${id}: ${e.message}`;
  }
}

/* ----------------------- restart button ----------------------- */
(function wireRestart() {
  const btn = document.getElementById('restartAct');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const picker = document.getElementById('scenarioPicker');
    const id = picker?.value || recallLast();
    if (id) startScenario(id);
  });
})();

/* ----------------------- init ----------------------- */
(async function init() {
  try {
    const scenarios = await loadIndex();
    renderList(scenarios);
    const last = recallLast();
    const first = (scenarios[0] && (scenarios[0].id || scenarios[0])) || null;
    const initial = last || first;
    if (initial) await startScenario(initial);
  } catch (e) {
    console.error('[Amorvia] init error', e);
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.textContent = `Init error: ${e.message}`;
  }
})();

// Debug helper
window.AmorviaApp = { startScenario };
