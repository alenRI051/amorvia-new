// Lightweight Scenario Engine (drop-in) — ESM module
// API: ScenarioEngine.loadScenario(graph), ScenarioEngine.start(startId)
// Graph shape: { title, startId, nodes: { [id]: { id, text, type?, choices?, to?, next? } } }

const qs = (sel) => document.querySelector(sel);

function setText(el, text) { if (!el) return; el.textContent = text ?? ''; }
function clear(el) { if (!el) return; while (el.firstChild) el.removeChild(el.firstChild); }
function button(label) { const b = document.createElement('button'); b.type = 'button'; b.className = 'button'; b.textContent = label; return b; }

export const ScenarioEngine = {
  state: { title: '', nodes: {}, startId: '', currentId: '', meters: {} },

  loadScenario(graph) {
    if (!graph || !graph.startId || !graph.nodes) { throw new Error('Invalid graph'); }
    this.state.title = graph.title || '';
    this.state.nodes = graph.nodes;
    this.state.startId = graph.startId;
    this.state.currentId = graph.startId;
    this.render();
  },

  start(startId) { if (startId && this.state.nodes[startId]) this.state.currentId = startId; this.render(); },
  currentNode() { return this.state.nodes[this.state.currentId]; },
  goto(id) { if (!this.state.nodes[id]) { console.error('Node not found:', id); return; } this.state.currentId = id; this.render(); },

  applyEffects(effects) {
    if (!effects) return;
    for (const [k, v] of Object.entries(effects)) {
      const cur = Number(this.state.meters[k] ?? 0);
      const next = Math.max(0, Math.min(100, cur + Number(v)));
      this.state.meters[k] = next;
    }
    this.renderHUD();
  },

  renderHUD() {
    const hud = qs('#hud'); if (!hud) return; clear(hud);
    for (const [k, v] of Object.entries(this.state.meters)) {
      const wrap = document.createElement('div'); wrap.className = 'meter row';
      const name = document.createElement('span'); name.textContent = k;
      const val = document.createElement('span'); val.textContent = String(v);
      wrap.appendChild(name); wrap.appendChild(val); hud.appendChild(wrap);
    }
  },

  render() {
    const node = this.currentNode();
    const dialog = qs('#dialog'), choicesEl = qs('#choices'), titleEl = qs('#sceneTitle'), badge = qs('#actBadge');
    if (!node) { setText(dialog, '⚠️ No current node.'); if (choicesEl) clear(choicesEl); return; }
    if (titleEl) setText(titleEl, this.state.title || 'Scenario');
    if (badge) setText(badge, 'Act');

    setText(dialog, node.text || '');
    if (!choicesEl) return;
    clear(choicesEl);

    const type = node.type || (Array.isArray(node.choices) ? 'choice' : (node.to || node.next) ? 'goto' : 'line');

    if (type === 'choice' && Array.isArray(node.choices) && node.choices.length) {
      node.choices.forEach((c, idx) => {
        const btn = button(c.label || `Option ${idx+1}`);
        btn.addEventListener('click', () => { this.applyEffects(c.effects); this.goto(c.to); });
        choicesEl.appendChild(btn);
      });
    } else if (type === 'goto' && node.to) {
      const btn = button('Continue'); btn.addEventListener('click', () => this.goto(node.to)); choicesEl.appendChild(btn);
    } else if (node.next) {
      const btn = button('Continue'); btn.addEventListener('click', () => this.goto(node.next)); choicesEl.appendChild(btn);
    } else if (type === 'end') {
      const done = document.createElement('div'); done.textContent = '— End —'; choicesEl.appendChild(done);
    } else {
      const m = /^a(\d+)s(\d+)$/.exec(node.id || '');
      if (m) {
        const guess = `a${Number(m[1])}s${Number(m[2]) + 1}`;
        if (this.state.nodes[guess]) { const btn = button('Continue'); btn.addEventListener('click', () => this.goto(guess)); choicesEl.appendChild(btn); return; }
      }
      const end = document.createElement('div'); end.textContent = '— End —'; choicesEl.appendChild(end);
    }
  }
};

// Log once even if module gets pulled twice
if (!window.__SE_LOGGED) {
  console.info('[ScenarioEngine] drop-in engine ready');
  window.__SE_LOGGED = true;
}
window.ScenarioEngine = window.ScenarioEngine || ScenarioEngine;
