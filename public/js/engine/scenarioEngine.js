// engine/scenarioEngine.js - with undo() and save slots (ASCII)
export class ScenarioEngine {
  constructor(options = {}) {
    this.opts = { storagePrefix: options.storagePrefix || 'amorvia:v2', metersConfig: options.metersConfig || null };
    this._scenario = null; this._act = null; this._state = null; this._subs = new Set();
    this._history = []; // stack of { nodeId, meters: {...} } before change
  }
  subscribe(fn) { this._subs.add(fn); return () => this._subs.delete(fn); }
  _emit() { for (const fn of this._subs) { try { fn(this.state); } catch(e){} } }
  get scenario() { return this._scenario; } get state() { return this._state; } get act() { return this._act; }

  async fetchById(id) { const r = await fetch('/data/' + id + '.v2.json', { cache: 'no-store' }); if (!r.ok) throw new Error('Failed to fetch ' + id + ': ' + r.status); return r.json(); }
  loadScenario(s) { if (!s || s.version !== 2) throw new Error('Unsupported scenario version'); this._scenario = s; return this; }

  _defaultMeters() {
    const src = this.opts.metersConfig || (this._scenario && this._scenario.meters) || {};
    const base = Object.keys(src).length ? src : { tension:{label:'Tension',start:20}, trust:{label:'Trust',start:50}, childStress:{label:'Child Stress',start:10} };
    const m={}; Object.entries(base).forEach(([k,c])=>{ const min = Number.isFinite(c.min)?c.min:0, max=Number.isFinite(c.max)?c.max:100, st=Number.isFinite(c.start)?c.start:50; m[k]=this._clamp(st,min,max); }); return m;
  }
  _clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  _key(sid,aid){ return this.opts.storagePrefix + ':' + sid + ':' + aid; }
  _save(){ if(!this._state) return; const s=this._state; localStorage.setItem(this._key(s.scenarioId,s.actId), JSON.stringify({ nodeId:s.nodeId, meters:s.meters, baseline:s.baseline })); }
  _loadPersisted(sid,aid){ try { return JSON.parse(localStorage.getItem(this._key(sid,aid)) || 'null'); } catch(e){ return null; } }

  resetAct(){ if(!this._state) return; localStorage.removeItem(this._key(this._state.scenarioId,this._state.actId)); this.startAct(this._state.actId,{forceFresh:true}); }

  startAct(actId,opts={}){
    if(!this._scenario) throw new Error('No scenario loaded');
    const forceFresh=!!opts.forceFresh;
    const act=(this._scenario.acts || []).find(a=>a.id===actId) || (this._scenario.acts||[])[0];
    if(!act) throw new Error('Scenario has no acts');
    this._act=act;
    const persisted = !forceFresh && this._loadPersisted(this._scenario.id, act.id);
    const baseline = (persisted && persisted.baseline) || this._defaultMeters();
    const meters = (persisted && persisted.meters) || Object.assign({}, baseline);
    const nodeId = (persisted && persisted.nodeId) || act.start;
    this._state={ scenarioId:this._scenario.id, actId:act.id, nodeId:nodeId, meters:meters, baseline:baseline };
    this._history = [];
    this._emit(); return this.currentNode();
  }

  currentNode(){
    if(!this._state) return null;
    const id=this._state.nodeId;
    if(id==='end') return { id:'end', type:'end' };
    const n=(this._act.nodes||[]).find(n=>n.id===id);
    if(!n) throw new Error('Node not found: ' + id);
    return n;
  }

  _pushHistory(){
    // Save a snapshot before we mutate
    const snap = { nodeId: this._state.nodeId, meters: JSON.parse(JSON.stringify(this._state.meters || {})) };
    this._history.push(snap);
    if (this._history.length > 50) this._history.shift();
  }

  undo(){
    const prev = this._history.pop();
    if (!prev) return false;
    this._state.nodeId = prev.nodeId;
    this._state.meters = prev.meters;
    this._save(); this._emit(); return true;
  }

  lineNext(){
    const n=this.currentNode(); if(!n || n.type!=='line') throw new Error('Not on a line node');
    this._pushHistory();
    this._state.nodeId = n.next || 'end';
    this._save(); this._emit(); return this.currentNode();
  }

  choose(index){
    const n=this.currentNode(); if(!n || n.type!=='choice') throw new Error('Not on a choice node');
    const c=(n.choices||[])[index]; if(!c) throw new Error('Invalid choice index');
    this._pushHistory();
    if(c.effects) this.applyEffects(c.effects);
    this._state.nodeId = c.to || 'end';
    this._save(); this._emit(); return this.currentNode();
  }

  goto(id){ this._pushHistory(); this._state.nodeId = id || 'end'; this._save(); this._emit(); return this.currentNode(); }

  applyEffects(effects){
    const m=this._state.meters; const cfg=(this.opts.metersConfig || (this._scenario && this._scenario.meters)) || {};
    Object.entries(effects || {}).forEach(([k,d])=>{
      const cur = m[k] == null ? 0 : m[k];
      const min = Number.isFinite(cfg[k] && cfg[k].min) ? cfg[k].min : 0;
      const max = Number.isFinite(cfg[k] && cfg[k].max) ? cfg[k].max : 100;
      m[k] = this._clamp(cur + Number(d || 0), min, max);
    });
  }

  deltas(){ const out={}; const meters=this._state.meters; const baseline=this._state.baseline; Object.keys(meters).forEach((k)=>{ out[k] = Math.round(meters[k] - (baseline[k] == null ? 0 : baseline[k])); }); return out; }

  // ----- Save slots -----
  _slotKey(name){ const s=this._state; return this.opts.storagePrefix + ':slot:' + name + ':' + (s ? s.scenarioId : 'none') + ':' + (s ? s.actId : 'none'); }
  saveSlot(name){
    if (!this._state) return false;
    const data = JSON.stringify(this._state);
    localStorage.setItem(this._slotKey(name), data);
    return true;
  }
  loadSlot(name){
    const key = this._slotKey(name);
    const raw = localStorage.getItem(key); if (!raw) return false;
    const parsed = JSON.parse(raw);
    this._state = parsed;
    this._act = (this._scenario.acts || []).find(a => a.id === parsed.actId) || null;
    this._history = [];
    this._emit(); return true;
  }
  listSlots(prefix){
    const out=[]; const p = this.opts.storagePrefix + ':slot:' + (prefix || '');
    for (let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i); if (k && k.startsWith(p)) out.push(k);
    }
    return out;
  }
}
export function formatDeltas(d){ return Object.entries(d).map(([k,v]) => k + (v>=0?'+':'') + v).join(' - '); }
