// Scenarios/Labs tabs addon
(function(){
  function h(t,p={},...c){ const e=document.createElement(t); for(const[k,v] of Object.entries(p)){ if(k==='class') e.className=v; else if(k==='html') e.innerHTML=v; else e.setAttribute(k,v);} c.flat().forEach(x=>e.appendChild(typeof x==='string'?document.createTextNode(x):x)); return e;}
  function fetchJSON(u){ return fetch(u,{cache:'no-store'}).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }); }
  function open(id){ window.AmorviaV2?.loadScenarioById?.(id); }

  async function init(){
    const mount = document.getElementById('scenarioListV2') || document.body;
    const tabs = h('div',{class:'av-tabs',role:'tablist','aria-label':'Scenario lists'});
    const a = h('button',{class:'av-tab',id:'tabMain',role:'tab','aria-selected':'true','aria-controls':'paneMain'},'Scenarios');
    const b = h('button',{class:'av-tab',id:'tabLabs',role:'tab','aria-selected':'false','aria-controls':'paneLabs'},'Labs');
    tabs.append(a,b);
    const paneMain = h('div',{id:'paneMain',class:'av-pane',role:'tabpanel','aria-labelledby':'tabMain'});
    const paneLabs = h('div',{id:'paneLabs',class:'av-pane',role:'tabpanel','aria-labelledby':'tabLabs',hidden:'true'});
    const wrap = h('div',{},tabs,paneMain,paneLabs); mount.replaceWith(wrap);

    function select(id){ [a,b].forEach(btn=>{ const on=btn.id===id; btn.setAttribute('aria-selected',on?'true':'false'); (btn.id==='tabMain'?paneMain:paneLabs).hidden=!on; }); }
    a.onclick=()=>select('tabMain'); b.onclick=()=>select('tabLabs'); select('tabMain');

    const idx = await fetchJSON('/data/v2-index.json?ts='+Date.now());
    const extrasSet = new Set(['different-rules','scene-first-agreements','scene-new-introductions','scene-de-escalation']);
    const all = Array.isArray(idx.scenarios)?idx.scenarios:[];
    const beta = all.filter(s=>!extrasSet.has(s.id));
    const extras = all.filter(s=>extrasSet.has(s.id));

    function render(host,list){ host.innerHTML=''; list.forEach(s=>{ const btn=h('button',{class:'av-item','data-id':s.id},s.title||s.id); btn.onclick=()=>open(s.id); host.appendChild(btn);});}
    render(paneMain,beta); render(paneLabs,extras);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
