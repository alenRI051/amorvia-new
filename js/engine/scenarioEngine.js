//// Lightweight Scenario Engine (drop-in) — ESM module
// API: ScenarioEngine.loadScenario(graph), ScenarioEngine.start(startId)

const qs = (sel) => document.querySelector(sel);
const setText = (el, t) => { if (el) el.textContent = t ?? ""; };
const clear = (el) => { if (!el) return; while (el.firstChild) el.removeChild(el.firstChild); };
const btn = (label) => { const b = document.createElement('button'); b.type='button'; b.className='button'; b.textContent=label; return b; };

const getNodeText = (n) =>
  n?.text ?? n?.say ?? n?.line ??
  (n?.content && (n.content.text || n.content.say || n.content.line)) ?? "";

const getChoices = (n) => {
  const cand = n?.choices ?? n?.options ?? n?.actions ?? [];
  return Array.isArray(cand) ? cand : [];
};

const getEffects = (c) => c?.effects ?? c?.vars ?? c?.delta ?? c?.impact ?? null;
const getDest = (c) => c?.goto ?? c?.to ?? c?.next ?? c?.id ?? null;

export const ScenarioEngine = {
  state: { title:"", nodes:{}, startId:"", currentId:"", meters:{} },

  loadScenario(graph){
    if (!graph || !graph.startId || !graph.nodes) throw new Error("Invalid graph");
    this.state.title = graph.title || "";
    this.state.nodes = graph.nodes;
    this.state.startId = graph.startId;
    this.state.currentId = graph.startId;

    // initialize meters from graph.meters (numbers only)
    this.state.meters = {};
    if (graph.meters && typeof graph.meters === 'object') {
      for (const [k, v] of Object.entries(graph.meters)) {
        const n = Math.max(0, Math.min(100, Number(v)));
        this.state.meters[k] = Number.isFinite(n) ? n : 0;
      }
    }

    this.render();
    this.renderHUD(); // draw meters immediately
  },

  start(startId){
    if (startId && this.state.nodes[startId]) this.state.currentId = startId;
    this.render();
  },

  currentNode(){ return this.state.nodes[this.state.currentId]; },

  goto(id){
    if (!this.state.nodes[id]) { console.error("Node not found:", id); return; }
    this.state.currentId = id;
    this.render();
  },

  applyEffects(effects){
    if (!effects) return;
    for (const [k,v] of Object.entries(effects)){
      const cur = Number(this.state.meters[k] ?? 0);
      const next = Math.max(0, Math.min(100, cur + Number(v)));
      this.state.meters[k] = next;
    }
    this.renderHUD();
  },

  renderHUD(){
    const hud = qs('#hud'); if (!hud) return; clear(hud);
    const entries = Object.entries(this.state.meters).sort(([a],[b]) => a.localeCompare(b));
    for (const [k,v] of entries){
      const row = document.createElement('div'); row.className = 'meter row';
      const name = document.createElement('span'); name.textContent = k;
      const val = document.createElement('span'); val.textContent = String(v);
      row.appendChild(name); row.appendChild(val); hud.appendChild(row);
    }
  },

  render(){
    const node = this.currentNode();
    const dialog = qs('#dialog'), choicesEl = qs('#choices'), titleEl = qs('#sceneTitle'), badge = qs('#actBadge');
    if (!node) { setText(dialog, "⚠️ No current node."); if (choicesEl) clear(choicesEl); return; }
    if (titleEl) setText(titleEl, this.state.title || "Scenario");
    if (badge) setText(badge, node.act || "Act");

    // Text
    setText(dialog, getNodeText(node));

    // Choices
    if (!choicesEl) return;
    clear(choicesEl);

    const hasChoices = getChoices(node).length > 0;
    const nodeDest = node.goto ?? node.to ?? node.next;
    const type = hasChoices ? "choice" : nodeDest ? "goto" : (node.type || "line");

    if (type === "choice" && hasChoices){
      getChoices(node).forEach((c, i) => {
        const label = c.label ?? c.text ?? c.title ?? `Option ${i+1}`;
        const b = btn(label);
        b.addEventListener('click', () => {
          this.applyEffects(getEffects(c));
          const dest = getDest(c);
          if (dest) this.goto(dest);
        });
        choicesEl.appendChild(b);
      });
    } else if (nodeDest) {
      const b = btn("Continue");
      b.addEventListener('click', () => this.goto(nodeDest));
      choicesEl.appendChild(b);
    } else {
      // attempt sequential guess aXsY -> aXs(Y+1)
      const m = /^a(\d+)s(\d+)$/.exec(node.id || "");
      if (m){
        const guess = `a${Number(m[1])}s${Number(m[2])+1}`;
        if (this.state.nodes[guess]){
          const b = btn("Continue");
          b.addEventListener('click', () => this.goto(guess));
          choicesEl.appendChild(b);
          return;
        }
      }
      const end = document.createElement('div');
      end.textContent = "— End —";
      choicesEl.appendChild(end);
    }

    // Debug
    if (window?.DEBUG_SCENARIO) console.debug('[ScenarioEngine] node', node);

    // keep HUD synced
    this.renderHUD();
  }
};

if (!window.ScenarioEngine) window.ScenarioEngine = ScenarioEngine;
if (!window.__SCENARIO_ENGINE_READY_LOGGED__) {
  console.info("[ScenarioEngine] drop-in engine ready");
  window.__SCENARIO_ENGINE_READY_LOGGED__ = true;
}
 … paste the HUD-seeding ScenarioEngine version from Nova’s message …
