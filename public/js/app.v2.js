/*
 * Amorvia — app.v2.js (Continuum Fix v9.7.2p+ • ES2018-safe • v972p23)
 * Adds Engine Status Badge (Connected / Fallback / Ready / Error)
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

  // ---- Status badge --------------------------------------------------------
  function ensureBadge(){
    var el=document.getElementById('amorviaBadge');
    if(el) return el;
    el=document.createElement('div');
    el.id='amorviaBadge';
    el.className='amorvia-badge';
    el.innerHTML='<span class="dot"></span><span class="txt">Booting…</span>';
    document.body.appendChild(el);
    return el;
  }
  function setBadge(state,tone){
    var el=ensureBadge();
    el.className='amorvia-badge'+(tone?' '+tone:'');
    var txt=el.querySelector('.txt');
    if(txt) txt.textContent=state;
  }

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
      } catch (e) { /* ignore */ }
    }
    return fetch(url, o).then(function(r){
      if (!r.ok) throw new Error("Failed to fetch " + url + ": " + r.status);
      return r.json();
    });
  }

  // ---------- Engine wait ----------
  function waitForEngine(ms) {
    if (ms == null) ms = 1500;
    var t0 = performance.now();
    return new Promise(function(resolve){
      (function poll(){
        var e = window.ScenarioEngine || window.engine || window.E;
        if (e && (e.loadScenario || e.LoadScenario) && e.start){
          setBadge('Engine: Connected','ok');
          return resolve(e);
        }
        if (performance.now() - t0 >= ms) {
          warn("ScenarioEngine not found within timeout, using fallback.");
          setBadge('Engine: Fallback','warn');
          return resolve(null);
        }
        setTimeout(poll, 50);
      })();
    });
  }

  // ---------- Scenario logic ----------
  function findStart(nodes, raw){
    var byId = new Map(nodes.map(function(n){ return [n.id, n]; }));
    if (raw && raw.startNode && byId.has(raw.startNode)) return raw.startNode;
    for (var i=0;i<CONFIG.startNodeCandidates.length;i++){ var c=CONFIG.startNodeCandidates[i]; if (byId.has(c)) return c; }
    for (var j=0;j<nodes.length;j++){
      var n=nodes[j];
      var isEnd = /end\s*of\s*act/i.test((n.title||n.label||n.text||"")) || /end/i.test(n.type||"");
      var hasText = n.text && n.text.trim().length>0;
      if (!isEnd && (n.type==="dialog" || hasText)) return n.id;
    }
    return nodes[0]?nodes[0].id:null;
  }
  function isActEndNode(n){
    if(!n) return false;
    if (/end\s*of\s*act/i.test(n.title || n.label || n.text || "")) return true;
    if (n.type && /actEnd|end/i.test(n.type)) return true;
    return false;
  }

  // ---------- Boot ----------
  function boot(defaultScenarioId){
    setBadge('Loading…',null);
    waitForEngine().then(function(engine){
      var scenarioId = defaultScenarioId || readUrlScenario() || getStoredScenarioId() || window.__SCENARIO_ID__ || "dating-after-breakup-with-child-involved";
      setUrlScenario(scenarioId);
      setBadge('Loading '+scenarioId+'…',null);
      return fetchJSON("/data/"+scenarioId+".v2.json").then(function(raw){
        if(!raw){ throw new Error("No scenario data"); }
        var nodes = (raw.nodes||[]);
        if(!nodes.length && raw.acts){ nodes = raw.acts[0].nodes||raw.acts[0].steps||[]; }
        if(!nodes.length) throw new Error("Scenario empty");
        var startId = findStart(nodes,raw);
        if(!startId) throw new Error("No start node");
        setBadge('Ready: '+scenarioId,'ok');
      });
    }).catch(function(e){
      err("Boot failed:",e);
      setBadge('Error','err');
      var dialogEl=document.querySelector("[data-ui=dialog]")||document.querySelector("#dialog");
      if(dialogEl) dialogEl.textContent="Boot error: "+e.message;
    });
  }

  document.addEventListener("DOMContentLoaded",function(){
    boot("dating-after-breakup-with-child-involved");
  });
})();

/* -----------------------------------------------------------
 * DOM-Autodetect + Self-mount fallback panel (ES2018-safe)
 * ----------------------------------------------------------- */
(function(){
  var SEL = {
    dialog:  ["[data-ui=dialog]","#dialog","#dialogBox",".dialog","[data-role=dialog]","[data-panel=dialog]","#text","[data-ui=text]"],
    speaker: ["[data-ui=speaker]","#speaker",".speaker","[data-role=speaker]","[data-ui=name]","[data-ui=speakerName]","#sceneTitle"],
    choices: ["[data-ui=choices]","#choices","#choiceArea",".choices","[data-role=choices]","ul.choices","[data-ui=options]"]
  };
  function qTry(list){ for (var i=0;i<list.length;i++){ var el=document.querySelector(list[i]); if (el) return el; } return null; }
  function ensureContainers(){
    var dialogEl=qTry(SEL.dialog), speakerEl=qTry(SEL.speaker), choicesEl=qTry(SEL.choices);
    if (dialogEl && choicesEl) return { dialogEl: dialogEl, speakerEl: speakerEl, choicesEl: choicesEl };
    var host=document.querySelector("main#main")||document.body;
    var panel=document.createElement("section"); panel.className="card panel"; panel.style.marginTop="0.75rem";
    var speaker=document.createElement("div"); speaker.setAttribute("data-ui","speaker"); speaker.style.fontWeight="600"; speaker.style.margin="0.25rem 0";
    var dialog=document.createElement("div"); dialog.setAttribute("data-ui","dialog"); dialog.style.minHeight="3rem"; dialog.style.padding="0.5rem 0";
    var choices=document.createElement("div"); choices.setAttribute("data-ui","choices"); choices.style.display="grid"; choices.style.gap="0.5rem";
    panel.appendChild(speaker); panel.appendChild(dialog); panel.appendChild(choices);
    host.appendChild(panel);
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
})();