// v2 loader wired to ScenarioEngine (supports loadScenario OR LoadScenario + start)
// -------------------------------------------------------------------------------
// - Waits until engine exposes { loadScenario|LoadScenario, start }
// - Loads raw v2 first, falls back to graph if needed
// - Hydrates engine.state.nodes from *any* shape (graph array/object, raw acts[*].nodes, raw.nodes, or acts[*].steps)
// - Starts on a safe node (resolves one goto hop; avoids starting on "End of Act")
// - Adds meter-hint injection to choice labels (full names: Trust, Tension, Child Stress)
// - Guarantees cross-act navigation (Act1 → Act2/3/…) by synthesizing nodes from raw steps when missing

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

/* -----------------------------------------------------------------------------
  One-shot guard
----------------------------------------------------------------------------- */
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

/* -----------------------------------------------------------------------------
  Reset support (?reset=1 or #reset)
----------------------------------------------------------------------------- */
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
      ).forEach(k => localStorage.removeItem(k));
  } catch {}
  try { sessionStorage.clear(); } catch {}

  const clean = window.location.origin + window.location.pathname;
  window.history.replaceState({}, '', clean);
  window.location.reload();
})();

/* -----------------------------------------------------------------------------
  Engine resolution
----------------------------------------------------------------------------- */
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

/* -----------------------------------------------------------------------------
  Fetch helpers
----------------------------------------------------------------------------- */
const devBust = location.search.includes('devcache=0') ? `?ts=${Date.now()}` : '';
const noStore = { cache: 'no-store' };

async function getJSON(url) {
  const full = url.startsWith('/') ? url : `/${url}`;
  const res = await fetch(full + devBust, noStore);
  if (!res.ok) throw new Error(`${full} ${res.status}`);
  return await res.json();
}

// v2-index cache
let SCENARIOS = [];
let SCENARIO_BY_ID = Object.create(null);

async function loadIndex() {
  const idx = await getJSON('/data/v2-index.json');
  const list = Array.isArray(idx) ? idx : (idx.scenarios || []);
  SCENARIOS = list;
  SCENARIO_BY_ID = Object.create(null);
  list.forEach(it => {
    const id = it?.id || it;
    if (id) SCENARIO_BY_ID[id] = it;
  });
  return list;
}

/* -----------------------------------------------------------------------------
  Steps indexing / synthesis
----------------------------------------------------------------------------- */
function indexSteps(raw) {
  const map = {};
  (raw?.acts || []).forEach(act => {
    const stepsArr = Array.isArray(act?.steps) ? act.steps : Object.values(act?.steps || {});
    stepsArr.forEach(s => { if (s && s.id) map[s.id] = s; });
  });
  return map;
}

function synthNodeFromStep(step) {
  return {
    id: step.id,
    type: 'line',
    text: step.text ?? '',
    choices: (Array.isArray(step.choices) ? step.choices : Object.values(step.choices || []))
      .map((ch, i) => ({
        id: ch?.id ?? `${step.id}:choice:${i}`,
        label: ch?.label ?? ch?.text ?? ch?.id ?? `Choice ${i+1}`,
        to: ch?.to ?? ch?.goto ?? ch?.next ?? null,
        effects: ch?.effects ?? ch?.meters ?? ch?.effect ?? null,
        meters: ch?.meters ?? null
      }))
  };
}

/* -----------------------------------------------------------------------------
  Nodes extraction / hydration
----------------------------------------------------------------------------- */
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
  if ((!map || !Object.keys(map).length) && Array.isArray(raw?.acts)) {
    for (const act of raw.acts) {
      if (Array.isArray(act?.nodes)) {
        for (const n of act.nodes) if (n?.id) map[n.id] = n;
      }
    }
  }

  // raw.acts[*].steps (modern v2) → synthesize nodes
  if (Array.isArray(raw?.acts)) {
    for (const act of raw.acts) {
      const stepsArr = Array.isArray(act?.steps)
        ? act.steps
        : Object.values(act?.steps || {});
      for (const s of stepsArr) {
        if (!s?.id) continue;
        map[s.id] = map[s.id] || synthNodeFromStep(s);
      }
    }
  }

  // raw.nodes (rare)
  if ((!map || !Object.keys(map).length) && raw?.nodes) {
    if (Array.isArray(raw.nodes)) {
      for (const n of raw.nodes) if (n?.id) map[n.id] = n;
    } else if (typeof raw.nodes === 'object') {
      map = { ...raw.nodes };
    }
  }

  return map;
}

/* -----------------------------------------------------------------------------
  UI helpers (fallback renderer + decoration)
----------------------------------------------------------------------------- */
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
    const sign = v > 0 ? '+' : '';
    parts.push(`${sign}${v} ${METER_LABELS[k]}`);
  }
  return parts.length ? ` (${parts.join(', ')})` : '';
}

function scheduleDecorate(Eng) {
  setTimeout(() => decorateVisibleChoices(Eng), 0);
  setTimeout(() => decorateVisibleChoices(Eng), 50);
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

function renderRawStep(stepId, raw, Eng) {
  if (!stepId) return false;
  const idx = (Eng.__rawStepsIndex ||= indexSteps(raw));
  const step = idx[stepId];
  const dialog = document.getElementById('dialog');
  const choices = document.getElementById('choices');
  if (!step || !dialog || !choices) return false;

  dialog.textContent = step.text || '';
  choices.innerHTML = '';

  const arr = Array.isArray(step.choices) ? step.choices : Object.values(step.choices || {});
  arr.forEach((ch, i) => {
    if (!ch) return;
    const b = document.createElement('button');
    b.className = 'button';
    b.textContent = ch.label || ch.id || `Choice ${i + 1}`;
    b.addEventListener('click', () => navigateTo(ch.to || ch.goto || ch.next, raw, Eng));
    choices.appendChild(b);
  });

  scheduleDecorate(Eng);
  return true;
}

function renderNodeFromState(nodeId, Eng) {
  const node = Eng?.state?.nodes?.[nodeId];
  const dialog = document.getElementById('dialog');
  const choices = document.getElementById('choices');
  if (!node || !dialog || !choices) return false;

  dialog.textContent = node.text || '';
  choices.innerHTML = '';

  (node.choices || []).forEach((ch, i) => {
    const b = document.createElement('button');
    b.className = 'button';
    b.textContent = ch.label || ch.id || `Choice ${i + 1}`;
    b.addEventListener('click', () => navigateTo(ch.to || ch.goto || ch.next, null, Eng));
    choices.appendChild(b);
  });

  scheduleDecorate(Eng);
  return true;
}

/* -----------------------------------------------------------------------------
  Helpers
----------------------------------------------------------------------------- */
function toGraphIfNeeded(data) {
  const looksGraph = data && typeof data === 'object' && data.startId && data.nodes;
  return looksGraph ? data : v2ToGraph(data);
}

function isEndLike(n) {
  if (!n) return false;
  const idTxt = String(n.id || '').toLowerCase();
  const text = String(n.text || '').toLowerCase();
  const typ = String(n.type || '').toLowerCase();
  return typ === 'end' || idTxt.includes('end') || text.startsWith('end of ') || text === 'end';
}

function rememberLast(id) { try { localStorage.setItem('amorvia:lastScenario', id); } catch {} }
function recallLast() { try { return localStorage.getItem('amorvia:lastScenario'); } catch { return null; } }

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

/* Pick first playable step of start act */
function deriveEntryFromV2(raw) {
  if (!raw || !Array.isArray(raw.acts) || raw.acts.length === 0) {
    return { actId: null, nodeId: null };
  }
  const act =
    raw.acts.find(a => a.id === raw.startAct) ||
    raw.acts.find(a => a.id === 'act1') ||
    raw.acts[0];

  if (!act) return { actId: null, nodeId: null };

  const stepsArr = Array.isArray(act.steps) ? act.steps : Object.values(act.steps || {});
  const notEnd = (s) => {
    const id = String(s?.id || '').toLowerCase();
    const txt = String(s?.text || '').toLowerCase();
    return !(id.includes('end') || txt.startsWith('end of ') || txt === 'end');
  };

  const startId = act.start || stepsArr[0]?.id;
  const startStep = stepsArr.find((s) => s.id === startId);
  if (startStep && notEnd(startStep)) return { actId: act.id || null, nodeId: startStep.id };

  const playable = stepsArr.find(notEnd);
  return { actId: act.id || null, nodeId: playable?.id || stepsArr[0]?.id || null };
}

/* -----------------------------------------------------------------------------
  Cross-act safe navigation
----------------------------------------------------------------------------- */
function ensureNodeInState(targetId, raw, Eng) {
  if (!targetId || !Eng) return false;
  // If node already present, done
  if (Eng.state?.nodes?.[targetId]) return true;

  // If we have raw, synthesize from steps and inject
  if (raw) {
    const idx = (Eng.__rawStepsIndex ||= indexSteps(raw));
    const step = idx[targetId];
    if (step) {
      const node = synthNodeFromStep(step);
      if (!Eng.state) Eng.state = {};
      if (!Eng.state.nodes) Eng.state.nodes = {};
      Eng.state.nodes[targetId] = node;
      return true;
    }
  }
  return false;
}

function navigateTo(targetId, rawOrNull, Eng) {
  if (!targetId) return;
  const raw = rawOrNull ?? Eng.__rawScenario;

  // 'menu' pseudo-target: simple UX — just reload list and clear dialog
  if (targetId === 'menu') {
    const dialog = document.getElementById('dialog');
    const choices = document.getElementById('choices');
    if (dialog) dialog.textContent = 'Scenario menu — pick another scenario to start.';
    if (choices) choices.innerHTML = '';
    return;
  }

  // Ensure node exists in state (inject synthesized node if needed)
  if (!ensureNodeInState(targetId, raw, Eng)) {
    console.warn('[Amorvia] target not found and cannot synthesize:', targetId);
    return;
  }

  // Move engine pointer and try engine navigation
  Eng.state.currentId = targetId;
  if (typeof Eng.goto === 'function') {
    try { Eng.goto(targetId); } catch {}
  }

  // If engine did not render, force UI via state or raw
  const renderedFromState = renderNodeFromState(targetId, Eng);
  if (!renderedFromState) {
    renderRawStep(targetId, raw, Eng);
  }
}

/* -----------------------------------------------------------------------------
  UI list
----------------------------------------------------------------------------- */
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

/* -----------------------------------------------------------------------------
  Core: startScenario
----------------------------------------------------------------------------- */
async function startScenario(id) {
  try {
    const { Eng, loadFn, startFn } = await waitForEngine();

    // Monkey-patch goto() once so every navigation re-decorates.
    if (!Eng.__gotoDecorated && typeof Eng.goto === 'function') {
      const _goto = Eng.goto.bind(Eng);
      Eng.goto = (to) => { const r = _goto(to); scheduleDecorate(Eng); return r; };
      Eng.__gotoDecorated = true;
    }

    // Resolve scenario path
    const fromIndex = SCENARIO_BY_ID[id];
    const dataPath = fromIndex?.path || `/data/${id}.v2.json`;

    // Fetch + compute robust entry
    const raw = await getJSON(dataPath);
    Eng.__rawScenario = raw; // keep a handle for navigation synthesis
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
      // Ensure we start at the derived playable node
      injectGraphEntryNode(graph, entry.nodeId);
      loadFn.call(Eng, graph);
      loadedVia = 'graph';
    }
    if (!graph) graph = toGraphIfNeeded(raw);

    // Ensure state and nodes map
    if (!Eng.state) Eng.state = {};
    let nodesMap = Eng.state.nodes;
    if (!nodesMap || !Object.keys(nodesMap).length) {
      nodesMap = extractNodesMap({ raw, graph });
      if (Object.keys(nodesMap).length) {
        Eng.state.nodes = nodesMap;
      } else {
        console.error('[Amorvia] could not build nodes map.');
        throw new Error('Engine has no nodes after load; unable to extract nodes map.');
      }
    }

    // Choose a safe start id
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

    // Avoid starting on an end-like node
    const curNodeCand = Eng.state.nodes[startId];
    if (isEndLike(curNodeCand) && Array.isArray(raw?.acts)) {
      const act =
        raw.acts.find(a => a.id === raw.startAct) ||
        raw.acts.find(a => a.id === 'act1') ||
        raw.acts[0];

      const stepsArr = Array.isArray(act?.steps) ? act.steps : Object.values(act?.steps || {});
      const notEnd = (s) => {
        const sid = String(s?.id || '').toLowerCase();
        const stx = String(s?.text || '').toLowerCase();
        return !(sid.includes('end') || stx.startsWith('end of ') || stx === 'end');
      };
      const preferred = (act?.start && stepsArr.find(s => s.id === act.start && notEnd(s))) || null;
      const playable = preferred?.id || (stepsArr.find(notEnd)?.id) || stepsArr[0]?.id;
      if (playable && Eng.state.nodes[playable]) startId = playable;
    }

    // Set engine pointer then start
    Eng.state.currentId = startId;
    if (Eng.state.graph && typeof Eng.state.graph === 'object') Eng.state.graph.startId = startId;
    if (Eng.state.startId !== undefined) Eng.state.startId = startId;
    startFn.call(Eng, startId);

    // Force UI draw if engine didn’t (or drew placeholder)
    if (!renderNodeFromState(startId, Eng)) {
      renderRawStep(startId, raw, Eng);
    }

    // Reflect selection in UI
    document.querySelectorAll('#scenarioListV2 .item').forEach(el => {
      const on = el.dataset.id === id;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', String(on));
    });
    const picker = document.getElementById('scenarioPicker');
    if (picker) picker.value = id;

    rememberLast(id);
    console.log('[Amorvia] started (via:', loadedVia + ') at', Eng.state.currentId);
  } catch (e) {
    console.error('[Amorvia] Failed to start scenario', id, e);
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.textContent = `Failed to load scenario ${id}: ${e.message}`;
  }
}

/* -----------------------------------------------------------------------------
  Restart button
----------------------------------------------------------------------------- */
(function wireRestart() {
  const btn = document.getElementById('restartAct');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const picker = document.getElementById('scenarioPicker');
    const id = picker?.value || recallLast();
    if (id) startScenario(id);
  });
})();

/* -----------------------------------------------------------------------------
  Init
----------------------------------------------------------------------------- */
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
