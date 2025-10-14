// v2 loader wired to ScenarioEngine
// - Works with v2 acts/steps, legacy nodes, mixed
// - Robust start node selection (never starts on "End of Act")
// - Forces start via synthetic __amorvia_entry__ when engine ignores start()
// - Last-resort renderer directly from raw steps

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

/* ---------------- one-shot guard ---------------- */
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

/* ---------------- reset (?reset=1 or #reset) ---------------- */
(() => {
  const url = new URL(window.location.href);
  const shouldReset =
    url.searchParams.get('reset') === '1' || url.hash.includes('reset');
  if (!shouldReset) return;
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

/* ---------------- engine resolve / wait ---------------- */
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
    const tick = () => {
      const Eng = resolveEngineObject();
      const loadFn = Eng?.loadScenario || Eng?.LoadScenario;
      const startFn = Eng?.start;
      if (Eng && typeof loadFn === 'function' && typeof startFn === 'function') {
        resolve({ Eng, loadFn, startFn });
      } else {
        setTimeout(tick, 50);
      }
    };
    tick();
  });
}

/* ---------------- fetch helpers ---------------- */
const devBust = location.search.includes('devcache=0') ? `?ts=${Date.now()}` : '';
const noStore = { cache: 'no-store' };

async function getJSON(url) {
  const res = await fetch(url + devBust, noStore);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // If the server returned HTML (404 page), throw a JSON-ish error
    throw new Error(`${url} ${res.status}${text?.startsWith('{') ? '' : ' (not JSON or 404 HTML)'}`);
  }
  return await res.json();
}

async function loadIndex() {
  const idx = await getJSON('/data/v2-index.json');
  return Array.isArray(idx) ? idx : (idx.scenarios || []);
}

/* ---------------- shapes → nodes map ---------------- */
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

  // raw.acts[*].steps (modern) → synthesize graphish nodes
  if ((!map || !Object.keys(map).length) && Array.isArray(raw?.acts)) {
    for (const act of raw.acts) {
      const steps = Array.isArray(act?.steps) ? act.steps : [];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (!s?.id) continue;
        map[s.id] = {
          id: s.id,
          type: 'line',
          text: s.text ?? '',
          choices: (s.choices || []).map((ch, idx) => ({
            id: ch?.id ?? `${s.id}:choice:${idx}`,
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

/* ---------------- utility ---------------- */
function toGraphIfNeeded(data) {
  const looksGraph = data && typeof data === 'object' && data.startId && data.nodes;
  return looksGraph ? data : v2ToGraph(data);
}
function isEndLike(n) {
  if (!n) return false;
  const idTxt = String(n.id || '').toLowerCase();
  const text = String(n.text || '').toLowerCase();
  const typ  = String(n.type || '').toLowerCase();
  return typ === 'end' || idTxt.includes('end') || text.startsWith('end of ') || text === 'end';
}
function rememberLast(id) { try { localStorage.setItem('amorvia:lastScenario', id); } catch {} }
function recallLast() { try { return localStorage.getItem('amorvia:lastScenario'); } catch { return null; } }

/* robust entry derivation from raw */
function deriveEntryFromV2(raw) {
  if (!raw || !Array.isArray(raw.acts) || raw.acts.length === 0) {
    return { actId: null, nodeId: null };
  }
  const act =
    raw.acts.find(a => a.id === raw.startAct) ||
    raw.acts.find(a => a.id === 'act1') ||
    raw.acts[0];

  if (!act) return { actId: null, nodeId: null };

  const steps = Array.isArray(act.steps) ? act.steps : [];
  const pickPlayableStepId = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const notEnd = (s) => {
      const id = String(s?.id || '').toLowerCase();
      const txt = String(s?.text || '').toLowerCase();
      return !(id.includes('end') || txt.startsWith('end of ') || txt === 'end');
    };
    const startId = act.start || arr[0]?.id;
    const startStep = arr.find(s => s.id === startId);
    if (startStep && notEnd(startStep)) return startStep.id;
    const playable = arr.find(notEnd);
    return playable?.id || arr[0]?.id || null;
  };

  if (steps.length) return { actId: act.id || null, nodeId: pickPlayableStepId(steps) };

  if (Array.isArray(act.nodes) && act.nodes.length) {
    let node = act.nodes.find(n => n.id === 'start') || act.nodes[0];
    if (node?.type?.toLowerCase() === 'goto' && node.to) {
      const hop = act.nodes.find(n => n.id === node.to);
      if (hop) node = hop;
    }
    return { actId: act.id || null, nodeId: node?.id || null };
  }

  if (Array.isArray(raw.nodes) && raw.nodes.length) {
    let node = raw.nodes.find(n => n.id === 'start') || raw.nodes[0];
    if (node?.type?.toLowerCase() === 'goto' && node.to) {
      const hop = raw.nodes.find(n => n.id === node.to);
      if (hop) node = hop;
    }
    return { actId: act.id || null, nodeId: node?.id || null };
  }

  return { actId: null, nodeId: null };
}

/* synthetic entry injector (forces engines that ignore start arg) */
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

/* raw-steps quick index + renderer (last resort) */
function indexSteps(raw) {
  const map = {};
  (raw?.acts || []).forEach(act => {
    (act?.steps || []).forEach(s => { if (s?.id) map[s.id] = s; });
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
  return true;
}

/* ---------------- meter hint decoration ---------------- */
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

/* ---------------- UI list ---------------- */
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

/* ---------------- core start ---------------- */
async function startScenario(id) {
  try {
    const { Eng, loadFn, startFn } = await waitForEngine();

    // Re-decorate after every navigation.
    if (!Eng.__gotoDecorated && typeof Eng.goto === 'function') {
      const _goto = Eng.goto.bind(Eng);
      Eng.goto = (to) => { const r = _goto(to); scheduleDecorate(Eng); return r; };
      Eng.__gotoDecorated = true;
    }

    // Fetch scenario + compute entry
    const raw = await getJSON(`/data/${id}.v2.json`);
    let entry = deriveEntryFromV2(raw);
    // If derivation failed, we’ll compute after hydration from node map.

    // Load raw, fallback to graph
    let loadedVia = 'v2';
    let graph = null;
    try {
      loadFn.call(Eng, raw);
    } catch (e) {
      console.warn('[Amorvia] load v2 failed, retrying with graph:', e?.message || e);
      graph = toGraphIfNeeded(raw);

      // If we already have an entry candidate, force the engine to start there
      if (entry?.nodeId) {
        injectGraphEntryNode(graph, entry.nodeId);
      }
      loadFn.call(Eng, graph);
      loadedVia = 'graph';
    }
    if (!graph) graph = toGraphIfNeeded(raw);

    // Hydrate nodes map if engine didn’t
    if (!Eng.state) Eng.state = {};
    if (!Eng.state.nodes || !Object.keys(Eng.state.nodes).length) {
      Eng.state.nodes = extractNodesMap({ raw, graph });
      if (!Object.keys(Eng.state.nodes).length) {
        throw new Error('Engine has no nodes after load; unable to extract nodes map.');
      }
    }

    // If we still lack entry.nodeId, pick from hydrated nodes map (non-end first)
    if (!entry?.nodeId) {
      const keys = Object.keys(Eng.state.nodes);
      const pick =
        keys.find(k => !isEndLike(Eng.state.nodes[k])) || // first non-end
        keys[0] || null;
      entry = { actId: entry?.actId ?? null, nodeId: pick };
      if (!entry.nodeId) {
        throw new Error('Scenario has no entry node.'); // (shouldn’t happen now)
      }
    }

    // Compute startId safely (resolve one goto)
    const keys = Object.keys(Eng.state.nodes);
    let startId = entry.nodeId;
    if (!Eng.state.nodes[startId]) {
      startId = graph.startId || startId || keys[0];
    }
    let s = Eng.state.nodes[startId];
    if (s?.type?.toLowerCase() === 'goto' && s.to && Eng.state.nodes[s.to]) {
      startId = s.to;
      s = Eng.state.nodes[startId];
    }

    // Avoid End-of-Act pre-start
    if (isEndLike(s)) {
      const nonEnd = keys.find(k => !isEndLike(Eng.state.nodes[k]));
      if (nonEnd) startId = nonEnd;
    }

    // Set pointer + try starting
    Eng.state.currentId = startId;
    if (Eng.state.graph && typeof Eng.state.graph === 'object') Eng.state.graph.startId = startId;
    if (Eng.state.startId !== undefined) Eng.state.startId = startId;
    startFn.call(Eng, startId);

    // If engine ignored our start and still sat at synthetic entry, hop
    if (startId === '__amorvia_entry__' && entry?.nodeId) {
      const target = entry.nodeId;
      setTimeout(function hop() {
        if (Eng.state?.nodes?.[target]) {
          Eng.state.currentId = target;
          if (typeof Eng.goto === 'function') Eng.goto(target);
          scheduleDecorate(Eng);
        } else {
          setTimeout(hop, 0);
        }
      }, 0);
    }

    // If UI didn’t render, force from raw
    const curNow = (typeof Eng.currentNode === 'function') ? Eng.currentNode() : Eng.state.nodes[Eng.state.currentId];
    const noText = !curNow || (!curNow.text && (curNow.type || '').toLowerCase() !== 'choice');
    if (noText) {
      const did = renderRawStep(Eng.state.currentId, raw, Eng);
      if (!did) {
        const dialog = document.getElementById('dialog');
        if (dialog) dialog.textContent = curNow?.text || '(…)';
      }
    }

    // Decorate
    scheduleDecorate(Eng);

    // UI reflect selection
    document.querySelectorAll('#scenarioListV2 .item').forEach(el => {
      const on = el.dataset.id === id;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', String(on));
    });
    const picker = document.getElementById('scenarioPicker');
    if (picker) picker.value = id;

    rememberLast(id);
    console.log('[Amorvia] started (via:', loadedVia + ') at', Eng.state.currentId, curNow || Eng.state.nodes[Eng.state.currentId]);
  } catch (e) {
    console.error('[Amorvia] Failed to start scenario', id, e);
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.textContent = `Failed to load scenario ${id}: ${e.message}`;
  }
}

/* ---------------- restart button ---------------- */
(function wireRestart() {
  const btn = document.getElementById('restartAct');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const picker = document.getElementById('scenarioPicker');
    const id = picker?.value || recallLast();
    if (id) startScenario(id);
  });
})();

/* ---------------- init ---------------- */
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
