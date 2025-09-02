// /js/app.v2.js — loader sig v2025-09-02-fallback
import * as conv from '/js/compat/v2-to-graph.js';

// --- robust inline fallback converter ---
function safeEnsureGraph(v2) {
  // try shipped converter first
  try {
    const fn = conv.ensureGraph || conv.toGraph;
    const g1 = fn ? fn(v2) : null;
    if (g1?.startId && g1.nodes?.[g1.startId]) return g1;
  } catch {}

  // fallback: ultra-robust converter (acts + steps -> nodes with aNsM ids)
  function isArr(a){ return Array.isArray(a); }
  function stepId(ai, si){ return `a${ai}s${si}`; }
  const acts = isArr(v2?.acts) ? v2.acts : [];
  const nodes = {};
  const nonEmpty = acts.map((a,i)=>({i:i+1,len:(a?.steps?.length||0)})).filter(x=>x.len>0);

  if (nonEmpty.length===0) {
    nodes.END = { id:'END', type:'end', text:'— End —' };
    return { title: v2?.title || v2?.id || 'Scenario', startId:'END', nodes };
  }
  const startId = stepId(nonEmpty[0].i, 1);

  function nextOf(ai, si){
    const steps = acts[ai-1]?.steps || [];
    if (si < steps.length) return stepId(ai, si+1);
    const idx = nonEmpty.findIndex(x=>x.i===ai);
    return nonEmpty[idx+1] ? stepId(nonEmpty[idx+1].i, 1) : 'END';
  }

  for (let ai=1; ai<=acts.length; ai++){
    const act = acts[ai-1]; const steps = act?.steps||[]; if (!steps.length) continue;
    for (let si=1; si<=steps.length; si++){
      const id = stepId(ai, si); const s = steps[si-1];
      if (typeof s === 'string'){ nodes[id] = { id, text:s, next:nextOf(ai,si) }; continue; }
      if (s && typeof s==='object' && isArr(s.choices) && s.choices.length){
        nodes[id] = {
          id, type:'choice', text: s.prompt || '',
          choices: s.choices.map((c,idx)=>({
            label: c?.label ?? `Option ${idx+1}`,
            effects: c?.effects || undefined,
            to: c?.to || nextOf(ai,si)
          }))
        };
        continue;
      }
      const text = s?.text ?? s?.prompt ?? '';
      nodes[id] = { id, text: String(text), next: nextOf(ai,si) };
    }
  }
  if (!nodes.END) nodes.END = { id:'END', type:'end', text:'— End —' };
  return { title: v2?.title || v2?.id || 'Scenario', startId, nodes };
}

// --- engine loader (unchanged) ---
async function getEngine(){
  if (window.ScenarioEngine) return window.ScenarioEngine;
  const paths = [
    '/js/engine/scenarioEngine.js',
    '/js/engine/scenario-engine.js',
    '/js/engine/ScenarioEngine.js',
    '/js/scenarioEngine.js',
    '/js/ScenarioEngine.js',
    '/engine/scenarioEngine.js',
    '/engine/ScenarioEngine.js',
    '/scenarioEngine.js'
  ];
  let lastErr;
  for (const p of paths) {
    try {
      const m = await import(p + '?v=' + Date.now());
      const E = window.ScenarioEngine || m.ScenarioEngine || m.engine || m.default;
      if (E && (E.loadScenario || E.start || E.startAct)) { window.ScenarioEngine = E; return E; }
    } catch(e){ lastErr=e; }
  }
  console.error('[v2] Engine load failed:', lastErr);
  throw new Error('engine missing');
}

export async function loadScenarioById(id){
  const raw = await fetch(`/data/${id}.v2.json?ts=${Date.now()}`, {cache:'no-store'}).then(r=>{
    if(!r.ok) throw new Error('HTTP '+r.status+' '+r.url); return r.json();
  });
  const g = safeEnsureGraph(raw);
  const E = await getEngine();
  E.loadScenario?.(g);
  (E.start?.(g.startId)) ?? (E.startAct?.(0));
}

export async function init(){
  const pick = document.getElementById('scenarioPicker');
  if (pick && !pick.options.length) {
    try {
      const idx = await fetch('/data/v2-index.json?ts='+Date.now(), {cache:'no-store'}).then(r=>r.json());
      for (const s of (idx.scenarios||[])) {
        const o = document.createElement('option'); o.value=s.id; o.textContent=s.title||s.id; pick.appendChild(o);
      }
    } catch(e){ console.warn('[v2] index load failed', e); }
  }
  pick?.addEventListener('change', ()=>loadScenarioById(pick.value));
  if (pick?.value) loadScenarioById(pick.value);
  window.AmorviaV2 = Object.assign(window.AmorviaV2||{}, { loadScenarioById });
}

init().catch(console.error);

