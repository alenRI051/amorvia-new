// v2 loader wired to ScenarioEngine (supports loadScenario OR LoadScenario + start)
// -------------------------------------------------------------------------------
// - Waits until engine exposes { loadScenario|LoadScenario, start }
// - Derives a safe entry from v2 (act1 → start → resolve one goto hop)
// - Converts to graph if needed via v2ToGraph
// - Starts on a renderable node
// - Works with <select id="scenarioPicker"> and the Restart button

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

// One-shot guard
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

/* ----------------------- resolve engine ----------------------- */
function resolveEngineObject() {
  // Prefer explicit export if present, else module, else global
  return (
    ImportedEngine?.ScenarioEngine ||
    ImportedEngine?.default ||
    ImportedEngine ||
    window.ScenarioEngine
  );
}

// Poll until engine exposes the methods we need
function waitForEngine() {
  return new Promise((resolve) => {
    const check = () => {
      const Eng = resolveEngineObject();
      const loadFn = Eng?.loadScenario || Eng?.LoadScenario;
      const startFn = Eng?.start;
      if (Eng && typeof loadFn === 'function' && typeof startFn === 'function') {
        resolve({ Eng, loadFn, startFn });
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

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
// Build a { id: node } map from whatever shape we get.
function extractNodesMap({ raw, graph }) {
  // Case A: graph.nodes is an object
  if (graph && graph.nodes && typeof graph.nodes === 'object' && !Array.isArray(graph.nodes)) {
    return graph.nodes;
  }
  // Case B: graph.nodes is an array
  if (graph && Array.isArray(graph.nodes)) {
    const map = {};
    for (const n of graph.nodes) if (n?.id) map[n.id] = n;
    if (Object.keys(map).length) return map;
  }
  // Case C: raw v2 -> acts[0].nodes is an array
  if (raw?.acts?.length && Array.isArray(raw.acts[0].nodes)) {
    const map = {};
    for (const n of raw.acts[0].nodes) if (n?.id) map[n.id] = n;
    if (Object.keys(map).length) return map;
  }
  // Case D: raw.nodes as object or array
  if (raw?.nodes) {
    if (Array.isArray(raw.nodes)) {
      const map = {};
      for (const n of raw.nodes) if (n?.id) map[n.id] = n;
      if (Object.keys(map).length) return map;
    }
    if (typeof raw.nodes === 'object') return raw.nodes;
  }
  // Give the caller an empty map instead of throwing; we’ll log and bail gracefully.
  return {};
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
    const { Eng, loadFn, startFn } = await waitForEngine();
    const raw = await getJSON(`/data/${id}.v2.json`);
    const entry = deriveEntryFromV2(raw);
    if (!entry.nodeId) throw new Error('Scenario has no entry node.');

    // Try RAW first; fallback to GRAPH if engine rejects it.
    let loadedVia = 'v2';
    let graph = null;
    try {
      loadFn.call(Eng, raw);
    } catch (e) {
      console.warn('[Amorvia] load v2 failed, retrying with graph:', e?.message || e);
      graph = toGraphIfNeeded(raw);
      loadFn.call(Eng, graph);
      loadedVia = 'graph';
    }
    if (!graph) graph = toGraphIfNeeded(raw);

    // Ensure Eng.state exists
    if (!Eng.state) Eng.state = {};

    // --- FORCE-HYDRATE nodes map from any supported shape ---
    let nodesMap = Eng.state.nodes;
    if (!nodesMap || !Object.keys(nodesMap).length) {
      nodesMap = extractNodesMap({ raw, graph });
      if (Object.keys(nodesMap).length) {
        Eng.state.nodes = nodesMap;
      } else {
        console.error('[Amorvia] could not build nodes map. Shapes:', {
          hasGraphNodesObj: !!(graph?.nodes && typeof graph.nodes === 'object' && !Array.isArray(graph.nodes)),
          hasGraphNodesArr: Array.isArray(graph?.nodes),
          hasRawAct0NodesArr: Array.isArray(raw?.acts?.[0]?.nodes),
          hasRawNodesObj: !!(raw?.nodes && typeof raw.nodes === 'object' && !Array.isArray(raw.nodes)),
          hasRawNodesArr: Array.isArray(raw?.nodes)
        });
        throw new Error('Engine has no nodes after load; unable to extract nodes map.');
      }
    }

    // --- Pick a safe start id that actually exists in nodes map ---
    const nodeKeys = Object.keys(Eng.state.nodes);
    let startId = entry.nodeId;

    // if entry not present, try graph.startId, resolve goto once
    if (!Eng.state.nodes[startId]) {
      startId = graph.startId || startId || nodeKeys[0];
      const s = Eng.state.nodes[startId];
      if (s?.type?.toLowerCase() === 'goto' && s.to && Eng.state.nodes[s.to]) {
        startId = s.to;
      }
      if (!Eng.state.nodes[startId]) startId = nodeKeys[0];
    }

    // Set engine pointer then start
    Eng.state.currentId = startId;
    startFn.call(Eng, startId);

    // Debug: log the actual active node via method()
    const cur = (typeof Eng.currentNode === 'function')
      ? Eng.currentNode()
      : Eng.state.nodes[Eng.state.currentId];

    console.log('[Amorvia] started (via:', loadedVia + ') at', startId, cur);
    console.log('[Amorvia] node keys:', nodeKeys.slice(0, 10), nodeKeys.length > 10 ? `(+${nodeKeys.length-10} more)` : '');

    // --- Minimal fallback render if engine didn’t draw ---
    if (!cur || (!cur.text && cur.type?.toLowerCase() !== 'choice')) {
      const dialog = document.getElementById('dialog');
      const choices = document.getElementById('choices');
      if (dialog) dialog.textContent = cur?.text || '(…)';
      if (choices) {
        choices.innerHTML = '';
        if (Array.isArray(cur?.choices)) {
          cur.choices.forEach(ch => {
            const b = document.createElement('button');
            b.className = 'button';
            b.textContent = ch.label || ch.id || '…';
            b.addEventListener('click', () => {
              const to = ch.to || ch.goto || ch.next;
              if (to && Eng.state.nodes[to]) {
                Eng.state.currentId = to;
                if (typeof Eng.goto === 'function') Eng.goto(to);
                const nn = (typeof Eng.currentNode === 'function')
                  ? Eng.currentNode()
                  : Eng.state.nodes[to];
                if (dialog) dialog.textContent = nn?.text || '';
              }
            });
            choices.appendChild(b);
          });
        }
      }
    }

    // Reflect selection in UI
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
