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

    // 2) Compute robust entry (act1 -> start -> follow one goto hop)
    const act = raw.acts?.find(a => a.id === 'act1') || raw.acts?.[0];
    if (!act || !Array.isArray(act.nodes) || act.nodes.length === 0) {
      throw new Error('Scenario has no nodes in its first act.');
    }
    let node = act.nodes.find(n => n.id === 'start') || act.nodes[0];
    if (node?.type?.toLowerCase() === 'goto' && node.to) {
      const hop = act.nodes.find(n => n.id === node.to);
      if (hop) node = hop;
    }
    const actId = act.id;
    const nodeId = node.id;

    // 3) Try to load via whichever API is available
    //    (some builds expect raw v2; others a graph)
    const looksGraph = raw && raw.startId && raw.nodes && typeof raw.nodes === 'object';
    const graph = looksGraph ? raw : v2ToGraph(raw);

    // Load scenario
    if (typeof ScenarioEngine.loadScenario === 'function') {
      ScenarioEngine.loadScenario(graph);
    } else if (typeof ScenarioEngine.load === 'function') {
      // your earlier console showed this exists
      ScenarioEngine.load(raw);
    } else if (typeof ScenarioEngine.init === 'function') {
      ScenarioEngine.init(graph);
    } else {
      throw new Error('No known ScenarioEngine.load* method found.');
    }

    // Start / set act+node using whatever is available
    if (typeof ScenarioEngine.start === 'function' && graph.startId && graph.nodes?.[graph.startId]) {
      // prefer start() if present
      const s = graph.nodes[graph.startId];
      const startId = (s && s.type?.toLowerCase() === 'goto' && s.to && graph.nodes[s.to]) ? s.to : graph.startId;
      ScenarioEngine.start(startId);
    } else if (typeof ScenarioEngine.setAct2 === 'function' && typeof ScenarioEngine.setNode2 === 'function') {
      // the API you used in console
      ScenarioEngine.setAct2(actId);
      ScenarioEngine.setNode2(nodeId);
    } else if (typeof ScenarioEngine.setAct === 'function' && typeof ScenarioEngine.setNode === 'function') {
      ScenarioEngine.setAct(actId);
      ScenarioEngine.setNode(nodeId);
    } else {
      // last-resort: try a single call that accepts both
      if (typeof ScenarioEngine.goTo === 'function') {
        ScenarioEngine.goTo({ actId, nodeId });
      } else {
        throw new Error('No known ScenarioEngine start/set methods found.');
      }
    }

    // UI reflection
    document.querySelectorAll('#scenarioListV2 .item').forEach(el => {
      const on = el.dataset.id === id;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', String(on));
    });
    const picker = document.getElementById('scenarioPicker');
    if (picker) picker.value = id;

    try { localStorage.setItem('amorvia:lastScenario', id); } catch {}
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
