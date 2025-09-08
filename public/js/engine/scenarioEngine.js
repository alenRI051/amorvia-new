// Lightweight Scenario Engine (drop-in)
const qs = (sel) => document.querySelector(sel);
const setText = (el, t) => { if (el) el.textContent = t ?? ""; };
const clear = (el) => { if (!el) return; while (el.firstChild) el.removeChild(el.firstChild); };
const btn = (label) => { const b = document.createElement('button'); b.type='button'; b.className='button'; b.textContent=label; return b; };

const getNodeText = (n) => n?.text ?? n?.say ?? n?.line ?? (n?.content && (n.content.text || n.content.say || n.content.line)) ?? "";
const getChoices = (n) => Array.isArray(n?.choices ?? n?.options ?? n?.actions) ? (n.choices||n.options||n.actions) : [];
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
    this.state.meters = {};
    if (graph.meters) for (const [k,v] of Object.entries(graph.meters)) {
      const raw = typeof v === 'number' ? v : (v && typeof v.start==='number'? v.start:0);
      this.state.meters[k] = Math.max(0, Math.min(100, Number(raw)));
    }
    this.render(); this.renderHUD();
  },
  start(id){ if (id && this.state.nodes[id]) this.state.currentId=id; this.render(); },
  currentNode(){ return this.state.nodes[this.state.currentId]; },
  goto(id){ if (!this.state.nodes[id]) return; this.state.currentId=id; this.render(); },
  applyEffects(e){ if(!e)return; for(const[k,v]of Object.entries(e)){this.state.meters[k]=Math.max(0,Math.min(100,(this.state.meters[k]||0)+Number(v)));} this.renderHUD(); },
  renderHUD(){ const hud=qs('#hud'); if(!hud)return; clear(hud); for(const[k,v] of Object.entries(this.state.meters)){const row=document.createElement('div'); row.className='meter row'; row.appendChild(Object.assign(document.createElement('span'),{textContent:k})); row.appendChild(Object.assign(document.createElement('span'),{textContent:String(v)})); hud.appendChild(row);} },
  render(){
    const node=this.currentNode();
    const dialog=qs('#dialog'), choicesEl=qs('#choices'), titleEl=qs('#sceneTitle'), badge=qs('#actBadge');
    if(!node){ setText(dialog,"⚠️ No current node."); if(choicesEl)clear(choicesEl); this.renderHUD(); return; }
    if(titleEl)setText(titleEl,this.state.title); if(badge)setText(badge,node.act||"Act");
    setText(dialog,getNodeText(node));
    if(choicesEl){ clear(choicesEl);
      const hasChoices=getChoices(node).length>0, nodeDest=node.goto??node.to??node.next, type=hasChoices?"choice":nodeDest?"goto":(node.type||"line");
      if(type==="choice"){ getChoices(node).forEach((c,i)=>{const b=btn(c.label??c.text??`Option ${i+1}`); b.onclick=()=>{this.applyEffects(getEffects(c)); if(getDest(c))this.goto(getDest(c));}; choicesEl.appendChild(b);}); }
      else if(nodeDest){ const b=btn("Continue"); b.onclick=()=>this.goto(nodeDest); choicesEl.appendChild(b); }
      else { const m=/^a(\d+)s(\d+)$/.exec(node.id||""); if(m){const guess=`a${+m[1]}s${+m[2]+1}`; if(this.state.nodes[guess]){const b=btn("Continue"); b.onclick=()=>this.goto(guess); choicesEl.appendChild(b); this.renderHUD(); return;} } choicesEl.appendChild(Object.assign(document.createElement('div'),{textContent:"— End —"})); }
    }
    this.renderHUD();
  }
};
if(!window.ScenarioEngine) window.ScenarioEngine=ScenarioEngine;
if(!window.__SCENARIO_ENGINE_READY_LOGGED__){console.info("[ScenarioEngine] drop-in engine ready");window.__SCENARIO_ENGINE_READY_LOGGED__=true;}
