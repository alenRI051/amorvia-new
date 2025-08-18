// app.v2.js - v2 UI with Undo and Save/Load Modal + metrics
import { ScenarioEngine, formatDeltas } from './engine/scenarioEngine.js';
import { track } from './metrics.js';

// Inject minimal modal CSS so no extra file is needed
(function(){
  const css = [
    '#saveModalBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;z-index:9998}',
    '#saveModal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#0f172a;color:#e5e7eb;border:1px solid #1f2937;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);padding:16px;min-width:280px;z-index:9999}',
    '#saveModal h3{margin:0 0 8px 0;font-size:16px}',
    '#saveModal .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}',
    '#saveModal input[type=text]{flex:1;min-width:160px;padding:6px 8px;background:#0b1220;border:1px solid #334155;border-radius:8px;color:#e5e7eb}',
    '#saveModal .list{max-height:160px;overflow:auto;margin-top:8px;border:1px solid #203047;border-radius:10px;padding:8px}',
    '#saveModal .pill{display:inline-flex;gap:6px;align-items:center;margin:4px;padding:4px 8px;border:1px solid #334155;border-radius:999px;background:#111827;cursor:pointer}',
    '#saveModal .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}',
    '#saveModal .btn{padding:6px 10px;border-radius:8px;border:1px solid #334155;background:#111827;color:#e5e7eb;cursor:pointer}',
    '#saveModal .btn.primary{border-color:#2563eb}'
  ].join('\n');
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
})();

function $(s){ return document.querySelector(s); }

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
['change'].forEach((evt) => {
  els.leftSel && els.leftSel.addEventListener(evt, applyCharAndBg);
  els.rightSel && els.rightSel.addEventListener(evt, applyCharAndBg);
  els.bgSel && els.bgSel.addEventListener(evt, applyCharAndBg);
});

const eng = new ScenarioEngine();

// ----- Save/Load Modal -----
function parseSlotKey(k){
  // format: prefix:slot:name:scenarioId:actId
  const parts = k.split(':');
  const idx = parts.indexOf('slot');
  if (idx >= 0 && parts[idx+1]) return parts[idx+1];
  return k;
}
function ensureModal(){
  if (document.getElementById('saveModalBackdrop')) return;
  const backdrop = document.createElement('div'); backdrop.id = 'saveModalBackdrop'; backdrop.setAttribute('role','presentation');
  const modal = document.createElement('div'); modal.id = 'saveModal'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
  modal.innerHTML = [
    '<h3>Manage Saves</h3>',
    '<div class="row"><input id="slotName" type="text" placeholder="slot name (e.g., slot1)"><button id="doSave" class="btn primary" type="button">Save</button></div>',
    '<div class="list" id="slotList" aria-label="Saved Slots"></div>',
    '<div class="actions"><button id="closeSave" class="btn" type="button">Close</button></div>'
  ].join('');
  document.body.append(backdrop, modal);
  document.getElementById('closeSave').addEventListener('click', hideModal);
  document.getElementById('doSave').addEventListener('click', () => {
    const name = String(document.getElementById('slotName').value || '').trim();
    if (!name) return;
    eng.saveSlot(name);
    track('save_slot', { name });
    refreshSlots();
  });
  backdrop.addEventListener('click', hideModal);
}
function showModal(){ ensureModal(); document.getElementById('saveModalBackdrop').style.display = 'block'; document.getElementById('saveModal').style.display = 'block'; refreshSlots(); }
function hideModal(){ const b = document.getElementById('saveModalBackdrop'); const m = document.getElementById('saveModal'); if (b) b.style.display='none'; if (m) m.style.display='none'; }
function refreshSlots(){
  const wrap = document.getElementById('slotList'); if (!wrap) return;
  wrap.innerHTML = '';
  const keys = eng.listSlots('');
  if (!keys.length){ wrap.textContent = 'No saves yet.'; return; }
  keys.forEach(k => {
    const pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'pill';
    const name = parseSlotKey(k);
    pill.textContent = name;
    pill.addEventListener('click', () => {
      if (eng.loadSlot(name)) {
        track('load_slot', { name });
        hideModal();
        renderNode();
      }
    });
    wrap.appendChild(pill);
  });
}

function ensureTopBarControls(){
  if (!document.getElementById('undoBtn')) {
    const btn = document.createElement('button');
    btn.id = 'undoBtn'; btn.className = 'button'; btn.textContent = 'Undo';
    btn.addEventListener('click', () => { if (!eng.undo()) btn.disabled = true; });
    els.choices.parentElement && els.choices.parentElement.insertBefore(btn, els.choices);
  }
  if (!document.getElementById('savesBtn')) {
    const b = document.createElement('button');
    b.id = 'savesBtn'; b.className = 'button'; b.textContent = 'Saves';
    b.addEventListener('click', () => showModal());
    els.choices.parentElement && els.choices.parentElement.insertBefore(b, els.choices);
  }
}

function renderHUD() {
  const st = eng.state; if (!st) return;
  const cfg = (eng.scenario && eng.scenario.meters) || {
    tension: { label: 'Tension' },
    trust: { label: 'Trust' },
    childStress: { label: 'Child Stress' }
  };
  els.hud.innerHTML = '';
  const frag = document.createDocumentFragment();
  Object.entries(st.meters || {}).forEach(([k, v]) => {
    const meter = document.createElement('div'); meter.className = 'meter';
    const dot = document.createElement('span'); dot.className = 'dot';
    const label = document.createElement('span'); label.className = 'label'; label.textContent = (cfg[k] && cfg[k].label) || k;
    const val = document.createElement('span'); val.className = 'value'; val.textContent = String(Math.round(v));
    meter.append(dot, label, val); frag.appendChild(meter);
  });
  els.hud.appendChild(frag);
}

function mdLite(s) { return String(s || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

function renderNode() {
  ensureTopBarControls();
  const node = eng.currentNode();
  const act = eng.act;
  if (!node || !act) return;

  const acts = eng.scenario.acts || [];
  const idx = acts.findIndex((a) => a.id === act.id);
  els.actBadge.textContent = 'Act ' + (idx + 1) + ' of ' + acts.length;
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
    btn.addEventListener('click', () => { eng.lineNext(); track('line_next', { nodeId: node.id }); });
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
      b.innerHTML = '<span class="kbd">[' + (i + 1) + ']</span> ' + c.label;
      b.addEventListener('click', () => { eng.choose(i); track('choice_made', { nodeId: node.id, index: i, label: c.label }); });
      els.choices.appendChild(b);
      if (i === 0) b.focus();
    });
  } else if (node.type === 'end') {
    const deltas = eng.deltas();
    const p = document.createElement('p');
    p.className = 'summary';
    p.textContent = 'Act finished - ' + formatDeltas(deltas);
    els.dialog.appendChild(p);

    const retry = document.createElement('button');
    retry.className = 'button'; retry.textContent = 'Retry Act';
    retry.addEventListener('click', () => eng.resetAct());
    els.choices.appendChild(retry);

    const acts2 = eng.scenario.acts || [];
    const idx2 = acts2.findIndex((a) => a.id === eng.state.actId);
    if (idx2 >= 0 && idx2 < acts2.length - 1) {
      const next = document.createElement('button');
      next.className = 'button'; next.textContent = 'Next Act';
      next.addEventListener('click', () => { eng.startAct(acts2[idx2 + 1].id, { forceFresh: true }); track('act_next', { actId: acts2[idx2 + 1].id }); });
      els.choices.appendChild(next);
    }
    retry.focus();
    track('act_end', { deltas });
  }
  renderHUD();
}

function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    const node = eng.currentNode(); if (!node) return;
    if (node.type === 'choice') {
      const num = parseInt(e.key, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= ((node.choices && node.choices.length) || 0)) {
        e.preventDefault(); eng.choose(num - 1); track('choice_made_key', { index: num - 1 });
      }
    } else if (node.type === 'line') {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); eng.lineNext(); track('line_next_key', {}); }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
      e.preventDefault(); eng.undo();
    }
  });
}

async function populatePicker() {
  try {
    const res = await fetch('/data/v2-index.json', { cache: 'no-store' });
    const idx = await res.json();
    els.picker.innerHTML = '';
    (idx.scenarios || []).forEach((s) => {
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
  track('scenario_start', { id: s.id, title: s.title });
}

function wireScenarioPicker() {
  if (els.picker) {
    els.picker.addEventListener('change', async () => {
      await loadScenarioById(els.picker.value);
    });
  }
}

function wireRestart() { els.restart && els.restart.addEventListener('click', () => eng.resetAct()); }
function subscribeRender() { eng.subscribe(() => { try { renderNode(); } catch (e) { console.error(e); } }); }

(function init(){
  applyCharAndBg();
  wireKeyboard();
  wireScenarioPicker();
  wireRestart();
  subscribeRender();
  populatePicker().then(() => {
    loadScenarioById((els.picker && els.picker.value) || 'co-parenting-with-bipolar-partner');
  });
})();
