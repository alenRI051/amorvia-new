// app.v2.js
// -------------------------------------------------------------------------------------------------
// Amorvia v2 loader + raw-steps fallback + live HUD meters (animated) + choice hint decoration
// Works with engines that expose: { loadScenario|LoadScenario, start, goto?, currentNode? }
// -------------------------------------------------------------------------------------------------

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

/* ================================================================================================
   Boot guard
================================================================================================ */
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

/* ================================================================================================
   Reset support (?reset=1 or #reset)
================================================================================================ */
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

/* ================================================================================================
   Engine resolution
================================================================================================ */
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

/* ================================================================================================
   Fetch helpers
================================================================================================ */
const devBust = location.search.includes('devcache=0') ? `?ts=${Date.now()}` : '';
const noStore = { cache: 'no-store' };

async function getJSON(url) {
  const full = url.startsWith('/') ? url : `/${url}`;
  const res = await fetch(full + devBust, noStore);
  if (!res.ok) throw new Error(`${full} ${res.status}`);
  return await res.json();
}

// v2 index cache
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

/* ================================================================================================
   Nodes extraction / hydration
================================================================================================ */
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

/* ================================================================================================
   Raw-steps fallback renderer (no more “(…)”)
================================================================================================ */
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

  // text
  dialog.textContent = step.text || '';

  // choices
  choices.innerHTML = '';
  const choicesArr = Array.isArray(step.choices)
    ? step.choices
    : Object.values(step.choices || {});
  choicesArr.forEach((ch, i) => {
    if (!ch) return;
    const b = document.createElement('button');
    b.className = 'button';
    b.textContent = ch.label || ch.id || `Choice ${i + 1}`;
    const deltas = getChoiceDeltas(ch);
    b.addEventListener('click', () => {
      const to = ch.to || ch.goto || ch.next;
      if (!to) return;
      // Visual HUD response immediately
      HUD.applyDelta(deltas);
      if (Eng?.state) Eng.state.currentId = to;
      if (typeof Eng?.goto === 'function') Eng.goto(to);
      // render next step from raw immediately (in case engine still doesn’t)
      renderRawStep(to, raw, Eng);
      // capture engine-side clamps if any
      setTimeout(() => HUD.syncFromEngine(Eng), 40);
    });
    choices.appendChild(b);
  });

  // decorate hints
  setTimeout(() => scheduleDecorate(Eng), 0);
  setTimeout(() => scheduleHudWiring(Eng), 0);
  return true;
}

/* ================================================================================================
   UI: scenario list
================================================================================================ */
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

/* ================================================================================================
   Helpers
================================================================================================ */
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

/* ================================================================================================
   Choice meter hints
================================================================================================ */
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

/* ================================================================================================
   HUD (live meters) + CSS injector for animated bars
================================================================================================ */
(function injectMeterCSS(){
  if (document.getElementById('amorvia-hud-css')) return;
  const css = `
    [data-meter] .fill, [data-meter] .bar, [data-meter] .progress {
      transition: width 180ms ease;
    }
    /* graceful default width zero if missing inline styles */
    [data-meter] .fill:not([style*="width"]),
    [data-meter] .bar:not([style*="width"]),
    [data-meter] .progress:not([style*="width"]) { width: 0; }
  `;
  const style = document.createElement('style');
  style.id = 'amorvia-hud-css';
  style.textContent = css;
  document.head.appendChild(style);
})();

const HUD_SELECTORS = {
  trust:      ['#hudTrust', '#hud-trust', '[data-meter="trust"] .value', '#meter-trust .value', '#trustVal', '.meter-trust .value'],
  tension:    ['#hudTension', '#hud-tension', '[data-meter="tension"] .value', '#meter-tension .value', '#tensionVal', '.meter-tension .value'],
  childStress:['#hudChildStress', '#hud-childStress', '[data-meter="childStress"] .value', '#meter-childStress .value', '#childStressVal', '.meter-childStress .value']
};

function __findOrCreate(elSelList, fallbackBoxSel, idToCreate) {
  for (const sel of elSelList) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  const box = document.querySelector(fallbackBoxSel) || document.querySelector('#hud') || document.body;
  const s = document.createElement('span');
  s.id = idToCreate;
  s.style.marginLeft = '0.25rem';
  s.style.fontWeight = '600';
  box.appendChild(s);
  return s;
}

const HUD = {
  meters: { trust: 0, tension: 0, childStress: 0 },
  els: null,

  ensure() {
    if (this.els) return this.els;
    this.els = {
      trust: __findOrCreate(HUD_SELECTORS.trust,  '[data-meter="trust"]',       'hud-trust'),
      tension: __findOrCreate(HUD_SELECTORS.tension, '[data-meter="tension"]',     'hud-tension'),
      childStress: __findOrCreate(HUD_SELECTORS.childStress, '[data-meter="childStress"]','hud-childStress'),
    };
    return this.els;
  },

  reset() {
    this.meters = { trust: 0, tension: 0, childStress: 0 };
    this.render();
  },

  syncFromEngine(Eng) {
    const m = Eng?.state?.meters || Eng?.meters;
    if (m && typeof m === 'object') {
      for (const k of Object.keys(this.meters)) {
        const v = Number(m[k]);
        if (!Number.isNaN(v)) this.meters[k] = v;
      }
    }
    this.render();
  },

  applyDelta(deltaObj) {
    for (const k of Object.keys(this.meters)) {
      const dv = Number(deltaObj?.[k] || 0);
      if (!Number.isNaN(dv) && dv !== 0) this.meters[k] += dv;
    }
    this.render();
  },

  render() {
    const { trust, tension, childStress } = this.meters;
    const els = this.ensure();
    if (els.trust) els.trust.textContent = String(trust);
    if (els.tension) els.tension.textContent = String(tension);
    if (els.childStress) els.childStress.textContent = String(childStress);

    for (const [k, v] of Object.entries(this.meters)) {
      const card = document.querySelector(`[data-meter="${k}"]`);
      if (card) {
        card.dataset.value = String(v);
        const fill = card.querySelector('.fill, .bar, .progress');
        if (fill) fill.style.width = `${Math.max(0, Math.min(100, v))}%`;
      }
    }
  }
};

function wireHudToVisibleChoices(Eng) {
  try {
    const container = document.getElementById('choices');
    if (!container) return;
    const node = (typeof Eng.currentNode === 'function') ? Eng.currentNode() : Eng.state?.nodes?.[Eng.state?.currentId];
    if (!node || !Array.isArray(node.choices)) return;

    const buttons = Array.from(container.querySelectorAll('button, [role="button"]'));
    buttons.forEach((btn, idx) => {
      if (btn.__hudWired) return;
      btn.__hudWired = true;
      const choice = node.choices[idx];
      const deltas = getChoiceDeltas(choice);
      btn.addEventListener('click', () => {
        HUD.applyDelta(deltas);
        setTimeout(() => HUD.syncFromEngine(Eng), 40);
      }, { capture: true });
    });
  } catch {}
}

function scheduleHudWiring(Eng) {
  setTimeout(() => wireHudToVisibleChoices(Eng), 0);
  setTimeout(() => wireHudToVisibleChoices(Eng), 60);
}

/* ================================================================================================
   Core: startScenario
================================================================================================ */
async function startScenario(id) {
  try {
    const { Eng, loadFn, startFn } = await waitForEngine();

    // goto monkey-patch -> always (re)decorate + (re)wire HUD
    if (!Eng.__gotoDecorated && typeof Eng.goto === 'function') {
      const _goto = Eng.goto.bind(Eng);
      Eng.goto = (to) => {
        const r = _goto(to);
        scheduleDecorate(Eng);
        scheduleHudWiring(Eng);
        setTimeout(() => HUD.syncFromEngine(Eng), 0);
        return r;
      };
      Eng.__gotoDecorated = true;
    }

    // Resolve path from index if available
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
        throw new Error('Engine has no nodes after load; unable to extract nodes map.');
      }
    }

    // Choose a safe start id
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

    // Pre-start: avoid "End of"
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
    if (Eng.state.graph && typeof Eng.state.graph === 'object') {
      Eng.state.graph.startId = startId;
    }
    if (Eng.state.startId !== undefined) Eng.state.startId = startId;

    // HUD boot
    HUD.reset();

    startFn.call(Eng, startId);

    // If we booted via synthetic entry, auto-hop
    if (startId === '__amorvia_entry__' && entry?.nodeId) {
      const target = entry.nodeId;
      const hop = () => {
        if (Eng.state?.nodes?.[target]) {
          Eng.state.currentId = target;
          if (typeof Eng.goto === 'function') {
            Eng.goto(target);
          } else if (typeof Eng.start === 'function') {
            Eng.start(target);
            renderRawStep(target, raw, Eng);
          }
          scheduleDecorate(Eng);
          scheduleHudWiring(Eng);
        } else {
          setTimeout(hop, 0);
        }
      };
      setTimeout(hop, 0);
    }

    // Post-start safety: escape end nodes
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
      }
    }

    // Debug
    const cur = (typeof Eng.currentNode === 'function')
      ? Eng.currentNode()
      : Eng.state.nodes[Eng.state.currentId];
    console.log('[Amorvia] started (via:', loadedVia + ') at', Eng.state.currentId, cur);

    // Fallback render if engine didn’t draw
    {
      const curNodeId = Eng.state?.currentId;
      const n =
        (typeof Eng.currentNode === 'function') ? Eng.currentNode()
        : Eng.state?.nodes?.[curNodeId];

      const noText = !n || (!n.text && (n.type || '').toLowerCase() !== 'choice');

      if (noText) {
        const rendered = renderRawStep(curNodeId, raw, Eng);
        if (!rendered) {
          const dialog = document.getElementById('dialog');
          const choices = document.getElementById('choices');
          if (dialog) dialog.textContent = n?.text || '(…)';
          if (choices) choices.innerHTML = '';
        }
      }
    }

    // Final HUD sync + wiring
    setTimeout(() => HUD.syncFromEngine(Eng), 0);
    scheduleDecorate(Eng);
    scheduleHudWiring(Eng);

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

/* ================================================================================================
   Restart button
================================================================================================ */
(function wireRestart() {
  const btn = document.getElementById('restartAct');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const picker = document.getElementById('scenarioPicker');
    const id = picker?.value || recallLast();
    if (id) startScenario(id);
  });
})();

/* ================================================================================================
   Init
================================================================================================ */
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
