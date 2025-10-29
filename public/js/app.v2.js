/*
 * Amorvia — app.v2.js (Continuum Fix v9.7.2p+ FINAL)
 * Clean ES2019-safe version
 */

(() => {
  const CONFIG = {
    indexPath: "/public/data/v2-index.json",
    schemaVersion: 2,
    meters: ["trust", "tension", "childStress"],
    startNodeCandidates: ["start", "intro", "act1-start", "act-1-start"],
    noStore: true,
    debug: true,
  };

  const log = (...a) => CONFIG.debug && console.log('[Amorvia]', ...a);
  const warn = (...a) => console.warn('[Amorvia]', ...a);
  const err = (...a) => console.error('[Amorvia]', ...a);

  async function fetchJSON(url, opts = {}) {
    const o = { ...opts };
    o.headers = { ...(opts.headers || {}) };
    if (CONFIG.noStore) {
      o.cache = 'no-store';
      o.headers['Cache-Control'] = 'no-store, max-age=0';
      const u = new URL(url, location.origin);
      u.searchParams.set('v', Date.now().toString());
      url = u.toString();
    }
    const r = await fetch(url, o);
    if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
    return r.json();
  }

  async function waitForEngine(ms = 8000) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      const e = window.ScenarioEngine || window.engine || window.E;
      if (e && (e.loadScenario || e.LoadScenario) && e.start) return e;
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error('ScenarioEngine not ready');
  }

  async function resolveScenarioPathById(id) {
    try {
      const idx = await fetchJSON(CONFIG.indexPath);
      const entries = Array.isArray(idx) ? idx : idx.entries;
      const hit = entries?.find(x => x && (x.id === id || x.slug === id));
      if (hit?.path) return hit.path;
    } catch (e) { warn('index read fail', e); }
    return `/public/data/${id}.v2.json`;
  }

  function isGraph(x){return x && (Array.isArray(x.nodes)||Array.isArray(x.graph)||(x.nodes&&typeof x.nodes==='object'))&&x.version!==2;}
  function isV2(x){return x&&(x.version===2||x.schemaVersion===2||x.meters||x.acts);}

  function flatten(raw){
    const out=[];
    if(Array.isArray(raw.nodes))return raw.nodes.slice();
    if(Array.isArray(raw.acts)){
      raw.acts.forEach((a,i)=>{
        if(Array.isArray(a.nodes))a.nodes.forEach(n=>out.push({...n,_actIndex:i}));
        else if(Array.isArray(a.steps))a.steps.forEach((s,j)=>out.push({id:s.id||`act${i+1}-step${j+1}`,type:s.type||'dialog',text:s.text||s.label||s.title||'',choices:s.choices||[],goto:s.goto,_actIndex:i}));
      });
    }
    return out;
  }

  function addHints(c){
    const eff=c.effects||c.meters||{};const d=[];
    for(const m of CONFIG.meters){const v=eff[m];if(typeof v==='number'&&v!==0)d.push(`${v>0?'+':''}${v} ${m}`)}
    if(d.length){const hint=` [${d.join(' / ')}]`;const base=c.label||c.text||'';c.label=base+hint;}
    return c;
  }

  function normalize(raw){
    let n=[];if(isV2(raw))n=flatten(raw);else if(isGraph(raw)){if(Array.isArray(raw.nodes))n=raw.nodes.slice();else if(Array.isArray(raw.graph))n=raw.graph.slice();else n=Object.values(raw.nodes||{});}const map=new Map();
    n.forEach(x=>{if(x&&x.id){if(!Array.isArray(x.choices))x.choices=[];x.choices=x.choices.map(y=>addHints({...y}));map.set(x.id,x);}});
    return{list:n,map};
  }

  function findStart(nodes,raw){const id=new Map(nodes.map(n=>[n.id,n]));if(raw.startNode&&id.has(raw.startNode))return raw.startNode;for(const c of CONFIG.startNodeCandidates)if(id.has(c))return c;for(const n of nodes){if(/end\s*of\s*act/i.test(n.text||'')||/end/i.test(n.type||''))continue;if(n.text)return n.id;}return nodes[0]?.id||null;}
  function nextAct(nodes,i){const t=i+1;for(const n of nodes){if(n._actIndex===t&&(/^act\d+-start$/i.test(n.id)||/start/i.test(n.id)))return n.id;}for(const n of nodes){if(n._actIndex===t)return n.id;}return null;}

  function animateBar(el,to,ms=350){if(!el)return;const f=parseFloat(el.dataset.value||'0'),s=performance.now();const t=Math.max(0,Math.min(100,to));function step(x){const k=Math.min(1,(x-s)/ms);const v=f+(t-f)*k;el.style.width=v+'%';el.dataset.value=v;if(k<1)requestAnimationFrame(step);}requestAnimationFrame(step);}

  function updateHUD(st){try{const m=st.meters||{};for(const k of CONFIG.meters){const v=m[k]||0;const pct=Math.max(0,Math.min(100,v));animateBar(document.querySelector(`[data-meter="${k}"] .bar`),pct);const lbl=document.querySelector(`[data-meter="${k}"] .value`);if(lbl)lbl.textContent=v;}
    const t=st.actIndex!=null?`Act ${st.actIndex+1}`:'Act -';const e1=document.querySelector('[data-hud=act]');const e2=document.querySelector('#actBadge');if(e1)e1.textContent=t;if(e2)e2.textContent=t;}catch(e){warn('HUD skip',e);}}

  function buildState(n,start,raw){const m={};CONFIG.meters.forEach(x=>m[x]=0);return{nodes:n,byId:new Map(n.map(x=>[x.id,x])),currentId:start,actIndex:n.find(x=>x.id===start)?._actIndex||0,meters:{...m,...(raw?.meters||{})},history:[]}};

  function applyEff(st,c){const e=c.effects||c.meters||{};for(const k of CONFIG.meters){if(typeof e[k]==='number')st.meters[k]=(st.meters[k]||0)+e[k];}}

  function goto(st,id){if(!st.byId.has(id)){warn('goto unknown',id);return false;}st.history.push(st.currentId);st.currentId=id;const n=st.byId.get(id);if(n&&n._actIndex!=null)st.actIndex=n._actIndex;return true;}

  function renderNode(n){const d=document.querySelector('[data-ui=dialog]')||document.querySelector('#dialog');const s=document.querySelector('[data-ui=speaker]')||document.querySelector('#sceneTitle');const c=document.querySelector('[data-ui=choices]')||document.querySelector('#choices');if(d)d.textContent=n.text||n.label||n.title||'';if(s)s.textContent=n.speaker||n.role||n.actor||n.title||'';if(c){c.innerHTML='';if(Array.isArray(n.choices)&&n.choices.length){for(const x of n.choices){const b=document.createElement('button');b.className='choice';b.textContent=x.label||x.text||'Continue';b.addEventListener('click',()=>window.__amorvia_onChoice(x));c.appendChild(b);}}else{const b=document.createElement('button');b.className='choice solo';b.textContent='Continue';b.addEventListener('click',()=>window.__amorvia_onChoice({goto:n.goto}));c.appendChild(b);}}}
  window.__amorvia_renderNode=renderNode;

  function nextId(st,n,c){const pick=x=>typeof x==='string'&&x.trim()?x.trim():null;const ch=pick(c&&(c.goto||c.target));if(ch)return ch;const nd=pick(n&&(n.goto||n.next));if(nd)return nd;if(/end\s*of\s*act/i.test(n.text||'')||/end/i.test(n.type||'')){const id=nextAct(st.nodes,n._actIndex);if(id)return id;}const i=st.nodes.findIndex(x=>x.id===n.id);if(i>=0&&i+1<st.nodes.length){const cand=st.nodes[i+1];if(!cand._actIndex||cand._actIndex===n._actIndex)return cand.id;}return null;}

  async function boot(def){try{const e=await waitForEngine();log('Engine ready');const id=def||window.__SCENARIO_ID__||'dating-after-breakup-with-child-involved';const path=await resolveScenarioPathById(id);log('Loading',id,'->',path);const raw=await fetchJSON(path);const {list:n}=normalize(raw);if(!n.length)throw new Error('Scenario empty');const start=findStart(n,raw);if(!start)throw new Error('No start');const st=buildState(n,start,raw);window.__amorvia_state=st;window.__amorvia_onChoice=c=>{const s=window.__amorvia_state;const cur=s.byId.get(s.currentId);applyEff(s,c||{});updateHUD(s);const nx=nextId(s,cur,c||{});if(!nx){warn('No next',cur);return;}goto(s,nx);renderNode(s.byId.get(s.currentId));updateHUD(s);};renderNode(st.byId.get(st.currentId));updateHUD(st);try{(e.loadScenario||e.LoadScenario).call(e,raw);if(e.start)e.start();}catch(ex){warn('engine hook fail',ex);}}catch(ex){err('Boot fail',ex);const d=document.querySelector('[data-ui=dialog]')||document.querySelector('#dialog');if(d)d.textContent='Boot error: '+ex.message;}}
  document.addEventListener('DOMContentLoaded',()=>boot());
})();

/* ---- DOM Autodetect patch ---- */
(() => {
  const SEL={dialog:['[data-ui=dialog]','#dialog','#dialogBox','.dialog','[data-role=dialog]','[data-panel=dialog]','#text','[data-ui=text]'],speaker:['[data-ui=speaker]','#speaker','.speaker','[data-role=speaker]','[data-ui=name]','[data-ui=speakerName]','#sceneTitle'],choices:['[data-ui=choices]','#choices','#choiceArea','.choices','[data-role=choices]','ul.choices','[data-ui=options]']};
  function qTry(l){for(const s of l){const e=document.querySelector(s);if(e)return e;}return null;}
  function ensure(){let d=qTry(SEL.dialog),s=qTry(SEL.speaker),c=qTry(SEL.choices);if(d&&c)return{d,s,c};const host=document.querySelector('main#main')||document.body;const p=document.createElement('section');p.className='card panel';p.style.marginTop='0.75rem';const sp=document.createElement('div');sp.dataset.ui='speaker';sp.style.fontWeight='600';sp.style.margin='0.25rem 0';const dg=document.createElement('div');dg.dataset.ui='dialog';dg.style.minHeight='3rem';dg.style.padding='0.5rem 0';const ch=document.createElement('div');ch.dataset.ui='choices';ch.style.display='grid';ch.style.gap='0.5rem';p.appendChild(sp);p.appendChild(dg);p.appendChild(ch);host.appendChild(p);return{d:dg,s:sp,c:ch};}
  const _r=window.__amorvia_renderNode;
  window.__amorvia_renderNode=n=>{const {d,s,c}=ensure();if(d)d.textContent=n.text||n.label||n.title||'';if(s)s.textContent=n.speaker||n.role||n.actor||'';if(c){c.innerHTML='';if(Array.isArray(n.choices)&&n.choices.length){for(const x of n.choices){const b=document.createElement('button');b.className='choice';b.textContent=x.label||x.text||'Continue';b.addEventListener('click',()=>window.__amorvia_onChoice(x));c.appendChild(b);}}else{const b=document.createElement('button');b.className='choice solo';b.textContent='Continue';b.addEventListener('click',()=>window.__amorvia_onChoice({goto:n.goto}));c.appendChild(b);}}if(typeof _r==='function'){try{_r(n);}catch(e){}}};
  document.addEventListener('DOMContentLoaded',()=>{if(!window.__amorvia_renderNodeBound){const o=window.__amorvia_renderNode||function(){};window.__amorvia_renderNode=(...a)=>{try{ensure();}catch(e){}return o.apply(window,a);};window.__amorvia_renderNodeBound=true;}});
})();


