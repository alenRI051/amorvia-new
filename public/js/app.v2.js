// v2 loader wired to ScenarioEngine (LoadScenario + start)
// -------------------------------------------------------
// - Derives a safe entry from v2 (act1 → start → resolve one goto)
// - Converts to graph if needed via v2ToGraph
// - Ensures we start on a renderable node
// - Works with the <select id="scenarioPicker"> and Restart button

import { v2ToGraph } from '/js/compat/v2-to-graph.js';

// One-shot guard so we never double-boot
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

// Prefer the global drop-in engine (your build exposes this)
const ScenarioEngine = window.ScenarioEngine;

// Dev cache-bust when ?devcache=0 is present
const devBust = location.search.includes('devcache=0') ? `?ts=${Date.now()}` : '';
const noStore = { cache: 'no-store' };

// ----------------------- utils -----------------------
async function getJSON(url) {
  const res = await fetch(url + devBust, noStore);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return await res.json();
}

async function loadIndex() {
  const idx = await getJSON('/data/v2-index.json');
  return Array.isArray(idx) ? idx : (idx.scenarios || []);
}

// Optional v2 list (your UI mainly uses the <select>, this is a no-op unless #scenarioListV2 exists)
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

function toGraphIfNeeded(data) {
  const looksGraph = data && typeof data === 'object' && data.startId && data.nodes && typeof data.nodes === 'object';
  return looksGraph ? data : v2ToGraph(data);
}

// From raw v2, pick act1 (or first act), then start (or first node), and resolve one goto hop
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

// ----------------------- core -----------------------
async function startScenario(id) {
  try {
    if (!ScenarioEngine || typeof ScenarioEngine.LoadScenario !== 'function' || typeof ScenarioEngine.start !== 'function') {
      throw new Error('ScenarioEngine API not ready (expecting LoadScenario + start).');
    }

    // 1) Fetch raw v2 JSON
    const raw = await getJSON(`/data/${id}.v2.json`);

    // 2) Derive a robust entry node from v2
    const entry = deriveEntryFromV2(raw);
    if (!entry.nodeId) throw new Error('Scenario has no entry node.');

    // 3) Convert to graph if needed
    const graph = toGraphIfNeeded(raw);

    // 4) Load into the engine (your engine expects graph shape here)
    ScenarioEngine.LoadScenario(graph);

    // 5) Ensure we start at a renderable node
    if (!graph.startId || !graph.nodes?.[graph.startId]) {
      graph.startId = entry.nodeId;              // fall back to derived entry
    } else {
      const s = graph.nodes[graph.startId];
      if (s?.type?.toLowerCase() === 'goto' && s.to && graph.nodes?.[s.to]) {
        graph.startId = s.to;                    // resolve one goto hop
      }
    }

    // 6) Kick off the scenario
    ScenarioEngine.start(graph.startId);

    // 7) Reflect selection in UI
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

// Restart button (restarts currently selected or last-used)
(function wireRestart() {
  const btn = document.getElementById('restartAct');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const picker = document.getElementById('scenarioPicker');
    const id = picker?.value || recallLast();
    if (id) startScenario(id);
  });
})();

// Init: load index, render picker/list, auto-start first (or last used)
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
