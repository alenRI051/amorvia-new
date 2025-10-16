// v2 loader wired to ScenarioEngine (supports loadScenario OR LoadScenario + start)
// -------------------------------------------------------------------------------
// - Waits until engine exposes { loadScenario|LoadScenario, start }
// - Loads raw v2 first, falls back to graph if needed
// - Hydrates engine.state(.nodes) and engine.state2(.nodes) from v2 (acts[*].steps/nodes) or graph
// - Starts on a safe node (resolves one goto hop; avoids “End of Act”)
// - Renders even if the engine doesn’t (fallback), adds meter-hints to choice labels

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

/* -------------------------------------------------------------------------- */
/* one-shot guard                                                             */
/* -------------------------------------------------------------------------- */
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

/* -------------------------------------------------------------------------- */
/* reset support (?reset=1 or #reset)                                         */
/* -------------------------------------------------------------------------- */
(() => {
  const url = new URL(window.location.href);
  if (!(url.searchParams.get('reset') === '1' || url.hash.includes('reset'))) return;
  console.log('[Amorvia] Reset flag detected — clearing saved progress');
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('amorvia:state:') || k === 'amorvia:lastScenario' || k === 'amorvia:mode')
      .forEach(k => localStorage.removeItem(k));
  } catch {}
  try { sessionStorage.clear(); } catch {}
  const clean = window.location.origin + window.location.pathname;
  window.history.replaceState({}, '', clean);
  window.location.reload();
})();

/* -------------------------------------------------------------------------- */
/* engine resolution                                                          */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* state helpers — seamlessly support state and state2                        */
/* -------------------------------------------------------------------------- */
function ensureStates(Eng) {
  if (!Eng.state) Eng.state = {};
  if (!Eng.state2) Eng.state2 = {};
}
function getNodes(Eng) {
  ensureStates(Eng);
  return Eng.state?.nodes || Eng.state2?.nodes || null;
}
function setNodes(Eng, nodesMap) {
  ensureStates(Eng);
  Eng.state.nodes = nodesMap;
  Eng.state2.nodes = nodesMap;
}
function getCurrentId(Eng) {
  ensureStates(Eng);
  return Eng.state?.currentId ?? Eng.state2?.currentId ?? null;
}
function setCurrentId(Eng, id) {
  ensureStates(Eng);
  Eng.state.currentId = id;
  Eng.state2.currentId = id;
}
function getGraph(Eng) {
  ensureStates(Eng);
  return Eng.state?.graph || Eng.state2?.graph || null;
}
function setStartIdEverywhere(Eng, id) {
  const g = getGraph(Eng);
  if (g && typeof g === 'object') g.startId = id;
  if ('startId' in Eng.state) Eng.state.startId = id;
  if ('startId' in Eng.state2) Eng.state2.startId = id;
}
function currentNodeObj(Eng) {
  try {
    if (typeof Eng.currentNode === 'function') return Eng.currentNode();
  } catch {}
  const nodes = getNodes(Eng);
  const cid = getCurrentId(Eng);
  return nodes?.[cid] ?? null;
}

/* -------------------------------------------------------------------------- */
/* fetch helpers                                                              */
/* -------------------------------------------------------------------------- */
const devBust = location.search.includes('devcache=0') ? `?ts=${Date.now()}` : '';
const noStore = { cache: 'no-store' };
async function getJSON(url) {
  const full = url.startsWith('/') ? url : `/${url}`;
  const res = await fetch(full + devBust, noStore);
  if (!res.ok) throw new Error(`${full} ${res.status}`);
  return await res.json();
}
let SCENARIOS = [];
let SCENARIO_BY_ID = Object.create(null);
async function loadIndex() {
  const idx = await getJSON('/data/v2-index.json');
  const list = Array.isArray(idx) ? idx : (idx.scenarios || []);
  SCENARIOS = list;
  SCENARIO_BY_ID = Object.create(null);
  list.forEach(it => { if (it?.id) SCENARIO_BY_ID[it.id] = it; });
  return list;
}

/* -------------------------------------------------------------------------- */
/* nodes extraction / hydration                                               */
/* -------------------------------------------------------------------------- */
function extractNodesMap({ raw, graph }) {
  let map = {};
  // graph
  if (graph?.nodes) {
    if (Array.isArray(graph.nodes)) for (const n of graph.nodes) if (n?.id) map[n.id] = n;
    else if (typeof graph.nodes === 'object') map = { ...graph.nodes };
  }
  // raw.acts[*].nodes
  if ((!map || !Object.keys(map).length) && Array.isArray(raw?.acts)) {
    for (const act of raw.acts) {
      if (Array.isArray(act?.nodes)) for (const n of act.nodes) if (n?.id) map[n.id] = n;
    }
  }
  // raw.acts[*].steps
  if ((!map || !Object.keys(map).length) && Array.isArray(raw?.acts)) {
    for (const act of raw.acts) {
      const stepsArr = Array.isArray(act?.steps) ? act.steps : Object.values(act?.steps || {});
      for (const s of stepsArr) {
        if (!s?.id) continue;
        const choicesArr = Array.isArray(s.choices) ? s.choices : Object.values(s.choices || {});
        map[s.id] = {
          id: s.id,
          type: 'line',
          text: s.text ?? '',
          choices: choicesArr.map((ch, i) => ({
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
  // raw.nodes
  if ((!map || !Object.keys(map).length) && raw?.nodes) {
    if (Array.isArray(raw.nodes)) for (const n of raw.nodes) if (n?.id) map[n.id] = n;
    else if (typeof raw.nodes === 'object') map = { ...raw.nodes };
  }
  return map;
}

/* -------------------------------------------------------------------------- */
/* raw-steps fallback renderer                                                */
/* -------------------------------------------------------------------------- */
function indexSteps(raw) {
  const map = {};
  (raw?.acts || []).forEach(act => {
    const stepsArr = Array.isArray(act?.steps) ? act.steps : Object.values(act?.steps || {});
    stepsArr.forEach(s => { if (s?.id) map[s.id] = s; });
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

  const choicesArr = Array.isArray(step.choices) ? step.choices : Object.values(step.choices || {});
  choicesArr.forEach((ch, i) => {
    if (!ch) return;
    const b = document.createElement('button');
    b.className = 'button';
    b.textContent = ch.label || ch.id || `Choice ${i + 1}`;
    b.addEventListener('click', () => {
      const to = ch.to || ch.goto || ch.next;
      if (!to) return;
      setCurrentId(Eng, to);
      if (typeof Eng?.goto === 'function') Eng.goto(to);
      renderRawStep(to, raw, Eng);
    });
    choices.appendChild(b);
  });

  setTimeout(() => scheduleDecorate(Eng), 0);
  return true;
}

/* -------------------------------------------------------------------------- */
/* UI wiring                                                                  */
/* -------------------------------------------------------------------------- */
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
      opt.value = id; opt.textContent = title; if (i === 0) opt.selected = true;
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

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */
function toGraphIfNeeded(data) {
  const looksGraph = data && typeof data === 'object' && data.startId && data.nodes;
  return looksGraph ? data : v2ToGraph(data);
}
function deriveEntryFromV2(raw) {
  if (!raw || !Array.isArray(raw.acts) || raw.acts.length === 0) return { actId: null, nodeId: null };

  const act = raw.acts.find(a => a.id === raw.startAct) || raw.acts.find(a => a.id === 'act1') || raw.acts[0];
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

/* -------------------------------------------------------------------------- */
/* meter hint helpers                                                         */
/* -------------------------------------------------------------------------- */
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
  if (choice && typeof choice.meters === 'object') for (const [k, v] of Object.entries(choice.meters)) add(k, v);
  if (Array.isArray(choice?.effects)) for (const e of choice.effects) add(e.meter ?? e.key, e.delta ?? e.amount ?? e.value);
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

    const node = currentNodeObj(Eng);
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

/* -------------------------------------------------------------------------- */
/* core start                                                                 */
/* -------------------------------------------------------------------------- */
async function startScenario(id) {
  try {
    const { Eng, loadFn, startFn } = await waitForEngine();

    // Redecorate after every goto
    if (!Eng.__gotoDecorated && typeof Eng.goto === 'function') {
      const _goto = Eng.goto.bind(Eng);
      Eng.goto = (to) => { const r = _goto(to); scheduleDecorate(Eng); return r; };
      Eng.__gotoDecorated = true;
    }

    // Resolve JSON path via index (if present)
    const fromIndex = SCENARIO_BY_ID[id];
    const dataPath = fromIndex?.path || `/data/${id}.v2.json`;

    // Fetch + compute robust entry
    const raw = await getJSON(dataPath);
    const entry = deriveEntryFromV2(raw);
    if (!entry.nodeId) throw new Error('Scenario has no entry node.');

    // Try raw v2 first; fallback to graph
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

    // Hydrate node map to both state & state2
    ensureStates(Eng);
    let nodesMap = getNodes(Eng);
    if (!nodesMap || !Object.keys(nodesMap).length) {
      nodesMap = extractNodesMap({ raw, graph });
      if (!Object.keys(nodesMap).length) throw new Error('Engine has no nodes after load; unable to extract nodes map.');
      setNodes(Eng, nodesMap);
    }

    // Pick safe start id
    const allKeys = Object.keys(nodesMap);
    let startId = entry.nodeId;
    if (!nodesMap[startId]) {
      startId = (graph.startId || startId || allKeys[0]);
      let s = nodesMap[startId];
      if (s?.type?.toLowerCase() === 'goto' && s.to && nodesMap[s.to]) startId = s.to;
      if (!nodesMap[startId]) startId = allKeys[0];
    }

    // Avoid End-of-Act
    if (isEndLike(nodesMap[startId]) && Array.isArray(raw?.acts)) {
      const startAct = raw.acts.find(a => a.id === raw.startAct) || raw.acts.find(a => a.id === 'act1') || raw.acts[0];
      const stepsArr = Array.isArray(startAct?.steps) ? startAct.steps : Object.values(startAct?.steps || {});
      const notEnd = (s) => {
        const sid = String(s?.id || '').toLowerCase();
        const stx = String(s?.text || '').toLowerCase();
        return !(sid.includes('end') || stx.startsWith('end of ') || stx === 'end');
      };
      const preferred = (startAct?.start && stepsArr.find(s => s.id === startAct.start && notEnd(s))) || null;
      const playable = preferred?.id || (stepsArr.find(notEnd)?.id) || stepsArr[0]?.id;
      if (playable && nodesMap[playable]) startId = playable;
    }

    // Start engine (write pointers to BOTH states)
    setCurrentId(Eng, startId);
    setStartIdEverywhere(Eng, startId);
    startFn.call(Eng, startId);

    // If we began at the synthetic entry, hop to real first node now
    if (startId === '__amorvia_entry__' && entry?.nodeId) {
      const target = entry.nodeId;
      const hop = () => {
        const nodes = getNodes(Eng);
        if (nodes?.[target]) {
          setCurrentId(Eng, target);
          if (typeof Eng.goto === 'function') Eng.goto(target);
          else if (typeof Eng.start === 'function') Eng.start(target);
          scheduleDecorate(Eng);
        } else {
          setTimeout(hop, 0);
        }
      };
      setTimeout(hop, 0);
    }

    // Post-start safety: if still end-like, jump to playable
    {
      const cur = currentNodeObj(Eng);
      if (isEndLike(cur) && Array.isArray(raw?.acts)) {
        const startAct = raw.acts.find(a => a.id === raw.startAct) || raw.acts.find(a => a.id === 'act1') || raw.acts[0];
        const stepsArr = Array.isArray(startAct?.steps) ? startAct.steps : Object.values(startAct?.steps || {});
        const notEnd = (s) => {
          const sid = String(s?.id || '').toLowerCase();
          const stx = String(s?.text || '').toLowerCase();
          return !(sid.includes('end') || stx.startsWith('end of ') || stx === 'end');
        };
        const playable = (startAct?.start && stepsArr.find(s => s.id === startAct.start && notEnd(s)))?.id
          || (stepsArr.find(notEnd)?.id) || stepsArr[0]?.id;
        if (playable && nodesMap[playable]) {
          setCurrentId(Eng, playable);
          if (typeof Eng.goto === 'function') Eng.goto(playable);
        }
      }
    }

    // Debug
    console.log('[Amorvia] started (via:', loadedVia + ') at', getCurrentId(Eng), currentNodeObj(Eng));

    // Fallback render if engine didn’t draw
    {
      const curId = getCurrentId(Eng);
      const cur = currentNodeObj(Eng);
      const dialogEl = document.getElementById('dialog');
      const needsFallback = !cur || (!cur.text && (cur.type || '').toLowerCase() !== 'choice') ||
                            (dialogEl && (!dialogEl.textContent || dialogEl.textContent === '(…)'));
      if (needsFallback) {
        const rendered = renderRawStep(curId, raw, Eng);
        if (!rendered && cur?.text && dialogEl) {
          dialogEl.textContent = cur.text;
          const choicesEl = document.getElementById('choices');
          if (Array.isArray(cur?.choices) && choicesEl) {
            choicesEl.innerHTML = '';
            cur.choices.forEach(ch => {
              const b = document.createElement('button');
              b.className = 'button';
              b.textContent = ch.label || ch.id || 'Continue';
              b.addEventListener('click', () => { const to = ch.to || ch.goto || ch.next; if (to) Eng.goto(to); });
              choicesEl.appendChild(b);
            });
          }
        }
      }
    }

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

/* -------------------------------------------------------------------------- */
/* restart button                                                             */
/* -------------------------------------------------------------------------- */
(function wireRestart() {
  const btn = document.getElementById('restartAct');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const picker = document.getElementById('scenarioPicker');
    const id = picker?.value || recallLast();
    if (id) startScenario(id);
  });
})();

/* -------------------------------------------------------------------------- */
/* init                                                                       */
/* -------------------------------------------------------------------------- */
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

// Debug helper & quick inspector for state/state2
window.AmorviaApp = {
  startScenario,
  __debug() {
    const Eng = resolveEngineObject();
    return {
      currentId_state: Eng?.state?.currentId,
      currentId_state2: Eng?.state2?.currentId,
      node_state: Eng?.state?.nodes?.[Eng?.state?.currentId],
      node_state2: Eng?.state2?.nodes?.[Eng?.state2?.currentId],
    };
  }
};
