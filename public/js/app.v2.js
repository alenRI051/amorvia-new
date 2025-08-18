\
// Scenario v2 UI wiring (modules-only build)
import { ScenarioEngine, formatDeltas } from './engine/scenarioEngine.js';

const $ = (s) => document.querySelector(s);

const els = {
  bg: $('#bgImg'),
  leftImg: $('#leftImg'),
  rightImg: $('#rightImg'),
  leftSel: $('#leftSelect'),
  rightSel: $('#rightSelect'),
  bgSel: $('#bgSelect'),
  picker: $('#scenarioPicker'),
  restart: $('#restartAct'),
  hud: $('#hud'),
  actBadge: $('#actBadge'),
  title: $('#sceneTitle'),
  dialog: $('#dialog'),
  choices: $('#choices')
};

function applyCharAndBg() {
  if (els.leftImg && els.leftSel) els.leftImg.src = els.leftSel.value;
  if (els.rightImg && els.rightSel) els.rightImg.src = els.rightSel.value;
  if (els.bg && els.bgSel) els.bg.src = els.bgSel.value;
}
['change'].forEach(evt => {
  els.leftSel?.addEventListener(evt, applyCharAndBg);
  els.rightSel?.addEventListener(evt, applyCharAndBg);
  els.bgSel?.addEventListener(evt, applyCharAndBg);
});

const eng = new ScenarioEngine();

function renderHUD() {
  const st = eng.state;
  if (!st) return;
  const cfg = (eng.scenario?.meters) || {
    tension: { label: 'Tension' },
    trust: { label: 'Trust' },
    childStress: { label: 'Child Stress' }
  };
  els.hud.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const [k, v] of Object.entries(st.meters || {})) {
    const meter = document.createElement('div');
    meter.className = 'meter';
    const dot = document.createElement('span'); dot.className = 'dot';
    const label = document.createElement('span'); label.className = 'label'; label.textContent = cfg[k]?.label || k;
    const val = document.createElement('span'); val.className = 'value'; val.textContent = String(Math.round(v));
    meter.append(dot, label, val);
    frag.appendChild(meter);
  }
  els.hud.appendChild(frag);
}

function mdLite(s='') { return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

function renderNode() {
  const node = eng.currentNode();
  const act = eng.act;
  if (!node || !act) return;

  const acts = eng.scenario.acts || [];
  const idx = acts.findIndex(a => a.id === act.id);
  els.actBadge.textContent = `Act ${idx + 1} of ${acts.length}`;
  els.title.textContent = eng.scenario.title;

  els.choices.innerHTML = '';
  els.dialog.innerHTML = '';

  if (node.type === 'line') {
    const div = document.createElement('div');
    div.className = 'content';
    div.innerHTML = mdLite(node.text || '');
    els.dialog.appendChild(div);

    const btn = document.createElement('button');
    btn.className = 'button';
    btn.textContent = 'Continue';
    btn.addEventListener('click', () => { eng.lineNext(); });
    els.choices.appendChild(btn);
    btn.focus();
  } else if (node.type === 'choice') {
    const p = document.createElement('p');
    p.className = 'content';
    p.innerHTML = mdLite(node.prompt || '');
    els.dialog.appendChild(p);

    (node.choices || []).forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'choice-btn';
      b.innerHTML = `<span class="kbd">[${i+1}]</span> ${c.label}`;
      b.addEventListener('click', () => { eng.choose(i); });
      els.choices.appendChild(b);
      if (i === 0) b.focus();
    });
  } else if (node.type === 'end') {
    const deltas = eng.deltas();
    const p = document.createElement('p');
    p.className = 'summary';
    p.textContent = `Act finished • ${formatDeltas(deltas)}`;
    els.dialog.appendChild(p);

    const retry = document.createElement('button');
    retry.className = 'button'; retry.textContent = 'Retry Act';
    retry.addEventListener('click', () => eng.resetAct());
    els.choices.appendChild(retry);

    const acts = eng.scenario.acts || [];
    const idx = acts.findIndex(a => a.id === eng.state.actId);
    if (idx >= 0 && idx < acts.length - 1) {
      const next = document.createElement('button');
      next.className = 'button'; next.textContent = 'Next Act';
      next.addEventListener('click', () => eng.startAct(acts[idx+1].id, { forceFresh: true }));
      els.choices.appendChild(next);
    }
    retry.focus();
  }
  renderHUD();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    const node = eng.currentNode();
    if (!node) return;
    if (node.type === 'choice') {
      const num = parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= (node.choices?.length || 0)) {
        e.preventDefault(); eng.choose(num - 1);
      }
    } else if (node.type === 'line') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); eng.lineNext(); }
    }
  });
}

async function populatePicker() {
  try {
    const res = await fetch('/data/v2-index.json', { cache: 'no-store' });
    const idx = await res.json();
    els.picker.innerHTML = '';
    (idx.scenarios || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.title || s.id;
      els.picker.appendChild(opt);
    });
  } catch (e) {
    console.warn('Failed to load v2-index.json', e);
    els.picker.innerHTML = '<option value="co-parenting-with-bipolar-partner">Co-Parenting with Bipolar Partner</option>';
  }
}

async function loadScenarioById(id) {
  const s = await eng.fetchById(id);
  eng.loadScenario(s);
  eng.startAct(s.acts[0].id);
}

function wireScenarioPicker() {
  els.picker?.addEventListener('change', async () => {
    await loadScenarioById(els.picker.value);
  });
}

function wireRestart() { els.restart?.addEventListener('click', () => eng.resetAct()); }
function subscribeRender() { eng.subscribe(() => { try { renderNode(); } catch (e) { console.error(e); } }); }

(function init(){
  applyCharAndBg();
  wireKeyboard();
  wireScenarioPicker();
  wireRestart();
  subscribeRender();
  populatePicker().then(() => {
    loadScenarioById(els.picker?.value || 'co-parenting-with-bipolar-partner');
  });
})();
