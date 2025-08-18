
// Amorvia Classic v1 — CSP-safe UI (exports init)
/* global localStorage, fetch, document */
export async function init() {
  const $ = (s) => document.querySelector(s);
  const els = {
    search: $('#search'),
    list: $('#scenarioList'),
    prev: $('#prevBtn'),
    next: $('#nextBtn'),
    title: $('#sceneTitle'),
    dialog: $('#dialog'),
    actBadge: $('#actBadge'),
  };

  // Helpers
  const storageKey = 'amorvia:v1:last';
  const mdLite = (s='') => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  function saveState(sIdx, aIdx) {
    try { localStorage.setItem(storageKey, JSON.stringify({ sIdx, aIdx })); } catch {}
  }
  function loadState() {
    try { return JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { return null; }
  }

  // Data
  let scenarios = [];
  try {
    const res = await fetch('/data/scenarios.json', { cache: 'no-store' });
    scenarios = (await res.json()).scenarios || [];
  } catch (e) {
    console.error('Failed to load scenarios.json', e);
    els.dialog.textContent = 'Failed to load scenarios.';
    return;
  }

  // State
  let sIdx = 0; // scenario index
  let aIdx = 0; // act index

  // Restore last selection if possible
  const last = loadState();
  if (last && Number.isInteger(last.sIdx) && scenarios[last.sIdx]) {
    sIdx = last.sIdx;
    aIdx = Math.max(0, Math.min(last.aIdx || 0, (scenarios[sIdx].acts?.length ?? 1) - 1));
  }

  // Renderers
  function renderList(filter = '') {
    const q = (filter || '').trim().toLowerCase();
    els.list.innerHTML = '';
    const frag = document.createDocumentFragment();

    scenarios
      .map((s, i) => ({ i, ...s }))
      .filter(s => !q || s.title.toLowerCase().includes(q))
      .forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'button block';
        btn.setAttribute('type', 'button');
        btn.setAttribute('aria-label', `${s.title}, ${s.acts?.length ?? 0} acts`);
        btn.innerHTML = `<span>${s.title}</span> <span class="badge" style="margin-left:auto">Acts: ${s.acts?.length ?? 0}</span>`;
        if (s.i === sIdx) btn.classList.add('active');
        btn.addEventListener('click', () => { sIdx = s.i; aIdx = 0; renderAct(); renderList(els.search?.value || ''); saveState(sIdx, aIdx); });
        frag.appendChild(btn);
      });

    if (!frag.childNodes.length) {
      const p = document.createElement('p');
      p.textContent = 'No scenarios match your search.';
      frag.appendChild(p);
    }

    els.list.appendChild(frag);
  }

  function renderAct() {
    const s = scenarios[sIdx];
    if (!s) return;
    const act = s.acts?.[aIdx];

    els.title.textContent = s.title || 'Scenario';
    const actCount = s.acts?.length ?? 1;
    els.actBadge.textContent = `Act ${Math.min(aIdx + 1, actCount)} of ${actCount}`;

    els.dialog.innerHTML = '';
    if (act?.steps?.length) {
      const ul = document.createElement('ul');
      ul.className = 'steps';
      act.steps.forEach(line => {
        const li = document.createElement('li');
        li.innerHTML = mdLite(String(line));
        ul.appendChild(li);
      });
      els.dialog.appendChild(ul);
    } else {
      els.dialog.textContent = 'No steps.';
    }

    els.prev.disabled = aIdx <= 0;
    els.next.disabled = aIdx >= actCount - 1;
  }

  // Events
  els.search?.addEventListener('input', (e) => renderList(e.target.value));
  els.prev?.addEventListener('click', () => {
    if (aIdx > 0) { aIdx--; renderAct(); saveState(sIdx, aIdx); }
  });
  els.next?.addEventListener('click', () => {
    const s = scenarios[sIdx];
    if (s && aIdx < (s.acts?.length ?? 1) - 1) { aIdx++; renderAct(); saveState(sIdx, aIdx); }
  });

  // Basic keyboard support for prev/next
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { els.prev?.click(); }
    if (e.key === 'ArrowRight') { els.next?.click(); }
  });

  // Initial paint
  renderList('');
  renderAct();
}
