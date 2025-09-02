
/**
 * Extras/Labs Tabs Addon (themed, CSP-safe)
 */
(function(){
  function ensureCSS(){
    const href = '/css/addons.css';
    if (![...document.styleSheets].some(s => s.href && s.href.includes('/css/addons.css'))) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href + '?v=' + Date.now();
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

  async function fetchJSON(url){
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP '+res.status+' for '+url);
    return await res.json();
  }

  function openScenarioById(id){
    if (window.AmorviaV2?.loadScenarioById) return window.AmorviaV2.loadScenarioById(id);
    const pick = document.getElementById('scenarioPicker');
    if (pick) { pick.value = id; pick.dispatchEvent(new Event('change')); }
  }

  function renderList(container, list){
    container.innerHTML = '';
    const ul = h('div', { class: 'list av-list', role: 'list' });
    list.forEach(s => {
      const btn = h('button', { class: 'button av-item', role:'listitem', 'data-id': s.id, onClick: ()=>openScenarioById(s.id) }, s.title || s.id);
      ul.appendChild(btn);
    });
    container.appendChild(ul);
  }

  function setupTabs(tabsRoot){
    const buttons = tabsRoot.querySelectorAll('[role="tab"]');
    function select(id){
      buttons.forEach(btn => {
        const isActive = btn.id === id;
        btn.setAttribute('aria-selected', String(isActive));
        btn.classList.toggle('av-tab-active', isActive);
        const panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (panel) panel.hidden = !isActive;
      });
    }
    buttons.forEach(btn => {
      btn.addEventListener('click', () => select(btn.id));
    });
    const initial = tabsRoot.querySelector('[role="tab"][aria-selected="true"]');
    if (initial) select(initial.id);
  }

  async function init(){
    ensureCSS();
    const anchor = document.getElementById('scenarioListV2') || document.querySelector('#scenarioPicker')?.parentElement || document.body;
    const tabs = h('div', { id:'labsTabs', class:'v2-only av-tabs', role:'tablist', 'aria-label':'Scenario lists' });
    const tabMain = h('button', { class:'av-tab', id:'tabMain', role:'tab', 'aria-selected':'true', 'aria-controls':'paneMain' }, 'Scenarios');
    const tabLabs = h('button', { class:'av-tab', id:'tabLabs', role:'tab', 'aria-selected':'false', 'aria-controls':'paneLabs' }, 'Labs');
    tabs.append(tabMain, tabLabs);

    const paneMain = h('div', { id:'paneMain', class:'av-pane', role:'tabpanel', 'aria-labelledby':'tabMain' });
    const paneLabs = h('div', { id:'paneLabs', class:'av-pane', role:'tabpanel', 'aria-labelledby':'tabLabs', hidden:'true' });

    anchor.innerHTML = '';
    anchor.appendChild(tabs);
    anchor.appendChild(paneMain);
    anchor.appendChild(paneLabs);
    setupTabs(tabs);

    const index = await fetchJSON('/data/v2-index.json?ts='+Date.now());
    const all = Array.isArray(index.scenarios) ? index.scenarios : [];
    const extras = new Set(['different-rules','scene-first-agreements','scene-new-introductions','scene-de-escalation','visitor']);
    const beta = all.filter(s => !extras.has(s.id));
    const extrasList = all.filter(s => extras.has(s.id));

    renderList(paneMain, beta.length ? beta : all);
    renderList(paneLabs, extrasList);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
