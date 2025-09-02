(function(){
  function ensureCSS(){
    const href = '/css/addons.css';
    if (![...document.styleSheets].some(s => s.href && s.href.endsWith('addons.css'))) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href + '?v=' + Date.now(); document.head.appendChild(link);
    }
  }
  function h(tag, props={}, ...children){
    const el = document.createElement(tag);
    for (const [k,v] of Object.entries(props||{})) {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    }
    children.flat().forEach(c => { if (c!=null) el.appendChild(typeof c==='string' ? document.createTextNode(c) : c); });
    return el;
  }
  function openScenarioById(id){
    window.AmorviaV2?.loadScenarioById?.(id);
  }
  async function fetchJSON(url){ const r = await fetch(url, { cache:'no-store' }); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
  async function init(){
    ensureCSS();
    const host = document.getElementById('scenarioListV2')?.parentElement || document.querySelector('aside.card.panel') || document.body;
    const tabs = h('div', { id:'labsTabs', class:'v2-only av-tabs', role:'tablist', 'aria-label':'Scenario lists' });
    const tabMain = h('button', { class:'av-tab', id:'tabMain', role:'tab', 'aria-selected':'true', 'aria-controls':'paneMain' }, 'Scenarios');
    const tabLabs = h('button', { class:'av-tab', id:'tabLabs', role:'tab', 'aria-selected':'false', 'aria-controls':'paneLabs' }, 'Labs');
    const spacer = h('div', { class:'av-tabs-spacer', 'aria-hidden':'true' });
    const label = h('label', { class:'av-toggle' }, h('input', { type:'checkbox', id:'showExtrasInMain', 'aria-label':'Show extras in main' }), h('span', { class:'av-toggle-text' }, 'Show extras in main'));
    tabs.append(tabMain, tabLabs, spacer, label);
    const paneMain = h('div', { id:'paneMain', class:'av-pane', role:'tabpanel', 'aria-labelledby':'tabMain' });
    const paneLabs = h('div', { id:'paneLabs', class:'av-pane', role:'tabpanel', 'aria-labelledby':'tabLabs', hidden:'true' });
    const wrap = h('div', { class:'av-wrap' }, tabs, paneMain, paneLabs);
    const anchor = document.getElementById('scenarioListV2') || host;
    anchor.insertAdjacentElement('afterend', wrap);
    function select(id){
      [tabMain, tabLabs].forEach(btn => {
        const isActive = btn.id === id;
        btn.setAttribute('aria-selected', String(isActive));
        btn.classList.toggle('av-tab-active', isActive);
        const panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (panel) panel.hidden = !isActive;
      });
    }
    tabMain.addEventListener('click', ()=>select('tabMain'));
    tabLabs.addEventListener('click', ()=>select('tabLabs'));
    select('tabMain');
    const idx = await fetchJSON('/data/v2-index.json?ts='+Date.now());
    const all = Array.isArray(idx.scenarios) ? idx.scenarios : [];
    const extras = new Set(['different-rules','scene-first-agreements','scene-new-introductions','scene-de-escalation']);
    const beta = all.filter(s => !extras.has(s.id));
    const extrasList = all.filter(s => extras.has(s.id));
    const cb = document.getElementById('showExtrasInMain');
    const renderList = (container, scenarios) => { container.innerHTML=''; scenarios.forEach(s => { const b = h('button', { class:'button av-item', onClick:()=>openScenarioById(s.id) }, s.title || s.id); container.appendChild(b); }); };
    const update = () => { renderList(paneMain, cb.checked ? beta.concat(extrasList) : beta); renderList(paneLabs, extrasList); };
    cb.addEventListener('change', update);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
