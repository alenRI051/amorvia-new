// v2 loader wired to ScenarioEngine with adaptive API detection
// ------------------------------------------------------------------------
import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

// One-shot guard
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

// Prefer global drop-in if present (you had a "[ScenarioEngine] drop-in engine ready" log)
const EngSrc = (window.ScenarioEngine && typeof window.ScenarioEngine === 'object')
  ? window.ScenarioEngine
  : (ImportedEngine.ScenarioEngine || ImportedEngine.default || ImportedEngine);

// Small helper to list function keys on an object (own + proto)
function fnKeys(obj) {
  const out = new Set();
  let cur = obj;
  while (cur && cur !== Object.prototype) {
    for (const k of Object.getOwnPropertyNames(cur)) {
      try { if (typeof obj[k] === 'function') out.add(k); } catch {}
    }
    cur = Object.getPrototypeOf(cur);
  }
  return [...out];
}

// Adaptive method resolver
function resolveEngineAPI(engine) {
  const keys = fnKeys(engine);

  const pick = (candidates) => candidates.find(name => keys.includes(name) && typeof engine[name] === 'function');

  const loadName = pick([
    'loadScenario', 'load', 'init', 'initialize', 'setScenario'
  ]);

  const startName = pick([
    'start', 'begin', 'run', 'goTo', 'goToNode', 'jump'
  ]);

  const setActName = pick([
    'setAct2', 'setAct', 'selectAct', 'chooseAct'
  ]);

  const setNodeName = pick([
    'setNode2', 'setNode', 'selectNode', 'chooseNode'
  ]);

  return { loadName, startName, setActName, setNodeName, keys };
}

const API = resolveEngineAPI(EngSrc);
console.log('[Amorvia] ScenarioEngine methods detected:', API);

// Dev cache-bust when ?devcache=0 is present
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

// Optional v2 list (your UI already uses the <select>, so this is no-op unless #scenarioListV2 exists)
function renderList(list) {
  const container = document.getElementById('scenarioListV2');
  const picker = document.getElementById('scenarioPicker');
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

// v2 → graph (compat)
function toGraphIfNeeded(data) {
  const looksGraph = data && typeof data === 'object' && data.startId && data.nodes && typeof data.nodes === 'object';
  return looksGraph ? data : v2ToGraph(data);
}

// Derive safe entry from v2
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

// --- MAIN: start scenario with adaptive engine calls ---
async function startScenario(id) {
  try {
    const raw = await getJSON(`/data/${id}.v2.json`);

    const entry = deriveEntryFromV2(raw);
    if (!entry.nodeId) throw new Error('Scenario has no entry node.');

    const graph = toGraphIfNeeded(raw);

    // Load
    if (API.loadName) {
      EngSrc[API.loadName](graph);
    } else {
      throw new Error('No load method found on ScenarioEngine. Exposed keys: ' + API.keys.join(', '));
    }

    // Prefer single start(startId) if available & valid
    let usedSingleStart = false;
    if (API.startName) {
      // ensure startId is valid and renderable (resolve one goto)
      if (!graph.startId || !graph.nodes?.[graph.startId]) {
        graph.startId = entry.nodeId;
      } else {
        const s = graph.nodes[graph.startId];
        if (s?.type?.toLowerCase() === 'goto' && s.to && graph.nodes?.[s.to]) {
          graph.startId = s.to;
        }
      }
      EngSrc[API.startName](graph.startId);
      usedSingleStart = true;
    }

    // Otherwise fall back to (setAct, setNode) pairs
    if (!usedSingleStart) {
      if (API.setActName && API.setNodeName) {
        EngSrc[API.setActName](entry.actId);
        EngSrc[API.setNodeName](entry.nodeId);
      } else {
        throw new Error('No start or setAct/setNode methods found on ScenarioEngine. Keys: ' + API.keys.join(', '));
      }
    }

    // Reflect selection
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

// Restart button wiring
(function wireRestart() {
  const btn = document.getElementById('restartAct');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const picker = document.getElementById('scenarioPicker');
    const id = picker?.value || recallLast();
    if (id) startScenario(id);
  });
})();

// Init
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

// Debug
window.AmorviaApp = { startScenario, _api: API, _engineKeys: fnKeys(EngSrc) };
