
/**
 * Amorvia Extras/Labs Tabs — v0.6 re-parent guard
 * - Prefers #scenarioListV2 (or visible #scenarioList.v2-only)
 * - If tabs already exist, re-parent them under the anchor (avoids duplicates)
 * - Otherwise builds UI and inserts AFTER the anchor (keeps anchor in DOM)
 * - Injects /css/addons.css
 */
(function(){
  const EXTRA_IDS = new Set(['different-rules','scene-first-agreements','scene-new-introductions','scene-de-escalation']);

  function ensureAddonCSS(){
    const href = '/css/addons.css';
    if (![...document.styleSheets].some(s => (s.href||'').endsWith(href))) {
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

  function waitFor(selector, {timeout=8000, root=document}={}){
    return new Promise(resolve => {
      const found = root.querySelector(selector);
      if (found) return resolve(found);
      const obs = new MutationObserver(() => {
        const el = root.querySelector(selector);
        if (el) { obs.disconnect(); resolve(el); }
      });
      obs.observe(root, {childList:true, subtree:true});
      if (timeout > 0) setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
    });
  }

  function findSidebarFallback(){
    return (
      document.querySelector('.v2-only .list')?.closest('aside, .sidebar, .panel, .left, .column, .wrap, div') ||
      document.querySelector('aside.card.panel') ||
      document.querySelector('aside.sidebar') ||
      document.querySelector('aside') ||
      document.querySelector('.sidebar,.left,.left-pane,.panel') ||
      document.body
    );
  }

  async function fetchJSON(url){
    const res = await fetch(url, { credentials:'same-origin', cache:'no-cache' });
    if (!res.ok) throw new Error('HTTP '+res.status+' for '+url);
    return res.json();
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
    const list = h('div', { class:'list av-list', role:'list' });
    scenarios.forEach(s => {
      const btn = h('button', { class:'button av-item', role:'listitem', 'data-id': s.id, onClick: ()=>openScenarioById(s.id) }, s.title || s.id);
      list.appendChild(btn);
    });
    container.appendChild(list);
  }

  function setupTabs(tabsRoot){
    const tabs = tabsRoot.querySelectorAll('[role="tab"]');
    function select(id){
      tabs.forEach(btn => {
        const active = btn.id === id;
        btn.setAttribute('aria-selected', String(active));
        btn.classList.toggle('av-tab-active', active);
        const panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (panel) panel.hidden = !active;
      });
    }
    tabs.forEach(btn => {
      btn.addEventListener('click', () => select(btn.id));
      btn.addEventListener('keydown', e => {
        const arr = Array.from(tabs);
        const i = arr.indexOf(btn);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); arr[(i+1)%arr.length].focus(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); arr[(i-1+arr.length)%arr.length].focus(); }
      });
    });
    const initial = tabsRoot.querySelector('[role="tab"][aria-selected="true"]');
    if (initial) select(initial.id);
  }

  async function mount(){
    ensureAddonCSS();

    // Prefer v2 anchor; ignore v1 block
    const anchor = await waitFor('#scenarioListV2, #scenarioList.v2-only', { timeout: 4000 });
    const host = anchor || findSidebarFallback();

    // If tabs UI already exists, re-parent it under the anchor and bail
    const existingTabs = document.getElementById('labsTabs');
    const existingWrap = existingTabs ? existingTabs.closest('.av-wrap') : null;
    if (existingWrap) {
      if (anchor) {
        anchor.insertAdjacentElement('afterend', existingWrap);
      } else {
        host.appendChild(existingWrap);
      }
      return;
    }

    // Build fresh UI
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

    if (anchor && anchor.parentElement) {
      anchor.insertAdjacentElement('afterend', wrap);
    } else {
      host.appendChild(wrap);
    }

    setupTabs(tabs);

    try {
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
    } catch (e) {
      console.warn('extras-tabs: failed to load index', e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
