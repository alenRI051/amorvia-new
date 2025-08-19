
/**
 * Extras/Labs Tabs Addon (themed)
 * - Accessible tabs with role=tablist / role=tab / role=tabpanel
 * - No inline styles; loads /css/addons.css dynamically (CSP-safe)
 * - "Show extras in main" checkbox to duplicate extras into the main list
 */
(function(){
  const EXTRA_IDS = new Set(['different-rules','scene-first-agreements','scene-new-introductions','scene-de-escalation']);

  // Ensure CSS is loaded without inline styles
  function ensureAddonCSS(){
    const href = '/css/addons.css';
    if (![...document.styleSheets].some(s => s.href && s.href.endsWith(href))) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
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

  function findListContainer(){
    const list = document.getElementById('scenarioList');
    return list && list.parentElement ? list.parentElement : document.querySelector('aside.card.panel') || document.body;
  }

  async function fetchJSON(url){
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP '+res.status+' for '+url);
    return await res.json();
  }

  function openScenarioById(id){
    // Preferred: event for host app
    window.dispatchEvent(new CustomEvent('amorvia:select-scenario', { detail: { id } }));
    // Fallbacks
    const g = window.AmorviaV2 || window.Amorvia || window;
    if (typeof g.startScenarioById === 'function') return g.startScenarioById(id);
    if (typeof g.startScenario === 'function') return g.startScenario(id);
    // Last resort: load doc and emit event
    fetchJSON(`/data/${id}.v2.json`).then(doc=>{
      window.dispatchEvent(new CustomEvent('amorvia:open-scenario-doc', { detail: { id, doc } }));
    }).catch(console.warn);
  }

  function renderList(container, scenarios){
    container.innerHTML = '';
    const ul = h('div', { class: 'list av-list', role: 'list' });
    scenarios.forEach(s => {
      const btn = h('button', { class: 'button av-item', role:'listitem', 'data-id': s.id, onClick: ()=>openScenarioById(s.id) }, s.title || s.id);
      ul.appendChild(btn);
    });
    container.appendChild(ul);
  }

  function setupTabs(tabsRoot, panes){
    const buttons = tabsRoot.querySelectorAll('[role="tab"]');
    function select(id){
      buttons.forEach(btn => {
        const isActive = btn.id === id;
        btn.setAttribute('aria-selected', String(isActive));
        btn.classList.toggle('av-tab-active', isActive);
        const panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (panel) {
          panel.hidden = !isActive;
        }
      });
    }
    buttons.forEach(btn => {
      btn.addEventListener('click', () => select(btn.id));
      btn.addEventListener('keydown', (e) => {
        // Arrow key navigation
        const arr = Array.from(buttons);
        const idx = arr.indexOf(btn);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault(); arr[(idx+1)%arr.length].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault(); arr[(idx-1+arr.length)%arr.length].focus();
        }
      });
    });
    // initial
    const initial = tabsRoot.querySelector('[role="tab"][aria-selected="true"]');
    if (initial) select(initial.id);
  }

  async function init(){
    try{
      ensureAddonCSS();
      const aside = findListContainer();
      const old = document.getElementById('scenarioList');
      if (old) { old.hidden = true; old.setAttribute('aria-hidden', 'true'); }

      // Tabs shell
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
      const wrap = h('div', { class:'av-wrap' }, tabs, paneMain, paneLabs);
      aside.appendChild(wrap);

      setupTabs(tabs, { main: paneMain, labs: paneLabs });

      const index = await fetchJSON('/data/v2-index.json');
      const all = Array.isArray(index.scenarios) ? index.scenarios : [];
      const beta = all.filter(s => !EXTRA_IDS.has(s.id));
      const extras = all.filter(s => EXTRA_IDS.has(s.id));

      const cb = document.getElementById('showExtrasInMain');
      const update = () => {
        renderList(paneMain, cb.checked ? beta.concat(extras) : beta);
        renderList(paneLabs, extras);
      };
      cb.addEventListener('change', update);
      update();
    }catch(e){
      console.warn('extras-tabs init failed:', e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
