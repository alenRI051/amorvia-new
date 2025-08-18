// Minimal, dependency-free UI wiring for Amorvia

const $ = (sel) => document.querySelector(sel);

const els = {
  list:   $('#scenarioList'),
  search: $('#search'),
  actBadge: $('#actBadge'),
  title:  $('#sceneTitle'),
  dialog: $('#dialog'),
  prev:   $('#prevBtn'),
  next:   $('#nextBtn'),
  bgSel:  $('#bgSelect'),
  leftSel:  $('#leftSelect'),
  rightSel: $('#rightSelect'),
  leftImg:  $('#leftImg'),
  rightImg: $('#rightImg'),
  bg:     $('#bg')
};

const state = {
  scenarios: [],     // [{id,title,acts}]
  current: null,     // full scenario
  actIndex: 0
};

const mdLite = (s) => (s || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); // bold only

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function renderList(items) {
  if (!els.list) return;
  els.list.innerHTML = '';
  if (!items.length) {
    els.list.innerHTML = `<div style="opacity:.8">No scenarios found.</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'button';
    btn.style.display = 'flex';
    btn.style.justifyContent = 'space-between';
    btn.style.alignItems = 'center';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.style.gap = '8px';
    btn.dataset.id = s.id;
    btn.innerHTML = `
      <span>${s.title}</span>
      <span class="badge" aria-label="Number of acts">${s.acts ? `Acts: ${s.acts}` : ''}</span>
    `;
    btn.addEventListener('click', () => loadScenario(s.id));
    frag.appendChild(btn);
  });
  els.list.appendChild(frag);
}

function applyCharacterChoices() {
  if (els.leftImg && els.leftSel)  els.leftImg.src  = els.leftSel.value;
  if (els.rightImg && els.rightSel) els.rightImg.src = els.rightSel.value;
}
function applyBackgroundChoice() {
  if (els.bg && els.bgSel) {
    els.bg.style.backgroundImage = `url('${els.bgSel.value}')`;
  }
}

function renderAct() {
  if (!state.current) return;
  const acts = state.current.acts || [];
  const i = Math.max(0, Math.min(state.actIndex, acts.length - 1));
  state.actIndex = i;

  const act = acts[i];
  els.actBadge.textContent = acts.length
    ? `Act ${i + 1} of ${acts.length}`
    : 'Act —';

  els.title.textContent = state.current.title || 'Scenario';
  const steps = (act?.steps || []).map(line => `<li>${mdLite(line)}</li>`).join('');
  els.dialog.innerHTML = steps
    ? `<ul style="margin:8px 0 0; padding-left:20px">${steps}</ul>`
    : `<p style="margin:8px 0 0; opacity:.85">No content for this act.</p>`;

  // Buttons
  els.prev.disabled = i <= 0;
  els.next.disabled = i >= acts.length - 1;
}

async function loadScenario(id) {
  try {
    // prefer split files, fallback to full-index
    let data;
    try {
      data = await getJSON(`/data/${id}.json`);
    } catch {
      const full = await getJSON('/data/full-index.json');
      data = (full.scenarios || []).find(s => s.id === id);
      if (!data) throw new Error('Not found in full-index either.');
    }
    state.current = data;
    state.actIndex = 0;
    renderAct();
  } catch (err) {
    console.error('Could not load scenario', id, err);
    els.dialog.innerHTML = `<p style="opacity:.8">Failed to load scenario. Please check <code>/data/${id}.json</code>.</p>`;
  }
}

function wireSearch() {
  if (!els.search) return;
  els.search.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const items = !q
      ? state.scenarios
      : state.scenarios.filter(s => (s.title + ' ' + s.id).toLowerCase().includes(q));
    renderList(items);
  });
}

function wireNav() {
  els.prev.addEventListener('click', () => { state.actIndex--; renderAct(); });
  els.next.addEventListener('click', () => { state.actIndex++; renderAct(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && !els.prev.disabled) { state.actIndex--; renderAct(); }
    if (e.key === 'ArrowRight' && !els.next.disabled) { state.actIndex++; renderAct(); }
  });
}

function wireSelectors() {
  els.leftSel?.addEventListener('change', applyCharacterChoices);
  els.rightSel?.addEventListener('change', applyCharacterChoices);
  els.bgSel?.addEventListener('change', applyBackgroundChoice);
}

async function loadIndex() {
  try {
    const data = await getJSON('/data/index.json');
    state.scenarios = data.scenarios || [];
    renderList(state.scenarios);
    // Auto-load first scenario for a welcoming experience
    if (state.scenarios[0]) loadScenario(state.scenarios[0].id);
  } catch (err) {
    console.error('Could not load /data/index.json', err);
    els.list.innerHTML = `<div style="opacity:.8">Failed to load scenarios.</div>`;
  }
}

export async function init() {
  applyCharacterChoices();
  applyBackgroundChoice();
  wireSelectors();
  wireNav();
  wireSearch();
  await loadIndex();
}
