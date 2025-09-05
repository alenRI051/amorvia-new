// app.v2.js — v2 loader wired to ScenarioEngine + v2ToGraph
import { v2ToGraph } from '/js/compat/v2-to-graph.js';
import { ScenarioEngine } from '/js/engine/scenarioEngine.js';

const devBust = location.search.includes('devcache=0') ? `?t=${Date.now()}` : '';
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
      el.tabIndex = 0;
      el.addEventListener('click', () => startScenario(id));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') startScenario(id); });
      container.appendChild(el);
    }
  });

  if (picker) picker.addEventListener('change', () => startScenario(picker.value));
}

function toGraphIfNeeded(data) {
  const isGraph = data && typeof data === 'object' && data.startId && data.nodes && typeof data.nodes === 'object';
  return isGraph ? data : v2ToGraph(data);
}

async function startScenario(id) {
  try {
    const raw = await getJSON(`/data/${id}.v2.json`);
    const graph = toGraphIfNeeded(raw);
    ScenarioEngine.loadScenario(graph);
    ScenarioEngine.start(graph.startId);

    document.querySelectorAll('#scenarioListV2 .item').forEach(el => {
      el.classList.toggle('is-active', el.dataset.id === id);
    });
  } catch (e) {
    console.error('[Amorvia] Failed to start scenario', id, e);
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.textContent = `Failed to load scenario ${id}: ${e.message}`;
  }
}

(async function init() {
  try {
    const scenarios = await loadIndex();
    renderList(scenarios);
    const first = (scenarios[0] && (scenarios[0].id || scenarios[0])) || null;
    if (first) await startScenario(first);
  } catch (e) {
    console.error('[Amorvia] init error', e);
    const dialog = document.getElementById('dialog');
    if (dialog) dialog.textContent = `Init error: ${e.message}`;
  }
})();

window.AmorviaApp = { startScenario };

