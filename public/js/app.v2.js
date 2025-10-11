// v2 loader wired to ScenarioEngine (supports loadScenario OR LoadScenario + start)
// -------------------------------------------------------------------------------
// - Waits until engine exposes { loadScenario|LoadScenario, start }
// - Loads raw v2 first, falls back to graph if needed
// - Hydrates engine.state.nodes from *any* shape (graph array/object, raw acts[*].nodes, raw.acts[*].steps, raw.nodes)
// - Starts on a safe node (resolves one goto hop; avoids starting on "end"/terminal)
// - Adds meter-hint injection to choice labels (full names: Trust, Tension, Child Stress)

import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import * as ImportedEngine from '/js/engine/scenarioEngine.js';

/* ----------------------- one-shot guard ----------------------- */
if (window.__amorviaV2Booted) {
  console.warn('[Amorvia] app.v2 already booted, skipping.');
} else {
  window.__amorviaV2Booted = true;
}

/* ----------------------- reset support (?reset=1 or #reset) ----------------------- */
(() => {
  const url = new URL(window.location.href);
  const shouldReset = url.searchParams.get('reset') === '1' || url.hash.includes('reset');

  if (shouldReset) {
    console.log('[Amorvia] Reset flag detected — clearing saved progress');

    try {
      Object.keys(localStorage)
        .filter(
          (k) =>
            k.startsWith('amorvia:state:') ||
            k === 'amorvia:lastScenario' ||
            k === 'amorvia:mode'
        )
        .forEach((k) => localStorage.removeItem(k));
    } catch {}

    try { sessionStorage.clear(); } catch {}

    const clean = window.location.origin + window.location.pathname;
    window.history.replaceState({}, '', clean);
    window.location.reload();
  }
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

/* ----------------------- nodes extraction ----------------------- */
function extractNodesMap({ raw, graph }) {
  let map = {};

  // graph.nodes (object or array)
  if (graph?.nodes) {
    if (Array.isArray(graph.nodes)) {
      for (const n of graph.nodes) if (n?.id) map[n.id] = n;
    } else if (typeof graph.nodes === 'object') {
      map = { ...graph.nodes };
    }
  }

  // legacy: raw.acts[*].nodes
  if ((!map || !Object.keys(map).length) && Array.isArray(raw?.acts)) {
    for (const act of raw.acts) {
      if (Array.isArray(act?.nodes)) {
        for (const n of act.nodes) if (n?.id) map[n.id] = n;
      }
    }
  }

  // modern v2: raw.acts[*].steps → synthesize graph-like nodes
  if ((!map || !Object.keys(map).length) && Array.isArray(raw?.acts)) {
    for (const act of raw.acts) {
      if (Array.isArray(act?.steps)) {
        for (const s of act.steps) {
          if (!s?.id) continue;
          map[s.id] = {
            id: s.id,
            type: 'line',
            text: s.text ?? '',
            choices: (s.choices || []).map((ch) => ({
              id: ch.id ?? ch.label ?? 'choice',
              label: ch.label ?? ch.text ?? ch.id ?? '…',
              to: ch.to ?? ch.goto ?? ch.next ?? null,
              effects: ch.effects ?? ch.meters ?? ch.effect ?? null,
            })),
          };
        }
      }
    }
  }

  // root: raw.nodes
  if ((!map || !Object.keys(map).length) && raw?.nodes) {
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

/* ----------------------- format helpers ----------------------- */
function toGraphIfNeeded(data) {
  const looksGraph = data && typeof data === 'object' && data.startId && data.nodes;
  return looksGraph ? data : v2ToGraph(data);
}

// Choose a safe entry: prefer startAct/act.start; avoid end-like nodes
function deriveEntryFromV2(raw) {
  if (!raw || !Array.isArray(raw.acts) || raw.acts.length === 0) {
    return { actId: null, nodeId: null };
  }

  const act =
    raw.acts.find((a) => a.id === raw.startAct) ||
    raw.acts.find((a) => a.id === 'act1') ||
    raw.acts[0];

  if (!act) return { actId: null, nodeId: null };

  // helper: first playable step id (not an end/terminal)
  const pickPlayableStepId = (steps) => {
    if (!Array.isArray(steps) || steps.length === 0) return null;
    const notEnd = (s) => {
      const id = String(s?.id || '').toLowerCase();
      const txt = String(s?.text || '').toLowerCase();
      return !(id.includes('end') || txt.startsWith('end of ') || txt === 'end');
    };
    // prefer declared act.start if it's playable
    const startId = act.start || steps[0]?.id;
    const startStep = steps.find((s) => s.id === startId);
    if (startStep && notEnd(startStep)) return startStep.id;
    // else first playable
    const playable = steps.find(notEnd);
    return playable?.id || steps[0]?.id || null;
  };

  // v2 steps
  if (Array.isArray(act.steps) && act.steps.length) {
    return { actId: act.id || null, nodeId: pickPlayableStepId(act.steps) };
  }

  // legacy nodes
  if (Array.isArray(act.nodes) && act.nodes.length) {
    let node = act.nodes.find((n) => n.id === 'start') || act.nodes[0];
    if (node?.type?.toLowerCase() === 'goto' && node.to) {
      const hop = act.nodes.find((n) => n.id === node.to);
      if (hop) node = hop;
    }
    return { actId: act.id || null, nodeId: node?.id || null };
  }

  // rare: root nodes
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

/* ----------------------- meter hint helpers ----------------------- */
const METER_LABELS = {
  trust: 'Trust',
  tension: 'Tension',
  childStress: 'Child Stress',
};

function getChoiceDeltas(choice) {
  const totals = { trust: 0, tension: 0, childStress: 0 };

  const add = (k, v) => {
    const key = String(k || '').trim();
    if (!key) return;
    const norm =
      key in totals ? key :
      key.toLowerCase() === 'childstress' ? 'childStress' :
      key.toLowerCase();
    if (norm in totals) {
      const n = Number(v);
      if (!Number.isNaN(n) && n !== 0) totals[norm] += n;
    }
  };

  if (choice && typeof choice.meters === 'object') {
    for (const [k, v] of Object.entries(choice.meters)) add(k, v);
  }
  if (Array.isArray(choice?.effects)) {
    for (const e of choice.effects) {
      if (!e) continue;
      add(e.meter ?? e.key, e.delta ?? e.amount ?? e.value);
    }
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

    const node =
      (typeof Eng.currentNode === 'function')
        ? Eng.currentNode()
        : Eng.state?.nodes?.[Eng.state?.currentId];

    if (!node || !Array.isArray(node.choices) || !node.choices.length) return;

    const buttons = Array.from(container.querySelectorAll('button, [role="button"]'));
    if (!buttons.length) return;

    node.choices.forEach((ch, idx) => {
      const btn = buttons[idx];
      if (!btn) return;
      if (btn.dataset.hinted === '1') return;

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

/* ----------------------- simple persistence ----------------------- */
function rememberLast(id) {
  try { localStorage.setItem('amorvia:lastScenario', id); } catch {}
}
function recallLast() {
  try { return localStorage.getItem('amorvia:lastScenario'); } catch { return null; }
}

/* ----------------------- core start ----------------------- */
async function startScenario(id) {
  try {
    const { Eng, loadFn, startFn } = await waitForEngine();

    // Patch goto once to re-decorate after every navigation
    if (!Eng.__gotoDecorated && typeof Eng.goto === 'function') {
      const _goto = Eng.goto.bind(Eng);
      Eng.goto = (to) => { const r = _goto(to); scheduleDecorate(Eng); return r; };
      Eng.__gotoDecorated = true;
    }

    // Fetch + compute robust entry
    const raw = await getJSON(`/data/${id}.v2.json`);
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
        console.error('[Amorvia] could not build nodes map. Shapes:', {
          graph_nodes_obj: !!(graph?.nodes && typeof graph.nodes === 'object' && !Array.isArray(graph.nodes)),
          graph_nodes_arr: Array.isArray(graph?.nodes),
          raw_acts: Array.isArray(raw?.acts) ? raw.acts.length : 0,
          raw_nodes_obj: !!(raw?.nodes && typeof raw.nodes === 'object' && !Array.isArray(raw.nodes)),
          raw_nodes_arr: Array.isArray(raw?.nodes),
        });
        throw new Error('Engine has no nodes after load; unable to extract nodes map.');
      }
    }

    // Choose a safe startId that exists and isn't an "end"
    const isEndLike = (n) => {
      if (!n) return false;
      const idStr  = String(n.id || '').toLowerCase();
      const txtStr = String(n.text || '').toLowerCase();
      const type   = String(n.type || '').toLowerCase();
      return type === 'end' || idStr.includes('end') || txtStr.startsWith('end of ') || txtStr === 'end';
    };

    const nodeKeys = Object.keys(Eng.state.nodes);
    let startId = entry.nodeId;

    // If missing, try graph.startId, resolve goto, else first key
    if (!Eng.state.nodes[startId]) {
      startId = graph.startId || startId || nodeKeys[0];
      let s = Eng.state.nodes[startId];
      if (s?.type?.toLowerCase() === 'goto' && s.to && Eng.state.nodes[s.to]) {
        startId = s.to;
      }
      if (!Eng.state.nodes[startId]) startId = nodeKeys[0];
    }

    // If startId is end-like, try to pick a playable step from the intended start act
    let cand = Eng.state.nodes[startId];
    if (isEndLike(cand) && Array.isArray(raw?.acts)) {
      const act =
        raw.acts.find((a) => a.id === raw.startAct) ||
        raw.acts.find((a) => a.id === 'act1') ||
        raw.acts[0];

      const steps = act?.steps || [];
      const notEndStep = (s) => {
        const sid = String(s?.id || '').toLowerCase();
        const stx = String(s?.text || '').toLowerCase();
        return !(sid.includes('end') || stx.startsWith('end of ') || stx === 'end');
      };

      let playable = null;
      if (act?.start) {
        const maybe = steps.find((s) => s.id === act.start);
        if (maybe && notEndStep(maybe) && Eng.state.nodes[maybe.id]) {
          playable = maybe.id;
        }
      }
      if (!playable) {
        const firstPlayable = steps.find(notEndStep)?.id;
        if (firstPlayable && Eng.state.nodes[firstPlayable]) playable = firstPlayable;
      }
      if (!playable) {
        // final fallback: first node that doesn't look like end
        playable = nodeKeys.find((k) => !isEndLike(Eng.state.nodes[k])) || nodeKeys[0];
      }
      if (playable) startId = playable;
    }

    // Set engine pointer then start
    Eng.state.currentId = startId;
    startFn.call(Eng, startId);

    // Debug
    const cur = (typeof Eng.currentNode === 'function')
      ? Eng.currentNode()
      : Eng.state.nodes[Eng.state.currentId];

    console.log('[Amorvia] started (via:', loadedVia + ') at', startId, cur);
    console.log('[Amorvia] node keys (first 10):', nodeKeys.slice(0, 10));

    // Fallback render if engine didn’t draw
    if (!cur || (!cur.text && String(cur.type || '').toLowerCase() !== 'choice')) {
      const dialog = document.getElementById('dialog');
      const choices = document.getElementById('choices');
      if (dialog) dialog.textContent = cur?.text || '(…)';
      if (choices) {
        choices.innerHTML = '';
        if (Array.isArray(cur?.choices)) {
          cur.choices.forEach((ch) => {
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
                const dialogEl = document.getElementById('dialog');
                if (dialogEl) dialogEl.textContent = nn?.text || '';
                scheduleDecorate(Eng);
              }
            });
            choices.appendChild(b);
          });
        }
      }
    }

    // Decorate visible choices after a start
    scheduleDecorate(Eng);

    // Reflect selection in UI
    document.querySelectorAll('#scenarioListV2 .item').forEach((el) => {
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

