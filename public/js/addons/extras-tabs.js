
/**
 * Extras/Labs Tabs Addon (themed) — refined
 * - Uses EXTRA_IDS consistently
 * - Mounts exactly at #scenarioList if present (replaces anchor), else falls back to a sensible sidebar
 * - Loads /css/addons.css dynamically (CSP-safe)
 */
(function(){
  const EXTRA_IDS = new Set(['different-rules','scene-first-agreements','scene-new-introductions','scene-de-escalation']);

  function ensureAddonCSS(){
    const href = '/css/addons.css';
    if (![...document.styleSheets].some(s => s.href && s.href.endsWith(href))) {
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

  function findListContainer(){
    // 1) Prefer explicit anchor: mount will replace this element
    const anchor = document.getElementById('scenarioList');
    if (anchor) return anchor;

    // 2) Common sidebars
    const pick =
      document.querySelector('aside.card.panel') ||
      document.querySelector('aside.sidebar') ||
      document.querySelector('aside') ||
      document.querySelector('.sidebar,.left,.left-pane,.panel');
    if (pick) return pick;

    // 3) Try near the scenario select
    const scenSel =
      document.querySelector('#scenarioSelect, select[name="scenario"], select#scenario, .scenario-select');
    if (scenSel) {
      const host = scenSel.closest('aside, .sidebar, .panel, .left, .column, .wrap, div');
      if (host) return host;
    }

    // 4) Last resort: body
    return document.body;
  }

  async function fetchJSON(url){
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP '+res.status+' for '+url);
    return await res.json();
  }

  function openScenarioById(id){
    window.dispatchEvent(new CustomEvent('amorvia:select-scenario', { detail: { id } }));
    const g = window.AmorviaV2 || window.Amorvia || window;
    if (typeof g.startScenarioById === 'function') return g.startScenarioById(id);
    if (typeof g.startScenario === 'function') return g.startScenario(id);
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
      btn.addEventListener('keydown', (e) => {
        const arr = Array.from(buttons);
        const idx = arr.indexOf(btn);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault(); arr[(idx+1)%arr.length].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault(); arr[(idx-1+arr.length)%arr.length].focus();
        }
      });
    });
    const initial = tabsRoot.querySelector('[role="tab"][aria-selected="true"]');
    if (initial) select(initial.id);
  }

  async function init(){
    try{
      ensureAddonCSS();
      const host = findListContainer();

      // Hide old #scenarioList content if the anchor exists (we will replace it)
      const old = document.getElementById('scenarioList');
      if (old) { old.hidden = true; old.setAttribute('aria-hidden', 'true'); }

      // Build tabs shell
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

      // Mount: replace anchor if present, otherwise append
      if (host && host.id === 'scenarioList' && host.parentElement) {
        host.parentElement.replaceChild(wrap, host);
      } else if (host) {
        host.appendChild(wrap);
      } else {
        document.body.appendChild(wrap);
      }

      setupTabs(tabs);

      // Load index and split beta/extras with EXTRA_IDS
      const index = await fetchJSON('/data/v2-index.json');
      const all = Array.isArray(index.scenarios) ? index.scenarios : [];
      const beta = all.filter(s => !EXTRA_IDS.has(s.id));
      const extrasList = all.filter(s => EXTRA_IDS.has(s.id));

      const cb = document.getElementById('showExtrasInMain');
      const update = () => {
        renderList(paneMain, cb && cb.checked ? beta.concat(extrasList) : beta);
        renderList(paneLabs, extrasList);
      };
      cb && cb.addEventListener('change', update);
      update();
    }catch(e){
      console.warn('extras-tabs init failed:', e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
