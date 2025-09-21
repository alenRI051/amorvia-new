
// dom-fixes.v9.4.js — keep scenario list under the title (id=sceneListV2), mirror + forward clicks
(function(){
  const HOST_ID = 'titleAndList';
  const TARGET_ID = 'scenarioListV2';

  function host(){ return document.getElementById(HOST_ID); }
  function findSource(){
    const list = document.getElementById(TARGET_ID);
    const cands = [list, ...document.querySelectorAll('.list.v2-only,[aria-label="Scenarios"].list,[aria-label="Scenarios"]')].filter(Boolean);
    const h = host();
    // choose any candidate NOT already inside host
    return cands.find(el => h && !h.contains(el) && el.id !== 'scenarioList') || null;
  }
  function ensureUnderTitle(){
    const h = host(); if (!h) return null;
    let under = h.querySelector('.list.v2-only,[aria-label="Scenarios"].list,[aria-label="Scenarios"]');
    if (!under) {
      under = document.createElement('div');
      under.className = 'list v2-only';
      under.setAttribute('aria-label','Scenarios');
      under.style.marginTop = '.5rem';
      h.appendChild(under);
    }
    return under;
  }
  function forwardClicks(portal, source){
    if (!portal || !source || portal.__wiredForward) return;
    portal.__wiredForward = true;
    portal.addEventListener('click', (e)=>{
      const tgt = e.target.closest('button,a,[role="button"]'); if (!tgt) return;
      const txt = (tgt.textContent||'').trim();
      const all = source.querySelectorAll('button,a,[role="button"]');
      for (const el of all) {
        if ((el.textContent||'').trim() === txt) {
          e.preventDefault();
          el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true}));
          break;
        }
      }
    }, { passive:false });
  }
  function apply(){
    const h = host(); if (!h) return;
    const source = findSource();
    const portal = ensureUnderTitle(); if (!portal) return;

    // Give the under-title list the canonical id for tests/selectors
    if (portal.id !== TARGET_ID) {
      if (source && source.id === TARGET_ID) source.removeAttribute('id');
      portal.id = TARGET_ID;
    }

    if (source) {
      source.style.display = 'none'; // hide source visually
      portal.innerHTML = source.innerHTML; // mirror content
      forwardClicks(portal, source);
    }
  }
  function init(){
    apply();
    const mo = new MutationObserver(() => apply());
    mo.observe(document.body, { childList:true, subtree:true, attributes:true, characterData:true });
  }
  (document.readyState==='loading')?document.addEventListener('DOMContentLoaded',init):init();
})();
