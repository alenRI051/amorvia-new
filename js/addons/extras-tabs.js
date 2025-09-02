\
(function(){
  function ensureCSS(){
    const href = '/css/addons.css';
    if (![...document.styleSheets].some(s => s.href && s.href.endsWith('addons.css'))) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href + '?v=' + (window.AMORVIA_BUILD || Date.now()); document.head.appendChild(link);
    }
  }
  function h(tag, props={}, ...children){
    const el = document.createElement(tag);
    for (const [k,v] of Object.entries(props||{})) {
      if (k==='class') el.className = v;
      else if (k==='html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v==='function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k,v);
    }
    children.flat().forEach(c=>{ if (c!=null) el.appendChild(typeof c==='string'?document.createTextNode(c):c); });
    return el;
  }
  async function fetchJSON(url){ const r = await fetch(url, {cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
  function openScenarioById(id){
    const g = window.AmorviaV2 || window;
    if (g.loadScenarioById) return g.loadScenarioById(id);
  }
  function renderList(container, scenarios){
    container.innerHTML = '';
    const ul = h('div', { class:'list av-list', role:'list' });
    scenarios.forEach(s => ul.appendChild(h('button', { class:'button av-item', role:'listitem', onClick:()=>openScenarioById(s.id) }, s.title||s.id)));
    container.appendChild(ul);
  }
  function setupTabs(tabsRoot){
    const buttons = tabsRoot.querySelectorAll('[role="tab"]');
    function select(id){
      buttons.forEach(btn=>{
        const on = btn.id===id; btn.setAttribute('aria-selected', String(on));
        btn.classList.toggle('av-tab-active', on);
        const panel = document.getElementById(btn.getAttribute('aria-controls')); if (panel) panel.hidden=!on;
      });
    }
    buttons.forEach(btn=>{
      btn.addEventListener('click', ()=>select(btn.id));
      btn.addEventListener('keydown', (e)=>{
        const arr=[...buttons]; const i=arr.indexOf(btn);
        if (e.key==='ArrowRight'||e.key==='ArrowDown'){ e.preventDefault(); arr[(i+1)%arr.length].focus(); }
        else if (e.key==='ArrowLeft'||e.key==='ArrowUp'){ e.preventDefault(); arr[(i-1+arr.length)%arr.length].focus(); }
      });
    });
    const initial = tabsRoot.querySelector('[role="tab"][aria-selected="true"]'); if (initial) select(initial.id);
  }
  async function init(){
    ensureCSS();
    const anchor = document.getElementById('scenarioListV2') || document.getElementById('scenarioList') || document.querySelector('aside');
    if (!anchor || !anchor.parentElement) return;
    const host = anchor.parentElement;
    const tabs = h('div', { id:'labsTabs', class:'v2-only av-tabs', role:'tablist', 'aria-label':'Scenario lists' });
    const tabMain = h('button', { class:'av-tab', id:'tabMain', role:'tab', 'aria-selected':'true', 'aria-controls':'paneMain' }, 'Scenarios');
    const tabLabs = h('button', { class:'av-tab', id:'tabLabs', role:'tab', 'aria-selected':'false', 'aria-controls':'paneLabs' }, 'Labs');
    const spacer = h('div', { class:'av-tabs-spacer', 'aria-hidden':'true' });
    const label = h('label', { class:'av-toggle' },
      h('input', { type:'checkbox', id:'showExtrasInMain', 'aria-label':'Show extras in main' }),
      h('span', { class:'av-toggle-text' }, 'Show extras in main')
    );
    tabs.append(tabMain, tabLabs, spacer, label);
    const paneMain = h('div', { id:'paneMain', class:'av-pane', role:'tabpanel', 'aria-labelledby':'tabMain' });
    const paneLabs = h('div', { id:'paneLabs', class:'av-pane', role:'tabpanel', 'aria-labelledby':'tabLabs', hidden:'true' });
    host.insertBefore(tabs, anchor);
    host.insertBefore(paneMain, anchor);
    host.insertBefore(paneLabs, anchor);
    setupTabs(tabs);
    try{
      const idx = await fetchJSON('/data/v2-index.json?ts='+Date.now());
      const all = Array.isArray(idx.scenarios)?idx.scenarios:[];
      const extrasIds = new Set(['different-rules','scene-first-agreements','scene-new-introductions','scene-de-escalation']);
      const extras = all.filter(s=>extrasIds.has(s.id));
      const beta = all.filter(s=>!extrasIds.has(s.id));
      const cb = document.getElementById('showExtrasInMain');
      const update = ()=>{ renderList(paneMain, cb.checked? beta.concat(extras): beta); renderList(paneLabs, extras); };
      cb.addEventListener('change', update);
      update();
    }catch(e){ console.warn('extras-tabs failed', e); }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
