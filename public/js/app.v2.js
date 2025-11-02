/*
 * Amorvia — app.v2.js (Continuum Fix v9.7.2p+ FINAL • ES2018-safe)
 * Features:
 * - Non-blocking boot
 * - Robust scenario picker (+persist last selection, +URL sync ?scenario=)
 * - /data/... fetch paths with cache-bust and no-store
 * - Accepts raw v2 OR graph; hydrates nodes; safe start resolver
 * - HUD sync (trust, tension, childStress) + Act badge
 * - Choice label meter hints
 * - DOM autodetect fallback panel
 */

(function () {
  var CONFIG = {
    indexPath: "/data/v2-index.json",
    meters: ["trust", "tension", "childStress"],
    startNodeCandidates: ["start", "intro", "act1-start", "act-1-start"],
    noStore: true,
    debug: true
  };

  function log(){ if (CONFIG.debug) { var a=[].slice.call(arguments); a.unshift("[Amorvia]"); console.log.apply(console, a);} }
  function warn(){ var a=[].slice.call(arguments); a.unshift("[Amorvia]"); console.warn.apply(console, a); }
  function err(){ var a=[].slice.call(arguments); a.unshift("[Amorvia]"); console.error.apply(console, a); }

  // ---- Persistence helpers ----
  var STORAGE_KEYS = { lastScenario: "amorvia:lastScenarioId" };
  function getStoredScenarioId(){ try { return localStorage.getItem(STORAGE_KEYS.lastScenario) || null; } catch(e) { return null; } }
  function setStoredScenarioId(id){ try { if (id) localStorage.setItem(STORAGE_KEYS.lastScenario, id); } catch(e) {} }
  function readUrlScenario(){ try { var u=new URL(location.href); return u.searchParams.get("scenario"); } catch(e) { return null; } }
  function setUrlScenario(id){
    try {
      var u=new URL(location.href);
      if (id) u.searchParams.set("scenario", id);
      else u.searchParams.delete("scenario");
      history.replaceState(null, "", u.toString());
    } catch(e) {}
  }

  // ---------- Fetch (no-store + cache-bust) ----------
  function fetchJSON(url, opts) {
    if (!opts) opts = {};
    var o = {};
    for (var k in opts) { if (opts.hasOwnProperty(k)) o[k] = opts[k]; }
    o.headers = {};
    if (opts && opts.headers) { for (var h in opts.headers) if (opts.headers.hasOwnProperty(h)) o.headers[h] = opts.headers[h]; }
    if (CONFIG.noStore) {
      o.cache = "no-store";
      o.headers["Cache-Control"] = "no-store, max-age=0";
      try {
        var u = new URL(url, location.origin);
        u.searchParams.set("v", String(Date.now()));
        url = u.toString();
      } catch (e) { /* ignore for relative URLs */ }
    }
    return fetch(url, o).then(function(r){
      if (!r.ok) throw new Error("Failed to fetch " + url + ": " + r.status);
      return r.json();
    });
  }

  // ---------- Engine wait (non-blocking) ----------
  function waitForEngine(ms) {
    if (ms == null) ms = 1500;
    var t0 = performance.now();
    return new Promise(function(resolve){
      (function poll(){
        var e = window.ScenarioEngine || window.engine || window.E;
        if (e && (e.loadScenario || e.LoadScenario) && e.start) return resolve(e);
        if (performance.now() - t0 >= ms) {
          warn("ScenarioEngine not found within timeout (non-fatal). Proceeding without it.");
          return resolve(null);
        }
        setTimeout(poll, 50);
      })();
    });
  }

  // ---------- Resolve scenario path ----------
  function resolveScenarioPathById(id) {
    return fetchJSON(CONFIG.indexPath).then(function(idx){
      var entries = [];
      if (Array.isArray(idx)) entries = idx;
      else if (idx && Array.isArray(idx.entries)) entries = idx.entries;
      else if (idx && Array.isArray(idx.items)) entries = idx.items;
      else if (idx && Array.isArray(idx.list)) entries = idx.list;
      else if (idx && Array.isArray(idx.scenarios)) entries = idx.scenarios;

      var hit, i, x;
      for (i=0;i<entries.length;i++){
        x = entries[i];
        if (typeof x === "string" && x === id) { hit = x; break; }
        if (x && (x.id === id || x.slug === id || x.key === id || x.name === id)) { hit = x; break; }
      }
      if (hit) {
        if (typeof hit === "string") return "/data/" + hit + ".v2.json";
        if (hit.path) return hit.path;
      }
      return "/data/" + id + ".v2.json";
    }).catch(function(e){
      warn("Index read failed, will use default path.", e);
      return "/data/" + id + ".v2.json";
    });
  }

  // ---------- Shape guards / normalization ----------
  function isGraph(x){ return x && (Array.isArray(x.nodes) || Array.isArray(x.graph) || (x.nodes && typeof x.nodes === "object")) && x.version !== 2; }
  function isV2(x){ return x && (x.version === 2 || x.schemaVersion === 2 || x.meters || x.acts); }

  function flatten(raw){
    var out = [];
    if (Array.isArray(raw.nodes)) return raw.nodes.slice();
    if (Array.isArray(raw.acts)){
      for (var ai=0; ai<raw.acts.length; ai++){
        var act = raw.acts[ai];
        if (Array.isArray(act.nodes)){
          for (var ni=0; ni<act.nodes.length; ni++){
            var n = act.nodes[ni];
            var nn = {}; for (var k in n){ if (n.hasOwnProperty(k)) nn[k]=n[k]; }
            nn._actIndex = ai;
            out.push(nn);
          }
        } else if (Array.isArray(act.steps)){
          for (var j=0; j<act.steps.length; j++){
            var s = act.steps[j];
            out.push({ id: s.id || ("act"+(ai+1)+"-step"+(j+1)), type: s.type || "dialog", text: s.text || s.label || s.title || "", choices: s.choices || [], goto: s.goto, _actIndex: ai });
          }
        }
      }
    }
    return out;
  }

  function addChoiceHints(c){
    var eff = c.effects || c.meters || {};
    var parts = [];
    for (var i=0;i<CONFIG.meters.length;i++){
      var m = CONFIG.meters[i];
      var v = eff[m];
      if (typeof v === "number" && v !== 0) parts.push((v>0?"+":"") + v + " " + m);
    }
    if (parts.length){
      var hint = " [" + parts.join(" / ") + "]";
      var base = c.label || c.text || "";
      c.label = base + hint;
    }
    return c;
  }

  function normalize(raw){
    var list = [];
    if (isV2(raw)) list = flatten(raw);
    else if (isGraph(raw)) list = Array.isArray(raw.nodes) ? raw.nodes.slice() : Array.isArray(raw.graph) ? raw.graph.slice() : Object.values(raw.nodes || {});
    var map = new Map();
    for (var i=0;i<list.length;i++){
      var n = list[i];
      if (!n || !n.id) continue;
      if (!Array.isArray(n.choices)) n.choices = [];
      var outChoices = [];
      for (var c=0;c<n.choices.length;c++) outChoices.push(addChoiceHints(Object.assign({}, n.choices[c])));
      n.choices = outChoices;
      map.set(n.id, n);
    }
    return { list: list, map: map };
  }

  // ---------- Start node helpers ----------
  function findStart(nodes, raw){
    var byId = new Map(nodes.map(function(n){ return [n.id, n]; }));
    if (raw && raw.startNode && byId.has(raw.startNode)) return raw.startNode;
    for (var i=0;i<CONFIG.startNodeCandidates.length;i++){ var c=CONFIG.startNodeCandidates[i]; if (byId.has(c)) return c; }
    for (var j=0;j<nodes.length;j++){ var n=nodes[j]; var isEnd = /end\\s*of\\s*act/i.test((n.title||n.label||n.text||"")) || /end/i.test(n.type||""); var hasText = n.text && n.text.trim().length>0; if (!isEnd && (n.type==="dialog" || hasText)) return n.id; }
    return nodes[0] ? nodes[0].id : null;
  }
  function isActEndNode(n){ if(!n) return false; if (/end\\s*of\\s*act/i.test(n.title||n.label||n.text||\"\")) return true; if (n.type && /actEnd|end/i.test(n.type)) return true; return false; }
  function nextActStartId(nodes, i){ var t=i+1; for (var k=0;k<nodes.length;k++){ var n=nodes[k]; if (n._actIndex===t && (/^act\\d+-start$/i.test(n.id) || /start/i.test(n.id))) return n.id; } for (var k2=0;k2<nodes.length;k2++){ var n2=nodes[k2]; if (n2._actIndex===t) return n2.id; } return null; }

  // ---------- HUD ----------
  function animateBar(el,to,ms){ if(ms==null) ms=350; if(!el) return; var from=parseFloat(el.dataset.value||\"0\"); var target=Math.max(0,Math.min(100,to)); var start=performance.now(); function step(ts){ var k=Math.min(1,(ts-start)/ms); var v=from+(target-from)*k; el.style.width=v+\"%\"; el.dataset.value=String(v); if(k<1) requestAnimationFrame(step);} requestAnimationFrame(step); }
  function updateHUD(state){ try{ var m=state.meters||{}; for(var i=0;i<CONFIG.meters.length;i++){ var k=CONFIG.meters[i]; var val=typeof m[k]===\"number\"?m[k]:0; animateBar(document.querySelector('[data-meter=\"'+k+'\"] .bar'), Math.max(0,Math.min(100,val))); var label=document.querySelector('[data-meter=\"'+k+'\"] .value'); if(label) label.textContent=String(val);} var txt=state.actIndex!=null?('Act '+(state.actIndex+1)):'Act -'; var el1=document.querySelector('[data-hud=act]'); var el2=document.querySelector('#actBadge'); if(el1) el1.textContent=txt; if(el2) el2.textContent=txt; } catch(e){ warn('HUD update skipped:', e);} }

  // ---------- Driver ----------
  function buildState(nodes,startId,raw){ var base={}; for(var i=0;i<CONFIG.meters.length;i++){ base[CONFIG.meters[i]]=0; } return { nodes:nodes, byId:new Map(nodes.map(function(n){ return [n.id,n]; })), currentId:startId, actIndex:(function(){ for(var i2=0;i2<nodes.length;i2++){ if(nodes[i2].id===startId) return nodes[i2]._actIndex||0; } return 0; })(), meters:(function(){ var m2={}; for(var i3=0;i3<CONFIG.meters.length;i3++){ m2[CONFIG.meters[i3]]=base[CONFIG.meters[i3]]; } if (raw && raw.meters){ for (var key in raw.meters){ if (raw.meters.hasOwnProperty(key)) m2[key]=raw.meters[key]; } } return m2; })(), history:[] }; }
  function applyEffects(state,choice){ var eff=choice.effects||choice.meters||{}; for(var i=0;i<CONFIG.meters.length;i++){ var k=CONFIG.meters[i]; if(typeof eff[k]===\"number\") state.meters[k]=(state.meters[k]||0)+eff[k]; } }
  function gotoNode(state,id){ if(!state.byId.has(id)){ warn('goto unknown node:', id); return false; } state.history.push(state.currentId); state.currentId=id; var node=state.byId.get(id); if(node && node._actIndex!=null) state.actIndex=node._actIndex; return true; }
  function renderNode(node){ var dialogEl=document.querySelector('[data-ui=dialog]')||document.querySelector('#dialog'); var speakerEl=document.querySelector('[data-ui=speaker]')||document.querySelector('#sceneTitle'); var choicesEl=document.querySelector('[data-ui=choices]')||document.querySelector('#choices'); if(dialogEl) dialogEl.textContent=node.text||node.label||node.title||\"\"; if(speakerEl) speakerEl.textContent=node.speaker||node.role||node.actor||node.title||\"\"; if(choicesEl){ choicesEl.innerHTML=\"\"; if(Array.isArray(node.choices)&&node.choices.length){ for(var i=0;i<node.choices.length;i++){ var c=node.choices[i]; var btn=document.createElement('button'); btn.className='choice'; btn.textContent=c.label||c.text||'Continue'; (function(cc){ btn.addEventListener('click', function(){ window.__amorvia_onChoice(cc); }); })(c); choicesEl.appendChild(btn);} } else { var btn2=document.createElement('button'); btn2.className='choice solo'; btn2.textContent='Continue'; btn2.addEventListener('click', function(){ window.__amorvia_onChoice({ goto: node.goto }); }); choicesEl.appendChild(btn2);} } }
  window.__amorvia_renderNode = renderNode;
  function computeNextId(state,node,choice){ function pick(x){ return (typeof x==='string' && x.trim().length)?x.trim():null; } var fromChoice=pick(choice && (choice.goto||choice.target)); if(fromChoice) return fromChoice; var fromNode=pick(node && (node.goto||node.next)); if(fromNode) return fromNode; if(isActEndNode(node)){ var nid=nextActStartId(state.nodes, node._actIndex); if(nid) return nid; } var idx=-1; for(var i=0;i<state.nodes.length;i++){ if(state.nodes[i].id===node.id){ idx=i; break; } } if(idx>=0 && idx+1<state.nodes.length){ var cand=state.nodes[idx+1]; if(!cand._actIndex || cand._actIndex===node._actIndex) return cand.id; } return null; }

  // ---------- Scenario picker ----------
  function titleFromId(id){ return String(id||\"\").replace(/[-_]+/g,\" \").replace(/\\b\\w/g,function(m){return m.toUpperCase();}).trim(); }
  function populateScenarioPicker(currentId){
    var sel=document.getElementById('scenarioPicker'); if(!sel) return;
    sel.innerHTML='<option disabled>Loading…</option>'; sel.disabled=true;
    var storedId=getStoredScenarioId();
    var fallbackList=[
      {id:'dating-after-breakup-with-child-involved', title:'Dating After Breakup (With Child)'},
      {id:'co-parenting-with-bipolar-partner',        title:'Co-parenting With Bipolar Partner'},
      {id:'visitor',                                  title:'Visitor'}
    ];

    fetchJSON(CONFIG.indexPath).then(function(idx){
      var rawEntries = [];
      if (Array.isArray(idx)) rawEntries = idx;
      else if (idx && Array.isArray(idx.entries)) rawEntries = idx.entries;
      else if (idx && Array.isArray(idx.items)) rawEntries = idx.items;
      else if (idx && Array.isArray(idx.list)) rawEntries = idx.list;
      else if (idx && Array.isArray(idx.scenarios)) rawEntries = idx.scenarios;

      var items = [];
      for (var i=0;i<rawEntries.length;i++){
        var x = rawEntries[i];
        if (typeof x === 'string') items.push({ id:x, title:titleFromId(x), path:'/data/'+x+'.v2.json' });
        else {
          var id = x.id || x.slug || x.key || (typeof x.name==='string' ? x.name.toLowerCase().replace(/\\s+/g,'-') : undefined);
          var path = x.path || x.url || (id ? '/data/'+id+'.v2.json' : undefined);
          var title = x.title || x.name || titleFromId(id);
          if (id) items.push({ id:id, title:title, path:path });
        }
      }
      if (!items.length) { items = fallbackList; warn('[Amorvia] v2-index.json had no usable entries; using fallback list.'); }
      items.sort(function(a,b){ return a.title.localeCompare(b.title); });

      sel.innerHTML='';
      for (var j=0;j<items.length;j++){ var it=items[j]; var opt=document.createElement('option'); opt.value=it.id; opt.textContent=it.title; sel.appendChild(opt); }

      var wanted = currentId || readUrlScenario() || storedId || window.__SCENARIO_ID__ || (items[0] && items[0].id);
      if (wanted) sel.value = wanted;

      sel.disabled=false;
      sel.onchange=function(){ var id=sel.value; try{ window.__SCENARIO_ID__=id; }catch(e){} setStoredScenarioId(id); setUrlScenario(id); var d=document.querySelector('#dialog')||document.querySelector('[data-ui=dialog]'); var c=document.querySelector('#choices')||document.querySelector('[data-ui=choices]'); if(d) d.textContent='Loading…'; if(c) c.innerHTML=''; boot(id); };
    }).catch(function(e){
      warn('Failed to populate scenario picker; using fallback list.', e);
      sel.innerHTML='';
      for (var i=0;i<fallbackList.length;i++){ var it=fallbackList[i]; var opt=document.createElement('option'); opt.value=it.id; opt.textContent=it.title; sel.appendChild(opt); }
      var wanted = currentId || readUrlScenario() || storedId || fallbackList[0].id;
      sel.value = wanted;
      sel.disabled=false;
      sel.onchange=function(){ var id=sel.value; try{ window.__SCENARIO_ID__=id; }catch(e){} setStoredScenarioId(id); setUrlScenario(id); boot(id); };
    });
  }

  // ---------- Boot ----------
  function boot(defaultScenarioId){
    waitForEngine().then(function(engine){
      var scenarioId = defaultScenarioId || readUrlScenario() || getStoredScenarioId() || window.__SCENARIO_ID__ || 'dating-after-breakup-with-child-involved';
      setUrlScenario(scenarioId);
      return resolveScenarioPathById(scenarioId).then(function(path){
        log('Loading scenario:', scenarioId, '->', path);
        return fetchJSON(path).then(function(raw){
          var norm = normalize(raw);
          var nodes = norm.list;
          if (!nodes.length) throw new Error('Scenario has no nodes after normalization');
          var startId = findStart(nodes, raw);
          if (!startId) throw new Error('Unable to find a start node');
          var state = buildState(nodes, startId, raw);
          window.__amorvia_state = state;
          window.__amorvia_onChoice = function(choice){
            var s = window.__amorvia_state;
            var cur = s.byId.get(s.currentId);
            applyEffects(s, choice || {});
            updateHUD(s);
            var nextId = computeNextId(s, cur, choice || {});
            if (!nextId) { warn('No next node from:', cur); return; }
            gotoNode(s, nextId);
            renderNode(s.byId.get(s.currentId));
            updateHUD(s);
          };
          renderNode(state.byId.get(state.currentId));
          updateHUD(state);
          if (engine){
            try { (engine.loadScenario || engine.LoadScenario).call(engine, raw); if (engine.start) engine.start(); }
            catch (e) { warn('Engine hooks failed (non-fatal):', e); }
          }
        });
      });
    }).catch(function(e){
      err('Boot failed:', e);
      var dialogEl = document.querySelector('[data-ui=dialog]') || document.querySelector('#dialog');
      if (dialogEl) dialogEl.textContent = 'Boot error: ' + e.message;
    });
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', function(){
    populateScenarioPicker('dating-after-breakup-with-child-involved');
    boot();
  });
})();

/* -----------------------------------------------------------
 * DOM-Autodetect + Self-mount fallback panel (ES2018-safe)
 * ----------------------------------------------------------- */
(function(){
  var SEL = {
    dialog:  ['[data-ui=dialog]','#dialog','#dialogBox','.dialog','[data-role=dialog]','[data-panel=dialog]','#text','[data-ui=text]'],
    speaker: ['[data-ui=speaker]','#speaker','.speaker','[data-role=speaker]','[data-ui=name]','[data-ui=speakerName]','#sceneTitle'],
    choices: ['[data-ui=choices]','#choices','#choiceArea','.choices','[data-role=choices]','ul.choices','[data-ui=options]']
  };
  function qTry(list){ for (var i=0;i<list.length;i++){ var el=document.querySelector(list[i]); if (el) return el; } return null; }
  function ensureContainers(){
    var dialogEl=qTry(SEL.dialog), speakerEl=qTry(SEL.speaker), choicesEl=qTry(SEL.choices);
    if (dialogEl && choicesEl) return { dialogEl: dialogEl, speakerEl: speakerEl, choicesEl: choicesEl };
    var host=document.querySelector('main#main')||document.body;
    var panel=document.createElement('section'); panel.className='card panel'; panel.style.marginTop='0.75rem';
    var speaker=document.createElement('div'); speaker.setAttribute('data-ui','speaker'); speaker.style.fontWeight='600'; speaker.style.margin='0.25rem 0';
    var dialog=document.createElement('div'); dialog.setAttribute('data-ui','dialog'); dialog.style.minHeight='3rem'; dialog.style.padding='0.5rem 0';
    var choices=document.createElement('div'); choices.setAttribute('data-ui','choices'); choices.style.display='grid'; choices.style.gap='0.5rem';
    panel.appendChild(speaker); panel.appendChild(dialog); panel.appendChild(choices); host.appendChild(panel);
    return { dialogEl: dialog, speakerEl: speaker, choicesEl: choices };
  }
  var _renderNode = window.__amorvia_renderNode;
  window.__amorvia_renderNode = function(node){
    var c = ensureContainers();
    var dialogEl=c.dialogEl, speakerEl=c.speakerEl, choicesEl=c.choicesEl;
    if (dialogEl) dialogEl.textContent = node.text || node.label || node.title || '';
    if (speakerEl) speakerEl.textContent = node.speaker || node.role || node.actor || '';
    if (choicesEl){
      choicesEl.innerHTML = '';
      if (Array.isArray(node.choices) && node.choices.length){
        for (var i=0;i<node.choices.length;i++){
          var x=node.choices[i];
          var b=document.createElement('button');
          b.className='choice';
          b.textContent = x.label || x.text || 'Continue';
          (function(xx){ b.addEventListener('click', function(){ window.__amorvia_onChoice(xx); });})(x);
          choicesEl.appendChild(b);
        }
      } else {
        var b2=document.createElement('button');
        b2.className='choice solo';
        b2.textContent='Continue';
        b2.addEventListener('click', function(){ window.__amorvia_onChoice({ goto: node.goto }); });
        choicesEl.appendChild(b2);
      }
    }
    if (typeof _renderNode === 'function') { try { _renderNode(node); } catch(e) {} }
  };
  document.addEventListener('DOMContentLoaded', function(){
    if (!window.__amorvia_renderNodeBound){
      var orig = window.__amorvia_renderNode || function(){};
      window.__amorvia_renderNode = function(){ try { ensureContainers(); } catch(e) {} return orig.apply(window, arguments); };
      window.__amorvia_renderNodeBound = true;
    }
  });
})();