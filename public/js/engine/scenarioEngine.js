// public/js/engine/scenarioEngine.js
export class ScenarioEngine {
  constructor(options = {}) {
    this.opts = {
      storagePrefix: options.storagePrefix || 'amorvia:v2',
      metersConfig: options.metersConfig || null
    };
    this._scenario = null;
    this._act = null;
    this._state = null; // { scenarioId, actId, nodeId, meters, baseline }
    this._subs = new Set();
  }
  subscribe(fn) { this._subs.add(fn); return () => this._subs.delete(fn); }
  _emit() { for (const fn of this._subs) try { fn(this.state); } catch {} }
  get scenario() { return this._scenario; }
  get state() { return this._state; }
  get act() { return this._act; }

  async fetchById(id) {
    const res = await fetch(`/data/${id}.v2.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch scenario ${id}: ${res.status}`);
    return await res.json();
  }
  loadScenario(scenario) {
    if (!scenario || scenario.version !== 2) throw new Error('Unsupported scenario version');
    this._scenario = scenario; return this;
  }
  _defaultMeters() {
    const src = this.opts.metersConfig || this._scenario?.meters || {};
    const base = Object.keys(src).length ? src : {
      tension: { label: 'Tension', start: 20, min: 0, max: 100 },
      trust: { label: 'Trust', start: 50, min: 0, max: 100 },
      childStress: { label: 'Child Stress', start: 10, min: 0, max: 100 }
    };
    const meters = {};
    for (const [key, cfg] of Object.entries(base)) {
      const min = Number.isFinite(cfg.min) ? cfg.min : 0;
      const max = Number.isFinite(cfg.max) ? cfg.max : 100;
      const start = Number.isFinite(cfg.start) ? cfg.start : 50;
      meters[key] = this._clamp(start, min, max);
    }
    return meters;
  }
  _clamp(v, min=0, max=100) { return Math.max(min, Math.min(max, v)); }
  _key(sid, aid) { return `${this.opts.storagePrefix}:${sid}:${aid}`; }
  _loadPersisted(sid, aid) {
    try { return JSON.parse(localStorage.getItem(this._key(sid, aid)) || 'null'); } catch { return null; }
  }
  _save() {
    if (!this._state) return;
    const { scenarioId, actId, nodeId, meters, baseline } = this._state;
    localStorage.setItem(this._key(scenarioId, actId), JSON.stringify({ nodeId, meters, baseline }));
  }
  resetAct() {
    if (!this._state) return;
    localStorage.removeItem(this._key(this._state.scenarioId, this._state.actId));
    this.startAct(this._state.actId, { forceFresh: true });
  }

  startAct(actId, { forceFresh = false } = {}) {
    if (!this._scenario) throw new Error('No scenario loaded');
    const act = this._scenario.acts.find(a => a.id === actId) || this._scenario.acts[0];
    if (!act) throw new Error('Scenario has no acts');
    this._act = act;

    let persisted = !forceFresh && this._loadPersisted(this._scenario.id, act.id);
    const baseline = persisted?.baseline || this._defaultMeters();
    const meters = persisted?.meters || { ...baseline };
    const nodeId = persisted?.nodeId || act.start;

    this._state = { scenarioId: this._scenario.id, actId: act.id, nodeId, meters, baseline };
    this._emit();
    return this.currentNode();
  }

  currentNode() {
    if (!this._state) return null;
    const { nodeId } = this._state;
    if (nodeId === 'end') return { id: 'end', type: 'end' };
    const node = this._act.nodes.find(n => n.id === nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    return node;
  }

  lineNext() {
    const node = this.currentNode();
    if (!node || node.type !== 'line') throw new Error('Not on a line node');
    this._state.nodeId = node.next || 'end';
    this._save(); this._emit();
    return this.currentNode();
  }

  choose(index) {
    const node = this.currentNode();
    if (!node || node.type !== 'choice') throw new Error('Not on a choice node');
    const choice = node.choices[index];
    if (!choice) throw new Error('Invalid choice index');
    if (choice.effects) this.applyEffects(choice.effects);
    this._state.nodeId = choice.to || 'end';
    this._save(); this._emit();
    return this.currentNode();
  }

  goto(targetId) {
    this._state.nodeId = targetId || 'end';
    this._save(); this._emit();
    return this.currentNode();
  }

  applyEffects(effects) {
    const meters = this._state.meters;
    const cfg = (this.opts.metersConfig || this._scenario?.meters) || {};
    for (const [k, delta] of Object.entries(effects || {})) {
      const current = meters[k] ?? 0;
      const min = Number.isFinite(cfg?.[k]?.min) ? cfg[k].min : 0;
      const max = Number.isFinite(cfg?.[k]?.max) ? cfg[k].max : 100;
      meters[k] = this._clamp(current + Number(delta || 0), min, max);
    }
  }

  deltas() {
    const d = {};
    const { meters, baseline } = this._state;
    for (const k of Object.keys(meters)) d[k] = Math.round((meters[k] - (baseline[k] ?? 0)) * 1) / 1;
    return d;
  }
}

export function formatDeltas(d) {
  return Object.entries(d).map(([k, v]) => `${k}${v>=0?'+':''}${v}`).join(' · ');
}
