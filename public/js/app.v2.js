// Amorvia v2 loader – final corrected edition (2025-10-14)
// ---------------------------------------------------------
// - Loads v2 JSON scenarios or converts to graph fallback
// - Hydrates ScenarioEngine safely from any structure
// - Starts on first playable step, skipping "End of Act"
// - Provides raw-step fallback renderer if engine fails
// - Adds meter-hint decoration to visible choices

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

// --- one-shot guard ---
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

/* =========================================================
   RESET HANDLER (?reset=1 or #reset)
========================================================= */
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

/* =========================================================
   ENGINE RESOLUTION + WAIT
========================================================= */
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
      } else setTimeout(check, 50);
    };
    check();
  });
}

/* =========================================================
   FETCH HELPERS
========================================================= */
const devBust = location.search.includes('devcache=0') ? `?ts=${Date.now()}` : '';
const noStore = { cache: 'no-store' };

async function getJSON(url) {
  const res = await fetch(url + devBust, noStore);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return await res.json();
}

async function loadIndex() {
  const idx = await getJSON('/amorvia.eu/data/v2-index.json');
  return Array.isArray(idx) ? idx : (idx.scenarios || []);
}

/* =========================================================
   NODE EXTRACTION + RAW-STEP RENDER FALLBACK
========================================================= */
function extractNodesMap({ raw, graph }) {
  let map = {};

  // 1. Graph nodes
  if (graph?.nodes) {
    if (Array.isArray(graph.nodes))
      for (const n of graph.nodes) if (n?.id) map[n.id] = n;
    else if (typeof graph.nodes === 'object') map = { ...graph.nodes };
  }

  // 2. Acts[*].nodes
  if (!Object.keys(map).length && Array.isArray(raw?.acts)) {
    for (const act of raw.acts)
      if (Array.isArray(act?.nodes))
        for (const n of act.nodes) if (n?.id) map[n.id] = n;
  }

  // 3. Acts[*].steps (modern)
  if (!Object.keys(map).length && Array.isArray(raw?.acts)) {
    for (const act of raw.acts) {
      const steps = Array.isArray(act?.steps) ? act.steps : [];
      for (const s of steps) {
        if (!s?.id) continue;
        map[s.id] = {
          id: s.id,
          type: 'line',
          text: s.text ?? '',
          choices: (s.choices || []).map((ch, i) => ({
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

  // 4. Root nodes
  if (!Object.keys(map).length && raw?.nodes) {
    if (Array.isArray(raw.nodes))
      for (const n of raw.nodes) if (n?.id) map[n.id] = n;
    else if (typeof raw.nodes === 'object') map = { ...raw.nodes };
  }

  return map;
}

function indexSteps(raw) {
  const map = {};
  (raw?.acts || []).forEach(act =>
    (act?.steps || []).forEach(s => { if (s?.id) map[s.id] = s; })
  );
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
  (step.choices || []).forEach(ch => {
    const b = document.createElement('button');
    b.className = 'button';
    b.textContent = ch.label || ch.id || '…';
    b.addEventListener('click', () => {
      const to = ch.to || ch.goto || ch.next;
      if (!to) return;
      if (Eng?.state) Eng.state.currentId = to;
      if (typeof Eng?.goto === 'function') Eng.goto(to);
      renderRawStep(to, raw, Eng);
    });
    choices.appendChild(b);
  });
  setTimeout(() => scheduleDecorate(Eng), 0);
  return true;
}

/* =========================================================
   ENTRY SELECTION HELPERS
========================================================= */
function deriveEntryFromV2(raw) {
  if (!raw?.acts?.length) return { actId: null, nodeId: null };
  const act =
    raw.acts.find(a => a.id === raw.startAct) ||
    raw.acts.find(a => a.id === 'act1') ||
    raw.acts[0];
  if (!act) return { actId: null, nodeId: null };
  const steps = Array.isArray(act.steps) ? act.steps : [];

  const notEnd = (s) => {
    const id = String(s?.id || '').toLowerCase();
    const txt = String(s?.text || '').toLowerCase();
    return !(id.includes('end') || txt.startsWith('end of ') || txt === 'end');
  };

  const startId = act.start || steps[0]?.id;
  const startStep = steps.find(s => s.id === startId && notEnd(s));
  if (startStep) return { actId: act.id, nodeId: startStep.id };
  const playable = steps.find(notEnd);
  return { actId: act.id, nodeId: playable?.id || steps[0]?.id || null };
}

function isEndLike(n) {
  if (!n) return false;
  const id = (n.id || '').toLowerCase();
  const txt = (n.text || '').toLowerCase();
  const typ = (n.type || '').toLowerCase();
  return typ === 'end' || id.includes('end') || txt.startsWith('end of ') || txt === 'end';
}

/* =========================================================
   METER HINT DECORATION
========================================================= */
const METER_LABELS = { trust: 'Trust', tension: 'Tension', childStress: 'Child Stress' };

function getChoiceDeltas(choice) {
  const totals = { trust: 0, tension: 0, childStress: 0 };
  const add = (k, v) => {
    const key = String(k || '').trim();
    if (!key) return;
    const norm = key in totals ? key :
      (key.toLowerCase() === 'childstress' ? 'childStress' : key.toLowerCase());
    if (norm in totals) {
      const n = Number(v);
      if (!Number.isNaN(n) && n !== 0) totals[norm] += n;
    }
  };
  if (choice && typeof choice.meters === 'object')
    for (const [k, v] of Object.entries(choice.meters)) add(k, v);
  if (Array.isArray(choice?.effects))
    for (const e of choice.effects) add(e.meter ?? e.key, e.delta ?? e.amount ?? e.value);
  if (choice?.meter || choice?.key)
    add(choice.meter ?? choice.key, choice.delta ?? choice.amount ?? choice.value);
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
    if (!node?.choices?.length) return;

    const buttons = Array.from(container.querySelectorAll('button, [role="button"]'));
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

/* =========================================================
   START SCENARIO
========================================================= */
async function startScenario(id) {
  try {
    const { Eng, loadFn, startFn } = await waitForEngine();

    // Re-decorate after each goto
    if (!Eng.__gotoDecorated && typeof Eng.goto === 'function') {
      const _goto = Eng.goto.bind(Eng);
      Eng.goto = (to) => { const r = _goto(to); scheduleDecorate(Eng); return r; };
      Eng.__gotoDecorated = true;
    }

    const raw = await getJSON(`/amorvia.eu/data/${id}.v2.json`);
    const entry = deriveEntryFromV2(raw);
    if (!entry.nodeId) throw new Error('Scenario has no entry node.');

    let loadedVia = 'v2';
    let graph = null;

    try {
      loadFn.call(Eng, raw);
    } catch (e) {
      console.warn('[Amorvia] load v2 failed, retrying with graph:', e?.message || e);
      graph = v2ToGraph(raw);
      // inject entry node so startId = first playable
      const ENTRY_ID = '__amorvia_entry__';
      const entryNode = { id: ENTRY_ID, type: 'goto', to: entry.nodeId };
      if (Array.isArray(graph.nodes)) graph.nodes.unshift(entryNode);
      else graph.nodes = [entryNode];
      graph.startId = ENTRY_ID;
      loadFn.call(Eng, graph);
      loadedVia = 'graph';
    }
    if (!graph) graph = v2ToGraph(raw);

    if (!Eng.state) Eng.state = {};
    let nodesMap = Eng.state.nodes;
    if (!nodesMap || !Object.keys(nodesMap).length) {
      nodesMap = extractNodesMap({ raw, graph });
      Eng.state.nodes = nodesMap;
    }

    // Pick safe start id
    const nodeKeys = Object.keys(Eng.state.nodes);
    let startId = entry.nodeId;
    if (!Eng.state.nodes[startId]) startId = nodeKeys[0];

    // Avoid starting on End node
    const curNodeCand = Eng.state.nodes[startId];
    if (isEndLike(curNodeCand)) {
      const act = raw.acts.find(a => a.id === entry.actId) || raw.acts[0];
      const playable = act?.steps?.find(s => !isEndLike(s))?.id || act?.steps?.[0]?.id;
      if (playable && Eng.state.nodes[playable]) startId = playable;
    }

    Eng.state.currentId = startId;
    startFn.call(Eng, startId);

    // Render raw fallback if needed
    const cur = (typeof Eng.currentNode === 'function')
      ? Eng.currentNode()
      : Eng.state.nodes[startId];
    if (!cur?.text) renderRawStep(startId, raw, Eng);

    console.log('[Amorvia] started (via:', loadedVia + ') at', startId, cur);
    scheduleDecorate(Eng);
  } catch (e) {
    console.error('[Amorvia] Failed to start scenario', id, e);
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.textContent = `Failed to load scenario ${id}: ${e.message}`;
  }
}

/* =========================================================
   RESTART BUTTON + INIT
========================================================= */
(function wireRestart() {
  const btn = document.getElementById('restartAct');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const picker = document.getElementById('scenarioPicker');
    const id = picker?.value || localStorage.getItem('amorvia:lastScenario');
    if (id) startScenario(id);
  });
})();

(async function init() {
  try {
    const scenarios = await loadIndex();
    const last = localStorage.getItem('amorvia:lastScenario');
    const first = (scenarios[0] && (scenarios[0].id || scenarios[0])) || null;
    const initial = last || first;
    if (initial) await startScenario(initial);
  } catch (e) {
    console.error('[Amorvia] init error', e);
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.textContent = `Init error: ${e.message}`;
  }
})();

window.AmorviaApp = { startScenario };


