
/**
 * Extras/Labs Tabs Addon
 * - Builds "Scenarios" and "Labs" tabs in the left sidebar.
 * - Shows extras in a separate list; optional checkbox to also show extras in main list.
 * - Dispatches 'amorvia:select-scenario' event on click, and falls back to engine calls if available.
 */
(function(){
  const EXTRA_IDS = new Set(['different-rules','scene-first-agreements','scene-new-introductions','scene-de-escalation']);

  function h(tag, props={}, ...children){
    const el = document.createElement(tag);
    Object.entries(props||{}).forEach(([k,v])=>{
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    });
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
    const ul = h('div', { class: 'list', role: 'list' });
    scenarios.forEach(s => {
      const btn = h('button', { class: 'button', role:'listitem', 'data-id': s.id, onClick: ()=>openScenarioById(s.id) }, s.title || s.id);
      ul.appendChild(btn);
    });
    container.appendChild(ul);
  }

  async function init(){
    try{
      const aside = findListContainer();
      const old = document.getElementById('scenarioList');
      if (old) { old.hidden = true; old.setAttribute('aria-hidden', 'true'); }

      const wrap = h('div', { id:'labsTabs', class:'v2-only' });
      const bar = h('div', { class:'toolbar', style:'border:none; padding:0; margin:0 0 8px 0;' },
        h('button', { class:'button', id:'tabMain', 'aria-selected':'true' }, 'Scenarios'),
        h('button', { class:'button', id:'tabLabs', 'aria-selected':'false' }, 'Labs'),
        h('label', { style:'margin-left:auto; display:flex; align-items:center; gap:6px' },
          h('input', { type:'checkbox', id:'showExtrasInMain' }),
          h('span', {}, 'Show extras in main')
        )
      );
      const paneMain = h('div', { id:'listMain' });
      const paneLabs = h('div', { id:'listLabs', hidden:'true' });
      wrap.append(bar, paneMain, paneLabs);
      aside.appendChild(wrap);

      function select(tab){
        const onMain = tab === 'main';
        paneMain.hidden = !onMain;
        paneLabs.hidden = onMain;
        document.getElementById('tabMain').setAttribute('aria-selected', String(onMain));
        document.getElementById('tabLabs').setAttribute('aria-selected', String(!onMain));
      }

      document.getElementById('tabMain').addEventListener('click', ()=>select('main'));
      document.getElementById('tabLabs').addEventListener('click', ()=>select('labs'));

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
