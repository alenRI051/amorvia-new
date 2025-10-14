// v2 loader wired to ScenarioEngine (supports loadScenario OR LoadScenario + start)
// -------------------------------------------------------------------------------
// - Waits until engine exposes { loadScenario|LoadScenario, start }
// - Loads raw v2 first, falls back to graph if needed
// - Hydrates engine.state.nodes from *any* shape (graph array/object, raw acts[*].nodes, raw.nodes, or acts[*].steps)
// - Starts on a safe node (resolves one goto hop; avoids starting on "End of Act")
// - Adds meter-hint injection to choice labels (full names: Trust, Tension, Child Stress)

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

// -----------------------------------------------------------------------------
// One-shot guard
// -----------------------------------------------------------------------------
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

// -----------------------------------------------------------------------------
// Reset support (?reset=1 or #reset)
// -----------------------------------------------------------------------------
(() => {
  const url = new URL(window.location.href);
  const shouldReset =
    url.searchParams.get('reset') === '1' || url.hash.includes('reset');
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

// -----------------------------------------------------------------------------
// Engine resolution
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Fetch helpers
// -----------------------------------------------------------------------------
const devBust = location.search.includes('devcache=0') ? `?ts=${Date.now()}` : '';
const noStore = { cache: 'no-store' };

async function getJSON(url) {
  const full = url.startsWith('/') ? url : `/${url}`;
  const res = await fetch(full + devBust, noStore);
  if (!res.ok) throw new Error(`${full} ${res.status}`);
  return await res.json();
}

// cache of v2 index and map id->path
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

// -----------------------------------------------------------------------------
// Nodes extraction / hydration
// -----------------------------------------------------------------------------
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

  // raw.acts[*].steps (modern v2) → synthesize nodes (supports array or object)
  if ((!map || !Object.keys(map).length) && Array.isArray(raw?.acts)) {
    for (const act of raw.acts) {
      const stepsArr = Array.isArray(act?.steps)
        ? act.steps
        : Object.values(act?.steps || {});
      for (const s of stepsArr) {
        if (!s?.id) continue;
        map[s.id] = {
          id: s.id,
          type: 'line',
          text: s.text ?? '',
          choices: (Array.isArray(s.choices) ? s.choices : Object.values(s.choices || []))
            .map((ch, i) => ({
              id: ch?.id ?? `${s.id}:choice:${i}`,
              label: ch?.label ?? ch?.text ?? ch?.id ?? '…',
              to: ch?.to ?? ch?.goto ?? ch?.next ?? null,
              effects: ch?.effects ?? ch?.meters ?? ch?.effect ?? null,
              meters: ch?.meters ?? null,
            })),
        };
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

// -----------------------------------------------------------------------------
// Raw-steps fallback renderer (safe for array/object shapes)
// -----------------------------------------------------------------------------
function indexSteps(raw) {
  const map = {};
  (raw?.acts || []).forEach(act => {
    const stepsArr = Array.isArray(act?.steps)
      ? act.steps
      : Object.values(act?.steps || {});
    stepsArr.forEach(s => { if (s && s.id) map[s.id] = s; });
  });
  return map;
}

function renderRawStep(stepId, raw, Eng) {
  const steps = (Eng.__rawStepsIndex ||= indexSteps(raw));
  const step = steps[stepId];
  const dialog = document.getElementById('dialog');
  const choices = document.getElementById('choices');

  if (!step || !dialog || !choices) return false;

  dialog.textContent = step.text || '';

  choices.innerHTML = '';
  const choicesArr = Array.isArray(step.choices)
    ? step.choices
    : Object.values(step.choices || {});
  choicesArr.forEach((ch, i) => {
    if (!ch) return;
    const b = document.createElement('button');
    b.className = 'button';
    b.textContent = ch.label || ch.id || `Choice ${i + 1}`;
    b.addEventListener('click', () => {
      const to = ch.to || ch.goto || ch.next;
      if (!to) return;
      if (Eng?.state) Eng.state.currentId = to;
      if (typeof Eng?.goto === 'function') Eng.goto(to);
      renderRawStep(to, raw, Eng); // chain fallback render
    });
    choices.appendChild(b);
  });

  setTimeout(() => scheduleDecorate(Eng), 0);
  return true;
}

// -----------------------------------------------------------------------------
// UI wiring
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function toGraphIfNeeded(data) {
  const looksGraph = data && typeof data === 'object' && data.startId && data.nodes;
  return looksGraph ? data : v2ToGraph(data);
}

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

  const pickPlayableStepId = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const notEnd = (s) => {
      const id = String(s?.id || '').toLowerCase();
      const txt = String(s?.text || '').toLowerCase();
      return !(id.includes('end') || txt.startsWith('end of ') || txt === 'end');
    };
    const startId = act.start || arr[0]?.id;
    const startStep = arr.find((s) => s.id === startId);
    if (startStep && notEnd(startStep)) return startStep.id;
    const playable = arr.find(notEnd);
    return playable?.id || arr[0]?.id || null;
  };

  if (stepsArr.length) return { actId: act.id || null, nodeId: pickPlayableStepId(stepsArr) };

  if (Array.isArray(act.nodes) && act.nodes.length) {
    let node = act.nodes.find((n) => n.id === 'start') || act.nodes[0];
    if (node?.type?.toLowerCase() === 'goto' && node.to) {
      const hop = act.nodes.find((n) => n.id === node.to);
      if (hop) node = hop;
    }
    return { actId: act.id || null, nodeId: node?.id || null };
  }

  if (Array.isArray(raw.nodes) && raw.nodes.length) {
    let node = raw.nodes.find((n) => n.id === 'start') || raw.nodes[0];
    if (node?.type?.toLowerCase() === 'goto' && node.to) {
      const hop = raw.nodes.find((n) => n.id === node.to);
      if (hop) node = hop;
    }
    return { actId: act.id || null, nodeId: node?.id || null };
  }

  return { actId: null, nodeId: null };
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

// Synthetic entry id helper
const ENTRY_ID = '__amorvia_entry__';
const isEntryId = (x) => String(x) === ENTRY_ID;

/* Force-start helper: inject a synthetic entry node that goto’s our target */
function injectGraphEntryNode(graph, entryId) {
  if (!graph || !entryId) return graph;
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

// -----------------------------------------------------------------------------
// Meter hint helpers
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Core: startScenario
// -----------------------------------------------------------------------------
async function startScenario(id) {
  try {
    const { Eng, loadFn, startFn } = await waitForEngine();

    // Monkey-patch goto() once so every navigation re-decorates.
    if (!Eng.__gotoDecorated && typeof Eng.goto === 'function') {
      const _goto = Eng.goto.bind(Eng);
      Eng.goto = (to) => { const r = _goto(to); scheduleDecorate(Eng); return r; };
      Eng.__gotoDecorated = true;
    }

    // Resolve the JSON path from the index if available; else fall back to /data/{id}.v2.json
    const fromIndex = SCENARIO_BY_ID[id];
    const dataPath = fromIndex?.path || `/data/${id}.v2.json`;

    // Fetch + compute robust entry
    const raw = await getJSON(dataPath);
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
      injectGraphEntryNode(graph, entry.nodeId); // enforce start
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
    const nodeKeysAll = Object.keys(Eng.state.nodes);
    let startId = entry.nodeId;
    if (!Eng.state.nodes[startId]) {
      startId = (graph.startId || startId || nodeKeysAll[0]);
      let s = Eng.state.nodes[startId];
      if (s?.type?.toLowerCase() === 'goto' && s.to && Eng.state.nodes[s.to]) {
        startId = s.to;
      }
      if (!Eng.state.nodes[startId]) startId = nodeKeysAll[0];
    }

    // Pre-start: avoid End-of-Act
    const curNodeCand = Eng.state.nodes[startId];
    if (isEndLike(curNodeCand) && Array.isArray(raw?.acts)) {
      const startAct =
        raw.acts.find(a => a.id === raw.startAct) ||
        raw.acts.find(a => a.id === 'act1') ||
        raw.acts[0];

      const stepsArr = Array.isArray(startAct?.steps) ? startAct.steps : Object.values(startAct?.steps || {});
      const notEnd = (s) => {
        const sid = String(s?.id || '').toLowerCase();
        const stx = String(s?.text || '').toLowerCase();
        return !(sid.includes('end') || stx.startsWith('end of ') || stx === 'end');
      };
      const preferred = (startAct?.start && stepsArr.find(s => s.id === startAct.start && notEnd(s))) || null;
      const playable = preferred?.id || (stepsArr.find(notEnd)?.id) || stepsArr[0]?.id;
      if (playable && Eng.state.nodes[playable]) startId = playable;
    }

    // Set engine pointer then start
    Eng.state.currentId = startId;
    if (Eng.state.graph && typeof Eng.state.graph === 'object') Eng.state.graph.startId = startId;
    if (Eng.state.startId !== undefined) Eng.state.startId = startId;

    startFn.call(Eng, startId);

    // If we booted via the synthetic entry, auto-hop to the real first step and render immediately.
    if (isEntryId(startId) && entry?.nodeId) {
      const target = entry.nodeId;
      const hop = () => {
        if (Eng.state?.nodes?.[target]) {
          Eng.state.currentId = target;
          if (typeof Eng.goto === 'function') {
            Eng.goto(target);
            // force immediate draw after goto
            renderRawStep(target, raw, Eng);
          } else if (typeof Eng.start === 'function') {
            Eng.start(target);
            renderRawStep(target, raw, Eng);
          } else {
            renderRawStep(target, raw, Eng);
          }
          scheduleDecorate(Eng);
        } else {
          setTimeout(hop, 0);
        }
      };
      setTimeout(hop, 0);
    }

    // Post-start safety: if still at an end node, jump to playable
    const currentAfterStart = (typeof Eng.currentNode === 'function')
      ? Eng.currentNode()
      : Eng.state?.nodes?.[Eng.state?.currentId];

    if (isEndLike(currentAfterStart) && Array.isArray(raw?.acts)) {
      const startAct2 =
        raw.acts.find(a => a.id === raw.startAct) ||
        raw.acts.find(a => a.id === 'act1') ||
        raw.acts[0];

      const stepsArr2 = Array.isArray(startAct2?.steps) ? startAct2.steps : Object.values(startAct2?.steps || {});
      const notEnd2 = (s) => {
        const sid = String(s?.id || '').toLowerCase();
        const stx = String(s?.text || '').toLowerCase();
        return !(sid.includes('end') || stx.startsWith('end of ') || stx === 'end');
      };
      const preferred2 = (startAct2?.start && stepsArr2.find(s => s.id === startAct2.start && notEnd2(s))) || null;
      const playable2 = preferred2?.id || (stepsArr2.find(notEnd2)?.id) || stepsArr2[0]?.id;

      if (playable2 && Eng.state?.nodes?.[playable2]) {
        Eng.state.currentId = playable2;
        if (typeof Eng.goto === 'function') Eng.goto(playable2);
        renderRawStep(playable2, raw, Eng);
      }
    }

    // Debug
    const cur = (typeof Eng.currentNode === 'function')
      ? Eng.currentNode()
      : Eng.state.nodes[Eng.state.currentId];
    console.log('[Amorvia] started (via:', loadedVia + ') at', Eng.state.currentId, cur);

    // Fallback render if engine didn’t draw (or drew an empty node)
    {
      const curNodeId = Eng.state?.currentId;
      const targetId = isEntryId(curNodeId) && entry?.nodeId ? entry.nodeId : curNodeId;
      const cur2 =
        (typeof Eng.currentNode === 'function') ? Eng.currentNode()
        : Eng.state?.nodes?.[targetId];

      const noText = !cur2 || (!cur2.text && (cur2.type || '').toLowerCase() !== 'choice');

      if (noText) {
        const rendered = renderRawStep(targetId, raw, Eng);
        if (!rendered) {
          const dialog = document.getElementById('dialog');
          const choices = document.getElementById('choices');
          if (dialog) dialog.textContent = cur2?.text || '(…)';
          if (choices) choices.innerHTML = '';
        }
      }
    }

    // Always decorate visible choices after a start
    scheduleDecorate(Eng);

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

// -----------------------------------------------------------------------------
// Restart button
// -----------------------------------------------------------------------------
(function wireRestart() {
  const btn = document.getElementById('restartAct');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const picker = document.getElementById('scenarioPicker');
    const id = picker?.value || recallLast();
    if (id) startScenario(id);
  });
})();

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------
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


