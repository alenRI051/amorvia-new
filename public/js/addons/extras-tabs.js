
(function(){
  const EXTRA_IDS = new Set(['different-rules','scene-first-agreements','scene-new-introductions','scene-de-escalation']);
  function ensureCSS(){
    const href = '/css/addons.css';
    if (![...document.styleSheets].some(s => (s.href||'').endsWith(href))) {
      const link = document.createElement('link'); link.rel='stylesheet'; link.href = href + '?v=' + (window.__AMORVIA_VERSION__||Date.now()); document.head.appendChild(link);
    }
  }
  function h(t,p={},...c){const e=document.createElement(t);for(const[k,v] of Object.entries(p||{})){if(k==='class')e.className=v;else if(k==='html')e.innerHTML=v;else if(k.startsWith('on')&&typeof v==='function')e.addEventListener(k.slice(2).toLowerCase(),v);else e.setAttribute(k,v);}c.flat().forEach(ch=>{if(ch!=null)e.appendChild(typeof ch==='string'?document.createTextNode(ch):ch)});return e;}
  function waitFor(sel,{timeout=8000,root=document}={}){return new Promise(r=>{const f=root.querySelector(sel);if(f)return r(f);const o=new MutationObserver(()=>{const el=root.querySelector(sel);if(el){o.disconnect();r(el)}});o.observe(root,{childList:true,subtree:true});if(timeout>0)setTimeout(()=>{o.disconnect();r(null)},timeout);});}
  async function j(url){const res=await fetch(url,{credentials:'same-origin',cache:'no-cache'});if(!res.ok)throw new Error('HTTP '+res.status);return res.json();}
  function openById(id){const g=window.AmorviaV2||window.Amorvia||window; if(typeof g.startScenarioById==='function')return g.startScenarioById(id); if(typeof g.startScenario==='function')return g.startScenario(id); j('/data/'+id+'.v2.json').then(doc=>{window.dispatchEvent(new CustomEvent('amorvia:open-scenario-doc',{detail:{id,doc}}));}).catch(console.warn);}
  function list(container, items){container.innerHTML=''; const L=h('div',{class:'list av-list',role:'list'}); items.forEach(s=>{L.appendChild(h('button',{class:'button av-item',role:'listitem','data-id':s.id,onClick:()=>openById(s.id)},s.title||s.id));}); container.appendChild(L);}
  function setupTabs(root){const tabs=root.querySelectorAll('[role="tab"]'); function sel(id){tabs.forEach(b=>{const on=b.id===id;b.setAttribute('aria-selected',String(on));b.classList.toggle('av-tab-active',on);const p=document.getElementById(b.getAttribute('aria-controls')); if(p) p.hidden=!on;});} tabs.forEach(b=>{b.addEventListener('click',()=>sel(b.id)); b.addEventListener('keydown',e=>{const a=[...tabs],i=a.indexOf(b); if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault(); a[(i+1)%a.length].focus();} else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault(); a[(i-1+a.length)%a.length].focus();}})}); const init=root.querySelector('[role="tab"][aria-selected="true"]'); if(init) sel(init.id);}
  async function mount(){
    ensureCSS();
    const anchor = await waitFor('#scenarioListV2, #scenarioList.v2-only', { timeout: 4000 });
    const host = anchor || document.querySelector('aside.card.panel') || document.body;

    const existingTabs = document.getElementById('labsTabs');
    const existingWrap = existingTabs ? existingTabs.closest('.av-wrap') : null;
    if (existingWrap) {
      if (anchor) anchor.insertAdjacentElement('afterend', existingWrap); else host.appendChild(existingWrap);
      return;
    }

    const tabs = h('div',{id:'labsTabs',class:'v2-only av-tabs',role:'tablist','aria-label':'Scenario lists'});
    const tMain = h('button',{class:'av-tab',id:'tabMain',role:'tab','aria-selected':'true','aria-controls':'paneMain'},'Scenarios');
    const tLabs = h('button',{class:'av-tab',id:'tabLabs',role:'tab','aria-selected':'false','aria-controls':'paneLabs'},'Labs');
    const spacer = h('div',{class:'av-tabs-spacer','aria-hidden':'true'});
    const toggle = h('label',{class:'av-toggle'}, h('input',{type:'checkbox',id:'showExtrasInMain','aria-label':'Show extras in main'}), h('span',{class:'av-toggle-text'},'Show extras in main'));
    tabs.append(tMain,tLabs,spacer,toggle);
    const paneMain=h('div',{id:'paneMain',class:'av-pane',role:'tabpanel','aria-labelledby':'tabMain'});
    const paneLabs=h('div',{id:'paneLabs',class:'av-pane',role:'tabpanel','aria-labelledby':'tabLabs',hidden:'true'});
    const wrap=h('div',{class:'av-wrap'},tabs,paneMain,paneLabs);
    if (anchor && anchor.parentElement) anchor.insertAdjacentElement('afterend', wrap); else host.appendChild(wrap);
    setupTabs(tabs);
    try{
      const idx=await j('/data/v2-index.json');
      const all=Array.isArray(idx.scenarios)?idx.scenarios:[];
      const beta=all.filter(s=>!EXTRA_IDS.has(s.id));
      const extras=all.filter(s=>EXTRA_IDS.has(s.id));
      const cb=document.getElementById('showExtrasInMain');
      const refresh=()=>{list(paneMain, cb&&cb.checked?beta.concat(extras):beta); list(paneLabs, extras);};
      cb&&cb.addEventListener('change',refresh);
      refresh();
    }catch(e){console.warn('extras-tabs: index',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount); else mount();
})();
