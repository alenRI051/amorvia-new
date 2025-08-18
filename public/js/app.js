// CSP-safe app.js: no inline style attributes

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
  bg:     $('#bgImg')
};

const state = {
  scenarios: [],
  current: null,
  actIndex: 0,
  activeId: null
};

const mdLite = (s) => (s || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function markActive(id) {
  state.activeId = id;
  els.list?.querySelectorAll('.list-item[aria-current="true"]').forEach(el => {
    el.setAttribute('aria-current', 'false');
    el.classList.remove('active');
  });
  const currentBtn = els.list?.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (currentBtn) { currentBtn.setAttribute('aria-current', 'true'); currentBtn.classList.add('active'); }
}

function renderList(items) {
  if (!els.list) return;
  els.list.innerHTML = '';
  if (!items.length) { els.list.innerHTML = '<div class="muted">No scenarios found.</div>'; return; }
  const frag = document.createDocumentFragment();
  items.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'button list-item';
    btn.dataset.id = s.id;
    btn.setAttribute('aria-current', s.id === state.activeId ? 'true' : 'false');
    btn.innerHTML = `
      <span>${s.title}</span>
      <span class="badge" aria-label="Number of acts">${s.acts ? `Acts: ${s.acts}` : ''}</span>
    `;
    btn.addEventListener('click', () => loadScenario(s.id));
    frag.appendChild(btn);
  });
  els.list.appendChild(frag);
  if (state.activeId) markActive(state.activeId);
}

function applyCharacterChoices() {
  if (els.leftImg && els.leftSel)  els.leftImg.src  = els.leftSel.value;
  if (els.rightImg && els.rightSel) els.rightImg.src = els.rightSel.value;
}
function applyBackgroundChoice() { if (els.bg && els.bgSel) els.bg.src = els.bgSel.value; }

function renderAct() {
  if (!state.current) return;
  const acts = state.current.acts || [];
  const i = Math.max(0, Math.min(state.actIndex, acts.length - 1));
  state.actIndex = i;

  const act = acts[i];
  els.actBadge.textContent = acts.length ? `Act ${i + 1} of ${acts.length}` : 'Act —';
  els.title.textContent = state.current.title || 'Scenario';

  const steps = (act?.steps || []).map(line => `<li>${mdLite(line)}</li>`).join('');
  els.dialog.innerHTML = steps
    ? `<ul class="mt8 ul-indent">${steps}</ul>`
    : `<p class="mt8 text-muted">No content for this act.</p>`;

  els.prev.disabled = i <= 0;
  els.next.disabled = i >= acts.length - 1;
}

async function loadScenario(id) {
  try {
    let data;
    try { data = await getJSON(`/data/${id}.json`); }
    catch { const full = await getJSON('/data/full-index.json'); data = (full.scenarios || []).find(s => s.id === id); if (!data) throw new Error('Not found in full-index either.'); }
    state.current = data; state.actIndex = 0; markActive(id); renderAct();
  } catch (err) { console.error('Could not load scenario', id, err); els.dialog.innerHTML = '<p class="mt8 text-muted">Failed to load scenario.</p>'; }
}

function wireSearch() {
  if (!els.search) return;
  els.search.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const items = !q ? state.scenarios : state.scenarios.filter(s => (s.title + ' ' + s.id).toLowerCase().includes(q));
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
    if (!state.activeId && state.scenarios[0]) loadScenario(state.scenarios[0].id);
  } catch (err) {
    console.error('Could not load /data/index.json', err);
    els.list.innerHTML = '<div class="muted">Failed to load scenarios.</div>';
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
