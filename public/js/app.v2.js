// v2 loader wired to ScenarioEngine (supports loadScenario OR LoadScenario + start)
// -------------------------------------------------------------------------------
// - Waits until engine exposes { loadScenario|LoadScenario, start }
// - Loads raw v2 first, falls back to graph if needed
// - Hydrates engine.state.nodes from *any* shape (graph array/object, raw acts[*].nodes, raw.nodes, or acts[*].steps)
// - Starts on a safe node (resolves one goto hop; avoids starting on "End of Act")
// - Adds meter-hint injection to choice labels (full names: Trust, Tension, Child Stress)

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

// One-shot guard
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

/* ----------------------- Reset support (?reset=1 or #reset) ----------------------- */
(() => {
  const url = new URL(window.location.href);
  const shouldReset = url.searchParams.get('reset') === '1' || url.hash.includes('reset');
  if (!shouldReset) return;

  console.log('[Amorvia] Reset flag detected — clearing saved progress');
  try {
    Object.keys(localStorage)
      .filter(k =>
        k.startsWith('amorvia:state:') ||
        k === 'amorvia:lastScenario' ||
        k === 'amorvia:mode'
      )
      .forEach(k => localStorage.removeItem(k));
  } catch {}
  try { sessionStorage.clear(); } catch {}

  const clean = window.location.origin + window.location.pathname;
  window.history.replaceState({}, '', clean);
  window.location.reload();
})();

/* ----------------------- resolve engine ----------------------- */
function resolveEngineObject() {
  return (
    ImportedEngine?.ScenarioEngine ||
    ImportedEngine?.default ||
    ImportedEngine ||
    window.ScenarioEngine
  );
}

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

/* ----------------------- small utils ----------------------- */
const asArray = (v) =>
  Array.isArray(v) ? v
  : (v && typeof v === 'object') ? Object.values(v)
  : [];

const isEndLike = (nOrText) => {
  if (!nOrText) return false;
  const idTxt = typeof nOrText === 'string' ? nOrText : String(nOrText.id || '');
  const txt = typeof nOrText === 'string' ? '' : String(nOrText.text || '');
  const typ = typeof nOrText === 'string' ? '' : String(nOrText.type || '');
  const idL = idTxt.toLowerCase();
  const tL = txt.toLowerCase();
  const tyL = typ.toLowerCase();
  return tyL === 'end' || idL.includes('end') || tL.startsWith('end of ') || tL === 'end';
};

/* ----------------------- raw-v2 indexing + fallback rendering ----------------------- */
function indexSteps(raw) {
  const map = {};
  for (const act of asArray(raw?.acts)) {
    for (const s of asArray(act?.steps)) {
      if (s?.id) map[s.id] = s;
    }
  }
  return map;
}

function renderRawStep(stepId, raw, Eng) {
  if (!stepId) return false;
  const steps = (Eng.__rawStepsIndex ||= indexSteps(raw));
  const step = steps[stepId];
  const dialog = document.getElementById('dialog');
  const choices = document.getElementById('choices');

  if (!step || !dialog || !choices) return false;

  dialog.textContent = step.text || '';

  choices.innerHTML = '';
  for (const ch of asArray(step.choices)) {
    const b = document.createElement('button');
    b.className = 'button';
    b.textContent = ch?.label || ch?.id || '…';
    b.addEventListener('click', () => {
      const to = ch?.to || ch?.goto || ch?.next;
      if (!to) return;
      if (Eng?.state) Eng.state.currentId = to;
      if (typeof Eng?.goto === 'function') Eng.goto(to);
      renderRawStep(to, raw, Eng);
    });
    choices.appendChild(b);
  }

  setTimeout(() => scheduleDecorate(Eng), 0);
  return true;
}

/* ----------------------- derive a playable entry ----------------------- */
function firstPlayableInAct(act) {
  const steps = asArray(act?.steps);
  if (steps.length) {
    const startId = act.start || steps[0]?.id;
    const startStep = steps.find(s => s?.id === startId);
    if (startStep && !isEndLike(startStep)) return startStep.id;

    const playable = steps.find(s => s && !isEndLike(s));
    if (playable?.id) return playable.id;

    return steps[0]?.id || null;
  }

  // legacy nodes in act
  const nodes = asArray(act?.nodes);
  if (nodes.length) {
    let node = nodes.find(n => n?.id === 'start') || nodes[0];
    if (node?.type?.toLowerCase() === 'goto' && node.to) {
      const hop = nodes.find(n => n?.id === node.to);
      if (hop) node = hop;
    }
    return node?.id || null;
  }
  return null;
}

function deriveEntryFromV2(raw) {
  if (!raw || !asArray(raw.acts).length) return { actId: null, nodeId: null };

  const acts = asArray(raw.acts);
  const act =
    acts.find(a => a?.id === raw.startAct) ||
    acts.find(a => a?.id === 'act1') ||
    acts[0];

  if (!act) return { actId: null, nodeId: null };

  const nodeId = firstPlayableInAct(act);
  if (nodeId) return { actId: act.id || null, nodeId };

  // rare: root nodes
  const rootNodes = asArray(raw.nodes);
  if (rootNodes.length) {
    let node = rootNodes.find(n => n?.id === 'start') || rootNodes[0];
    if (node?.type?.toLowerCase() === 'goto' && node.to) {
      const hop = rootNodes.find(n => n?.id === node.to);
      if (hop) node = hop;
    }
    return { actId: act.id || null, nodeId: node?.id || null };
  }

  return { actId: null, nodeId: null };
}

/* ----------------------- extract nodes map (graph, nodes, steps) ----------------------- */
function extractNodesMap({ raw, graph }) {
  let map = {};

  // graph.nodes
  if (graph?.nodes) {
    if (Array.isArray(graph.nodes)) {
      for (const n of graph.nodes) if (n?.id) map[n.id] = n;
    } else if (typeof graph.nodes === 'object') {
      map = { ...graph.nodes };
    }
  }

  // raw.acts[*].nodes (legacy)
  if (!Object.keys(map).length) {
    for (const act of asArray(raw?.acts)) {
      for (const n of asArray(act?.nodes)) if (n?.id) map[n.id] = n;
    }
  }

  // raw.acts[*].steps (modern) → synthesize nodes
  if (!Object.keys(map).length) {
    for (const act of asArray(raw?.acts)) {
      for (const s of asArray(act?.steps)) {
        if (!s?.id) continue;
        map[s.id] = {
          id: s.id,
          type: 'line',
          text: s.text ?? '',
          choices: asArray(s.choices).map((ch, i) => ({
            id: ch?.id ?? `${s.id}:choice:${i}`,
            label: ch?.label ?? ch?.text ?? ch?.id ?? '…',
            to: ch?.to ?? ch?.goto ?? ch?.next ?? null,
            // keep original shapes for hinting
            effects: ch?.effects ?? ch?.meters ?? ch?.effect ?? null,
            meters: ch?.meters ?? null,
          })),
        };
      }
    }
  }

  // raw.nodes (rare)
  if (!Object.keys(map).length && raw?.nodes) {
    if (Array.isArray(raw.nodes)) {
      for (const n of raw.nodes) if (n?.id) map[n.id] = n;
    } else if (typeof raw.nodes === 'object') {
      map = { ...raw.nodes };
    }
  }

  return map;
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

/* ----------------------- graph helpers ----------------------- */
function toGraphIfNeeded(data) {
  const looksGraph = data && typeof data === 'object' && data.startId && data.nodes;
  return looksGraph ? data : v2ToGraph(data);
}

/* Force-start helper: inject a synthetic entry node that goto’s our target */
function injectGraphEntryNode(graph, entryId) {
  if (!graph || !entryId) return graph;
  const ENTRY_ID = '__amorvia_entry__';
  const makeNode = (to) => ({ id: ENTRY_ID, type: 'goto', to });

  if (Array.isArray(graph.nodes)) {
    const exists = graph.nodes.some(n => n?.id === ENTRY_ID);
    if (!exists) graph.nodes.unshift(makeNode(entryId));
  } else if (graph.nodes && typeof graph.nodes === 'object') {
    if (!graph.nodes[ENTRY_ID]) graph.nodes[ENTRY_ID] = makeNode(entryId);
  } else {
    graph.nodes = [ makeNode(entryId) ];
  }

  graph.startId = ENTRY_ID;
  return graph;
}

/* ----------------------- meter hint helpers ----------------------- */
const METER_LABELS = { trust: 'Trust', tension: 'Tension', childStress: 'Child Stress' };

function getChoiceDeltas(choice) {
  const totals = { trust: 0, tension: 0, childStress: 0 };
  const add = (k, v) => {
    const key = String(k || '').trim();
    if (!key) return;
    const norm = key in totals ? key : (key.toLowerCase() === 'childstress' ? 'childStress' : key.toLowerCase());
    if (norm in totals) {
      const n = Number(v);
      if (!Number.isNaN(n) && n !== 0) totals[norm] += n;
    }
  };
  if (choice && typeof choice.meters === 'object') {
    for (const [k, v] of Object.entries(choice.meters)) add(k, v);
  }
  if (Array.isArray(choice?.effects)) {
    for (const e of choice.effects) add(e.meter ?? e.key, e.delta ?? e.amount ?? e.value);
  }
  if (choice?.meter || choice?.key) add(choice.meter ?? choice.key, choice.delta ?? choice.amount ?? choice.value);
  return totals;
}

function formatHint(totals) {
  const parts = [];
  for (const k of Object.keys(METER_LABELS)) {
    const v = totals[k];
    if (!v) continue;
    const sign = v > 0 ? '+';
    parts.push(`${sign ?? ''}${v} ${METER_LABELS[k]}`);
  }
  return parts.length ? ` (${parts.join(', ')})` : '';
}

function decorateVisibleChoices(Eng) {
  try {
    const container = document.getElementById('choices');
    if (!container) return;

    const node = (typeof Eng.currentNode === 'function')
      ? Eng.currentNode()
      : Eng.state?.nodes?.[Eng.state?.currentId];

    if (!node || !Array.isArray(node.choices) || !node.choices.length) return;

    const buttons = Array.from(container.querySelectorAll('button, [role="button"]'));
    if (!buttons.length) return;

    node.choices.forEach((ch, idx) => {
      const btn = buttons[idx];
      if (!btn || btn.dataset.hinted === '1') return;
      const base = ch.label ?? btn.textContent ?? '';
      const hint = formatHint(getChoiceDeltas(ch));
      const newText = hint ? `${base}${hint}` : base;
      btn.textContent = newText;
      btn.dataset.hinted = '1';
      btn.title = newText;
    });
  } catch (err) {
    console.warn('[Amorvia] decorateVisibleChoices failed:', err);
  }
}

function scheduleDecorate(Eng) {
  setTimeout(() => decorateVisibleChoices(Eng), 0);
  setTimeout(() => decorateVisibleChoices(Eng), 50);
}

/* ----------------------- persistence helpers ----------------------- */
function rememberLast(id) { try { localStorage.setItem('amorvia:lastScenario', id); } catch {} }
function recallLast() { try { return localStorage.getItem('amorvia:lastScenario'); } catch { return null; } }

/* ----------------------- core start ----------------------- */
async function startScenario(id) {
  try {
    const { Eng, loadFn, startFn } = await waitForEngine();

    // Monkey-patch goto() once so every navigation re-decorates.
    if (!Eng.__gotoDecorated && typeof Eng.goto === 'function') {
      const _goto = Eng.goto.bind(Eng);
      Eng.goto = (to) => { const r = _goto(to); scheduleDecorate(Eng); return r; };
      Eng.__gotoDecorated = true;
    }

    // Fetch + compute robust entry
    const raw = await getJSON(`/data/${id}.v2.json`);
    const entry = deriveEntryFromV2(raw);
    if (!entry.nodeId) throw new Error('Scenario has no entry node.');

    // Try raw v2 first; fallback to graph if rejected
    let loadedVia = 'v2';
    let graph = null;
    try {
      loadFn.call(Eng, raw);
    } catch (e) {
      console.warn('[Amorvia] load v2 failed, retrying with graph:', e?.message || e);
      graph = toGraphIfNeeded(raw);

      // Hard enforce starting node by injecting a synthetic entry
      injectGraphEntryNode(graph, entry.nodeId);

      loadFn.call(Eng, graph);
      loadedVia = 'graph';
    }
    if (!graph) graph = toGraphIfNeeded(raw);

    // Ensure state and nodes map (hydrate ourselves if engine didn't)
    if (!Eng.state) Eng.state = {};
    let nodesMap = Eng.state.nodes;
    if (!nodesMap || !Object.keys(nodesMap).length) {
      nodesMap = extractNodesMap({ raw, graph });
      if (Object.keys(nodesMap).length) {
        Eng.state.nodes = nodesMap;
      } else {
        console.error('[Amorvia] could not build nodes map. Shapes:', {
          graph_nodes_obj: !!(graph?.nodes && typeof graph.nodes === 'object' && !Array.isArray(graph.nodes)),
          graph_nodes_arr: Array.isArray(graph?.nodes),
          raw_acts: Array.isArray(raw?.acts) ? raw.acts.length : 0,
          raw_nodes_obj: !!(raw?.nodes && typeof raw.nodes === 'object' && !Array.isArray(raw.nodes)),
          raw_nodes_arr: Array.isArray(raw?.nodes)
        });
        throw new Error('Engine has no nodes after load; unable to extract nodes map.');
      }
    }

    // Choose a safe start id in our nodes map
    const nodeKeys = Object.keys(Eng.state.nodes);
    let startId = entry.nodeId;
    if (!Eng.state.nodes[startId]) {
      startId = (graph.startId || startId || nodeKeys[0]);
      let s = Eng.state.nodes[startId];
      if (s?.type?.toLowerCase() === 'goto' && s.to && Eng.state.nodes[s.to]) {
        startId = s.to;
      }
      if (!Eng.state.nodes[startId]) startId = nodeKeys[0];
    }

    // Pre-start: avoid End-of-Act
    const curNodeCand = Eng.state.nodes[startId];
    if (isEndLike(curNodeCand)) {
      // try again using the act we derived from
      const acts = asArray(raw?.acts);
      const act =
        acts.find(a => a?.id === raw.startAct) ||
        acts.find(a => a?.id === 'act1') ||
        acts[0];
      const playable = firstPlayableInAct(act);
      if (playable && Eng.state.nodes[playable]) startId = playable;
    }

    // Set engine pointer then start
    Eng.state.currentId = startId;
    if (Eng.state.graph && typeof Eng.state.graph === 'object') {
      Eng.state.graph.startId = startId;
    }
    if ('startId' in Eng.state) Eng.state.startId = startId;

    startFn.call(Eng, startId);

    // If engine still didn't render, force-hop to target and render raw.
    const forceTo = (targetId) => {
      if (!targetId) return;
      if (Eng.state?.nodes?.[targetId]) {
        Eng.state.currentId = targetId;
        if (typeof Eng.goto === 'function') Eng.goto(targetId);
        // If UI still blank, render from raw
        const dialogEl = document.getElementById('dialog');
        const cur = (typeof Eng.currentNode === 'function') ? Eng.currentNode() : Eng.state.nodes[targetId];
        const missingText = !cur || !cur.text;
        if (missingText && dialogEl) {
          const did = renderRawStep(targetId, raw, Eng);
          if (!did) dialogEl.textContent = cur?.text || '(…)';
        }
        scheduleDecorate(Eng);
      }
    };

    // If we booted via the synthetic entry, jump to real step immediately
    if (graph?.startId === '__amorvia_entry__') {
      forceTo(entry.nodeId);
    }

    // Post-start safety: if still at an end node, jump to playable
    {
      const currentAfterStart = (typeof Eng.currentNode === 'function')
        ? Eng.currentNode()
        : Eng.state?.nodes?.[Eng.state?.currentId];
      if (isEndLike(currentAfterStart)) {
        const acts = asArray(raw?.acts);
        const act =
          acts.find(a => a?.id === raw.startAct) ||
          acts.find(a => a?.id === 'act1') ||
          acts[0];
        const playable = firstPlayableInAct(act);
        if (playable) forceTo(playable);
      } else {
        // If not end-like but text missing, force-render from raw anyway
        const curId = Eng.state?.currentId;
        const cur = (typeof Eng.currentNode === 'function') ? Eng.currentNode() : Eng.state?.nodes?.[curId];
        if (!cur || !cur.text) forceTo(curId);
      }
    }

    // Debug
    const cur = (typeof Eng.currentNode === 'function')
      ? Eng.currentNode()
      : Eng.state.nodes[Eng.state.currentId];
    console.log('[Amorvia] started (via:', loadedVia + ') at', Eng.state.currentId, cur);

    // Reflect selection in UI
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

