// Lightweight Scenario Engine (drop-in) — ESM
// Place this file at: /js/engine/scenarioEngine.js
// Exposes window.ScenarioEngine and supports graph { startId, nodes:{ id->{text,type,choices,to,next} } }

const $ = (s) => document.querySelector(s);
const text = (el, t='') => el && (el.textContent = t);
const clear = (el) => { if (!el) return; while (el.firstChild) el.removeChild(el.firstChild); };
const btn = (label) => { const b=document.createElement('button'); b.type='button'; b.className='button'; b.textContent=label; return b; };

export const ScenarioEngine = {
  state: { title:'', nodes:{}, startId:'', currentId:'', meters:{} },

  loadScenario(graph){
    if (!graph?.startId || !graph?.nodes) throw new Error('Invalid graph');
    this.state.title = graph.title || '';
    this.state.nodes = graph.nodes;
    this.state.startId = graph.startId;
    this.state.currentId = graph.startId;
    this.state.meters = { ...(graph.meters || {}) };
    this.render();
  },

  start(startId){ if (startId && this.state.nodes[startId]) this.state.currentId=startId; this.render(); },
  currentNode(){ return this.state.nodes[this.state.currentId]; },
  goto(id){ if (!this.state.nodes[id]) { console.error('Node not found:', id); return; } this.state.currentId=id; this.render(); },

  applyEffects(eff){
    if (!eff) return;
    for (const [k,v] of Object.entries(eff)){
      const cur = Number(this.state.meters[k] ?? 0);
      const nxt = Math.max(0, Math.min(100, cur + Number(v)));
      this.state.meters[k] = nxt;
    }
    this.renderHUD();
  },

  renderHUD(){
    const hud = $('#hud'); if (!hud) return; clear(hud);
    for (const [k,v] of Object.entries(this.state.meters)){
      const row = document.createElement('div'); row.className='meter row';
      const a = document.createElement('span'); a.textContent=k;
      const b = document.createElement('span'); b.textContent=String(v);
      row.append(a,b); hud.appendChild(row);
    }
  },

  render(){
    const node = this.currentNode();
    const dialog = $('#dialog'), choices = $('#choices'), titleEl = $('#sceneTitle'), badge=$('#actBadge');
    if (!node){ text(dialog,'⚠️ No current node.'); if (choices) clear(choices); return; }

    text(titleEl, this.state.title || 'Scenario');
    text(badge, 'Act');

    text(dialog, node.text || '');
    if (!choices) return;
    clear(choices);

    const type = node.type || (Array.isArray(node.choices) ? 'choice' : (node.to||node.next) ? 'goto' : 'line');

    if (type==='choice' && node.choices?.length){
      node.choices.forEach((c,i)=>{
        const b = btn(c.label || `Option ${i+1}`);
        b.addEventListener('click', ()=>{ this.applyEffects(c.effects); this.goto(c.to); });
        choices.appendChild(b);
      });
    } else if (type==='goto' && node.to){
      const b = btn('Continue'); b.addEventListener('click', ()=>this.goto(node.to)); choices.appendChild(b);
    } else if (node.next){
      const b = btn('Continue'); b.addEventListener('click', ()=>this.goto(node.next)); choices.appendChild(b);
    } else if (type==='end'){
      const d = document.createElement('div'); d.textContent='— End —'; choices.appendChild(d);
    } else {
      const m = /^a(\d+)s(\d+)$/.exec(node.id||''); // fallback sequential
      if (m){ const guess=`a${Number(m[1])}s${Number(m[2])+1}`; if (this.state.nodes[guess]){ const b=btn('Continue'); b.addEventListener('click', ()=>this.goto(guess)); choices.appendChild(b); return; } }
      const d = document.createElement('div'); d.textContent='— End —'; choices.appendChild(d);
    }
  }
};

// expose
window.ScenarioEngine = ScenarioEngine;
console.info('[ScenarioEngine] drop-in engine ready at /js/engine/scenarioEngine.js');
