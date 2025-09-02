// Lightweight Scenario Engine ESM
const qs = (s)=>document.querySelector(s);
function setText(el,t){ if(el) el.textContent = t ?? ''; }
function clear(el){ if(!el) return; while(el.firstChild) el.removeChild(el.firstChild); }
function btn(label){ const b=document.createElement('button'); b.className='button'; b.type='button'; b.textContent=label; return b; }

export const ScenarioEngine = {
  state:{ title:'', nodes:{}, startId:'', currentId:'', meters:{} },
  loadScenario(graph){
    if(!graph||!graph.startId||!graph.nodes) throw new Error('Invalid graph');
    this.state.title=graph.title||''; this.state.nodes=graph.nodes; this.state.startId=graph.startId; this.state.currentId=graph.startId;
    this.render();
  },
  start(id){ if(id && this.state.nodes[id]) this.state.currentId=id; this.render(); },
  currentNode(){ return this.state.nodes[this.state.currentId]; },
  goto(id){ if(!this.state.nodes[id]){ console.warn('Node not found',id); return; } this.state.currentId=id; this.render(); },
  renderHUD(){ const hud=qs('#hud'); if(!hud) return; clear(hud); for(const [k,v] of Object.entries(this.state.meters)){ const d=document.createElement('div'); d.textContent=`${k}: ${v}`; hud.appendChild(d);} },
  render(){
    const node=this.currentNode(); const dialog=qs('#dialog'), choices=qs('#choices'), titleEl=qs('#sceneTitle'), badge=qs('#actBadge');
    if(!node){ setText(dialog, '⚠️ No current node.'); clear(choices); return; }
    setText(titleEl,this.state.title||'Scenario'); setText(badge,'Act');
    setText(dialog,node.text||'');
    if(!choices) return; clear(choices);
    const type=node.type || (Array.isArray(node.choices)?'choice':(node.to||node.next)?'goto':'line');
    if(type==='choice' && node.choices?.length){
      node.choices.forEach((c,i)=>{ const b=btn(c.label||`Option ${i+1}`); b.onclick=()=>this.goto(c.to); choices.appendChild(b); });
    }else if(type==='goto' && node.to){ const b=btn('Continue'); b.onclick=()=>this.goto(node.to); choices.appendChild(b); }
    else if(node.next){ const b=btn('Continue'); b.onclick=()=>this.goto(node.next); choices.appendChild(b); }
    else { const end=document.createElement('div'); end.textContent='— End —'; choices.appendChild(end); }
  }
};
window.ScenarioEngine = ScenarioEngine;
console.info('[ScenarioEngine] ready');
