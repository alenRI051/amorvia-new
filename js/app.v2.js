// v2 loader wired to ScenarioEngine + v2ToGraph (with ARIA & keyboard nav)
// ------------------------------------------------------------------------

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import { ScenarioEngine } from '/js/engine/scenarioEngine.js';

// --- one-shot bootstrap guard (defensive) ---
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

// Dev cache-bust helper: append ?ts=... when URL has ?devcache=0
const devBust = location.search.includes('devcache=0') ? `?ts=${Date.now()}` : '';
const noStore = { cache: 'no-store' };

async function getJSON(url) {
  const res = await fetch(url + devBust, noStore);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return await res.json();
}

// Load index (accepts either array or {scenarios:[...]})
async function loadIndex() {
  const idx = await getJSON('/data/v2-index.json');
  return Array.isArray(idx) ? idx : (idx.scenarios || []);
}

// Optional list for v2 (if you add <div id="scenarioListV2"> later)
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

// v2 → graph helper (keeps compatibility)
function toGraphIfNeeded(data) {
  const looksGraph = data && typeof data === 'object' && data.startId && data.nodes && typeof data.nodes === 'object';
  return looksGraph ? data : v2ToGraph(data);
}

// Derive a safe entry node from v2 JSON (act1 → start → resolve one goto hop)
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

// Keep last selection for convenience
function rememberLast(id) { try { localStorage.setItem('amorvia:lastScenario', id); } catch {} }
function recallLast() { try { return localStorage.getItem('amorvia:lastScenario'); } catch { return null; } }

async function startScenario(id) {
  try {
    // 1) Fetch raw v2 JSON
    const raw = await getJSON(`/data/${id}.v2.json`);

    // 2) Compute a robust entry point from v2
    const entry = deriveEntryFromV2(raw);

    // 3) Convert to graph (if needed)
    const graph = toGraphIfNeeded(raw);

    // 4) Ensure graph.startId exists & points to a real node
    if (!graph.startId || !graph.nodes?.[graph.startId]) {
      graph.startId = entry.nodeId || Object.keys(graph.nodes || {})[0];
    }

    // 5) If startId is a goto, hop once to land on a renderable node
    const sNode = graph.nodes?.[graph.startId];
    if (sNode && sNode.type?.toLowerCase() === 'goto' && sNode.to && graph.nodes?.[sNode.to]) {
      graph.startId = sNode.to;
    }

    // 6) Load & start the engine
    ScenarioEngine.loadScenario(graph);
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

// Wire Restart button (restarts the currently selected scenario)
(function wireRestart() {
  const btn = document.getElementById('restartAct');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const picker = document.getElementById('scenarioPicker');
    const id = picker?.value || recallLast();
    if (id) startScenario(id);
  });
})();

// Init: load index, render list/picker, auto-start first (or last used)
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

// Expose a tiny API for debugging
window.AmorviaApp = { startScenario };
