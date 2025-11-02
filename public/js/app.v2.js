/*
 * Amorvia — app.v2.js (Continuum Fix v9.7.2p+ FINAL)
 * ES2019-safe • Non-blocking boot • Robust scenario picker • Persistence
 */

(() => {
  const CONFIG = {
    indexPath: "/data/v2-index.json",
    meters: ["trust", "tension", "childStress"],
    startNodeCandidates: ["start", "intro", "act1-start", "act-1-start"],
    noStore: true,
    debug: true,
  };

  const log  = (...a) => CONFIG.debug && console.log("[Amorvia]", ...a);
  const warn = (...a) => console.warn("[Amorvia]", ...a);
  const err  = (...a) => console.error("[Amorvia]", ...a);

  // ---- Persistence helpers ----
  const STORAGE_KEYS = { lastScenario: "amorvia:lastScenarioId" };
  function getStoredScenarioId(){ try { return localStorage.getItem(STORAGE_KEYS.lastScenario) || null; } catch(_) { return null; } }
  function setStoredScenarioId(id){ try { if(id) localStorage.setItem(STORAGE_KEYS.lastScenario, id); } catch(_) {} }
  function readUrlScenario(){ try { const u=new URL(location.href); return u.searchParams.get('scenario'); } catch(_) { return null; } }

  // ---------- Fetch (no-store + cache-bust) ----------
  async function fetchJSON(url, opts = {}) {
    const o = { ...opts };
    o.headers = { ...(opts.headers || {}) };
    if (CONFIG.noStore) {
      o.cache = "no-store";
      o.headers["Cache-Control"] = "no-store, max-age=0";
      try {
        const u = new URL(url, location.origin);
        u.searchParams.set("v", String(Date.now()));
        url = u.toString();
      } catch (e) { /* ignore for relative URLs */ }
    }
    const r = await fetch(url, o);
    if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
    return r.json();
  }

  // ---------- Engine wait (non-blocking) ----------
  async function waitForEngine(ms = 1500) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      const e = window.ScenarioEngine || window.engine || window.E;
      if (e && (e.loadScenario || e.LoadScenario) && e.start) return e;
      await new Promise(r => setTimeout(r, 50));
    }
    warn("ScenarioEngine not found within timeout (non-fatal). Proceeding without it.");
    return null;
  }

  // ---------- Resolve scenario path ----------
  async function resolveScenarioPathById(id) {
    try {
      const idx = await fetchJSON(CONFIG.indexPath);
      const entries = Array.isArray(idx) ? idx
                    : Array.isArray(idx?.entries) ? idx.entries
                    : Array.isArray(idx?.items) ? idx.items
                    : Array.isArray(idx?.list) ? idx.list
                    : Array.isArray(idx?.scenarios) ? idx.scenarios
                    : [];
      const hit = entries.find(x => {
        if (typeof x === "string") return x === id;
        return x && (x.id === id || x.slug === id || x.key === id || x.name === id);
      });
      if (hit) {
        if (typeof hit === "string") return `/data/${hit}.v2.json`;
        if (hit.path) return hit.path;
      }
    } catch (e) {
      warn("Index read failed, will use default path.", e);
    }
    return `/data/${id}.v2.json`;
  }

  // ---------- Shape guards / normalization ----------
  const isGraph = x => x && (Array.isArray(x.nodes) || Array.isArray(x.graph) || (x.nodes && typeof x.nodes === "object")) && x.version !== 2;
  const isV2    = x => x && (x.version === 2 || x.schemaVersion === 2 || x.meters || x.acts);

  function flatten(raw){
    const out=[];
    if(Array.isArray(raw.nodes)) return raw.nodes.slice();
    if(Array.isArray(raw.acts)){
      raw.acts.forEach((a,i)=>{
        if(Array.isArray(a.nodes)) a.nodes.forEach(n=>out.push({...n,_actIndex:i}));
        else if(Array.isArray(a.steps)) a.steps.forEach((s,j)=>out.push({id:s.id||`act${i+1}-step${j+1}`,type:s.type||'dialog',text:s.text||s.label||s.title||'',choices:s.choices||[],goto:s.goto,_actIndex:i}));
      });
    }
    return out;
  }

  function addChoiceHints(c){
    const eff=c.effects||c.meters||{};const parts=[];
    for(const m of CONFIG.meters){const v=eff[m];if(typeof v==='number'&&v!==0) parts.push(`${v>0?'+':''}${v} ${m}`)}
    if(parts.length){const hint=` [${parts.join(' / ')}]`;const base=c.label||c.text||'';c.label=base+hint;}
    return c;
  }

  function normalize(raw){
    let list=[];
    if(isV2(raw)) list=flatten(raw);
    else if(isGraph(raw)) list = Array.isArray(raw.nodes) ? raw.nodes.slice()
                            : Array.isArray(raw.graph) ? raw.graph.slice()
                            : Object.values(raw.nodes||{});
    const map=new Map();
    for(const n of list){
      if(!n||!n.id) continue;
      if(!Array.isArray(n.choices)) n.choices=[];
      n.choices=n.choices.map(x=>addChoiceHints({...x}));
      map.set(n.id,n);
    }
    return{list,map};
  }

  // ---------- Start node helpers ----------
  function findStart(nodes,raw){
    const byId=new Map(nodes.map(n=>[n.id,n]));
    if(raw&&raw.startNode&&byId.has(raw.startNode)) return raw.startNode;
    for(const c of CONFIG.startNodeCandidates) if(byId.has(c)) return c;
    for(const n of nodes){
      const isEnd = /end\s*of\s*act/i.test(n.title||n.label||n.text||"") || /end/i.test(n.type||"");
      const hasText = n.text && n.text.trim().length>0;
      if(!isEnd && (n.type==='dialog'||hasText)) return n.id;
    }
    return nodes[0]?nodes[0].id:null;
  }
  function isActEndNode(n){ if(!n) return false; if(/end\s*of\s*act/i.test(n.title||n.label||n.text||"")) return true; if(n.type&&/actEnd|end/i.test(n.type)) return true; return false; }
  function nextActStartId(nodes,i){ const t=i+1; for(const n of nodes){ if(n._actIndex===t && (/^act\d+-start$/i.test(n.id)||/start/i.test(n.id))) return n.id; } for(const n of nodes){ if(n._actIndex===t) return n.id; } return null; }

  // ---------- HUD ----------
  function animateBar(el,to,ms=350){ if(!el) return; const from=parseFloat(el.dataset.value||'0'); const target=Math.max(0,Math.min(100,to)); const start=performance.now(); function step(ts){ const k=Math.min(1,(ts-start)/ms); const v=from+(target-from)*k; el.style.width=v+'%'; el.dataset.value=String(v); if(k<1) requestAnimationFrame(step);} requestAnimationFrame(step); }
  function updateHUD(state){ try{ const m=state.meters||{}; for(const k of CONFIG.meters){ const val=typeof m[k]==='number'?m[k]:0; animateBar(document.querySelector(`[data-meter="${k}"] .bar`), Math.max(0,Math.min(100,val))); const label=document.querySelector(`[data-meter="${k}"] .value`); if(label) label.textContent=String(val);} const txt=state.actIndex!=null?`Act ${state.actIndex+1}`:'Act -'; const el1=document.querySelector('[data-hud=act]'); const el2=document.querySelector('#actBadge'); if(el1) el1.textContent=txt; if(el2) el2.textContent=txt; }catch(e){ warn('HUD update skipped:',e);} }

  // ---------- Driver ----------
  function buildState(nodes,startId,raw){ const base={}; for(const m of CONFIG.meters) base[m]=0; return { nodes, byId:new Map(nodes.map(n=>[n.id,n])), currentId:startId, actIndex:(nodes.find(n=>n.id===startId)?._actIndex)||0, meters:{...base,...(raw&&raw.meters?raw.meters:{})}, history:[] }; }
  function applyEffects(state,choice){ const eff=choice.effects||choice.meters||{}; for(const k of CONFIG.meters){ if(typeof eff[k]==='number') state.meters[k]=(state.meters[k]||0)+eff[k]; } }
  function gotoNode(state,id){ if(!state.byId.has(id)){ warn('goto unknown node:',id); return false; } state.history.push(state.currentId); state.currentId=id; const node=state.byId.get(id); if(node&&node._actIndex!=null) state.actIndex=node._actIndex; return true; }
  function renderNode(node){ const dialogEl=document.querySelector('[data-ui=dialog]')||document.querySelector('#dialog'); const speakerEl=document.querySelector('[data-ui=speaker]')||document.querySelector('#sceneTitle'); const choicesEl=document.querySelector('[data-ui=choices]')||document.querySelector('#choices'); if(dialogEl) dialogEl.textContent=node.text||node.label||node.title||''; if(speakerEl) speakerEl.textContent=node.speaker||node.role||node.actor||node.title||''; if(choicesEl){ choicesEl.innerHTML=''; if(Array.isArray(node.choices)&&node.choices.length){ for(const c of node.choices){ const btn=document.createElement('button'); btn.className='choice'; btn.textContent=c.label||c.text||'Continue'; btn.addEventListener('click',()=>window.__amorvia_onChoice(c)); choicesEl.appendChild(btn);} } else { const btn=document.createElement('button'); btn.className='choice solo'; btn.textContent='Continue'; btn.addEventListener('click',()=>window.__amorvia_onChoice({goto:node.goto})); choicesEl.appendChild(btn);} } }
  window.__amorvia_renderNode = renderNode;
  function computeNextId(state,node,choice){ const pick=x=>typeof x==='string'&&x.trim().length?x.trim():null; const fromChoice=pick(choice&&(choice.goto||choice.target)); if(fromChoice) return fromChoice; const fromNode=pick(node&&(node.goto||node.next)); if(fromNode) return fromNode; if(isActEndNode(node)){ const nid=nextActStartId(state.nodes,node._actIndex); if(nid) return nid; } const idx=state.nodes.findIndex(n=>n.id===node.id); if(idx>=0 && idx+1<state.nodes.length){ const cand=state.nodes[idx+1]; if(!cand._actIndex || cand._actIndex===node._actIndex) return cand.id; } return null; }

  // ---------- Scenario picker ----------
  function titleFromId(id){ return (id||'').replace(/[-_]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase()).trim(); }
  async function populateScenarioPicker(currentId){
    const sel=document.getElementById('scenarioPicker'); if(!sel) return;
    sel.innerHTML='<option disabled>Loading…</option>'; sel.disabled=true;
    const storedId = getStoredScenarioId();
    const fallbackList=[
      {id:'dating-after-breakup-with-child-involved', title:'Dating After Breakup (With Child)'},
      {id:'co-parenting-with-bipolar-partner',        title:'Co-parenting With Bipolar Partner'},
      {id:'visitor',                                  title:'Visitor'}
    ];
    try{
      const idx=await fetchJSON(CONFIG.indexPath);
      const rawEntries = Array.isArray(idx)?idx
        : Array.isArray(idx?.entries)?idx.entries
        : Array.isArray(idx?.items)?idx.items
        : Array.isArray(idx?.list)?idx.list
        : Array.isArray(idx?.scenarios)?idx.scenarios
        : [];
      let items = rawEntries.map(x=>{
        if(typeof x==='string') return {id:x,title:titleFromId(x),path:`/data/${x}.v2.json`};
        const id=x.id||x.slug||x.key||(typeof x.name==='string'?x.name.toLowerCase().replace(/\s+/g,'-'):undefined);
        const path=x.path||x.url||(id?`/data/${id}.v2.json`:undefined);
        const title=x.title||x.name||titleFromId(id);
        return id?{id,title,path}:null;
      }).filter(Boolean);
      if(!items.length){ items=fallbackList; warn('[Amorvia] v2-index.json had no usable entries; using fallback list.'); }
      sel.innerHTML='';
      for(const it of items.sort((a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base'}))){
        const opt=document.createElement('option'); opt.value=it.id; opt.textContent=it.title; sel.appendChild(opt);
      }
      const wanted = currentId || readUrlScenario() || storedId || window.__SCENARIO_ID__ || items[0]?.id;
      if(wanted) sel.value=wanted;
      sel.disabled=false;
      sel.onchange=()=>{ const id=sel.value; try{ window.__SCENARIO_ID__=id; }catch(_){} setStoredScenarioId(id); const d=document.querySelector('#dialog')||document.querySelector('[data-ui=dialog]'); const c=document.querySelector('#choices')||document.querySelector('[data-ui=choices]'); if(d)d.textContent='Loading…'; if(c)c.innerHTML=''; boot(id); };
    }catch(e){
      warn('Failed to populate scenario picker; using fallback list.',e);
      sel.innerHTML=''; for(const it of fallbackList){ const opt=document.createElement('option'); opt.value=it.id; opt.textContent=it.title; sel.appendChild(opt);} const wanted=currentId||readUrlScenario()||storedId||fallbackList[0].id; sel.value=wanted; sel.disabled=false; sel.onchange=()=>{ const id=sel.value; try{ window.__SCENARIO_ID__=id; }catch(_){} setStoredScenarioId(id); boot(id); };
    }
  }

  // ---------- Boot ----------
  async function boot(defaultScenarioId){
    try{
      const engine = await waitForEngine(); // may be null
      let scenarioId = defaultScenarioId || readUrlScenario() || getStoredScenarioId() || window.__SCENARIO_ID__ || 'dating-after-breakup-with-child-involved';
      const path = await resolveScenarioPathById(scenarioId);
      log('Loading scenario:',scenarioId,'->',path);
      const raw = await fetchJSON(path);
      const {list:nodes} = normalize(raw);
      if(!nodes.length) throw new Error('Scenario has no nodes after normalization');
      const startId = findStart(nodes, raw);
      if(!startId) throw new Error('Unable to find a start node');
      const state = buildState(nodes, startId, raw);
      window.__amorvia_state = state;
      window.__amorvia_onChoice = (choice)=>{
        const s=window.__amorvia_state; const cur=s.byId.get(s.currentId);
        applyEffects(s, choice||{}); updateHUD(s);
        const nextId=computeNextId(s, cur, choice||{}); if(!nextId){ warn('No next node from:',cur); return; }
        gotoNode(s,nextId); renderNode(s.byId.get(s.currentId)); updateHUD(s);
      };
      renderNode(state.byId.get(state.currentId)); updateHUD(state);
      if(engine){ try{ (engine.loadScenario||engine.LoadScenario).call(engine,raw); if(engine.start) engine.start(); } catch(e){ warn('Engine hooks failed (non-fatal):',e); } }
    }catch(e){ err('Boot failed:',e); const dialogEl=document.querySelector('[data-ui=dialog]')||document.querySelector('#dialog'); if(dialogEl) dialogEl.textContent = `Boot error: ${e.message}`; }
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded',()=>{ populateScenarioPicker('dating-after-breakup-with-child-involved'); boot(); });
})();

/* -----------------------------------------------------------
 * DOM-Autodetect + Self-mount fallback panel (ES2019-safe)
 * ----------------------------------------------------------- */
(() => {
  const SEL={ dialog:['[data-ui=dialog]','#dialog','#dialogBox','.dialog','[data-role=dialog]','[data-panel=dialog]','#text','[data-ui=text]'], speaker:['[data-ui=speaker]','#speaker','.speaker','[data-role=speaker]','[data-ui=name]','[data-ui=speakerName]','#sceneTitle'], choices:['[data-ui=choices]','#choices','#choiceArea','.choices','[data-role=choices]','ul.choices','[data-ui=options]'] };
  function qTry(list){ for(const s of list){ const el=document.querySelector(s); if(el) return el; } return null; }
  function ensureContainers(){ let dialogEl=qTry(SEL.dialog); let speakerEl=qTry(SEL.speaker); let choicesEl=qTry(SEL.choices); if(dialogEl&&choicesEl) return {dialogEl,speakerEl,choicesEl}; const host=document.querySelector('main#main')||document.body; const panel=document.createElement('section'); panel.className='card panel'; panel.style.marginTop='0.75rem'; const speaker=document.createElement('div'); speaker.setAttribute('data-ui','speaker'); speaker.style.fontWeight='600'; speaker.style.margin='0.25rem 0'; const dialog=document.createElement('div'); dialog.setAttribute('data-ui','dialog'); dialog.style.minHeight='3rem'; dialog.style.padding='0.5rem 0'; const choices=document.createElement('div'); choices.setAttribute('data-ui','choices'); choices.style.display='grid'; choices.style.gap='0.5rem'; panel.appendChild(speaker); panel.appendChild(dialog); panel.appendChild(choices); host.appendChild(panel); return {dialogEl:dialog, speakerEl:speaker, choicesEl:choices}; }
  const _renderNode = window.__amorvia_renderNode;
  window.__amorvia_renderNode = function(node){ const {dialogEl,speakerEl,choicesEl}=ensureContainers(); if(dialogEl) dialogEl.textContent=node.text||node.label||node.title||''; if(speakerEl) speakerEl.textContent=node.speaker||node.role||node.actor||''; if(choicesEl){ choicesEl.innerHTML=''; if(Array.isArray(node.choices)&&node.choices.length){ for(const c of node.choices){ const btn=document.createElement('button'); btn.className='choice'; btn.textContent=c.label||c.text||'Continue'; btn.addEventListener('click',()=>window.__amorvia_onChoice(c)); choicesEl.appendChild(btn);} } else { const btn=document.createElement('button'); btn.className='choice solo'; btn.textContent='Continue'; btn.addEventListener('click',()=>window.__amorvia_onChoice({goto:node.goto})); choicesEl.appendChild(btn);} } if(typeof _renderNode==='function'){ try{ _renderNode(node); } catch(e){} } };
  document.addEventListener('DOMContentLoaded',()=>{ if(!window.__amorvia_renderNodeBound){ const orig=window.__amorvia_renderNode||function(){}; window.__amorvia_renderNode=(...args)=>{ try{ ensureContainers(); } catch(e){} return orig.apply(window,args); }; window.__amorvia_renderNodeBound=true; } });
})();


