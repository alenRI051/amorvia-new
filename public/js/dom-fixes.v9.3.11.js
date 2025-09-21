
// dom-fixes.v9.3.11.js — ensure the list under #titleAndList has id="scenarioListV2"
(function(){
  const HOST_ID = 'titleAndList';
  const TARGET_ID = 'scenarioListV2'; // what the self-test checks

  function findHost(){ return document.getElementById(HOST_ID); }
  function findSource(){
    // real list somewhere else
    const cands = [];
    const byId = document.getElementById(TARGET_ID);
    if (byId) cands.push(byId);
    cands.push(...document.querySelectorAll('.list.v2-only,[aria-label="Scenarios"].list,[aria-label="Scenarios"]'));
    // exclude anything already under host
    const host = findHost();
    const out = cands.find(el => el && host && !host.contains(el));
    return out || null;
  }
  function findUnderTitle(){
    const host = findHost();
    if (!host) return null;
    // Prefer an existing list inside host
    let under = host.querySelector('.list.v2-only,[aria-label="Scenarios"].list,[aria-label="Scenarios"]');
    if (!under) {
      under = document.createElement('div');
      under.className = 'list v2-only';
      under.setAttribute('aria-label','Scenarios');
      under.style.marginTop = '.5rem';
      host.appendChild(under);
    }
    return under;
  }

  function forwardClicks(portal, source){
    if (!portal || !source) return;
    if (portal.__wiredForward) return;
    portal.__wiredForward = true;
    portal.addEventListener('click', function(e){
      const tgt = e.target.closest('button,a,[role="button"]'); if (!tgt) return;
      const txt = (tgt.textContent||'').trim();
      const all = source.querySelectorAll('button,a,[role="button"]');
      let match=null;
      for (const el of all) { if ((el.textContent||'').trim() === txt) { match=el; break; } }
      if (match) { e.preventDefault(); match.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true})); }
    }, { passive:false });
  }

  function apply(){
    const host = findHost(); if (!host) return;
    const source = findSource();
    const portal = findUnderTitle();
    if (!portal) return;

    // Move the TARGET_ID to the under-title list
    if (portal.id !== TARGET_ID) {
      // Remove id from source if present to avoid duplicates
      if (source && source.id === TARGET_ID) source.removeAttribute('id');
      portal.id = TARGET_ID;
    }

    // Hide source (visuals) but keep it for event handling
    if (source) source.style.display = 'none';

    // Mirror content
    if (source) portal.innerHTML = source.innerHTML;

    // Forward clicks from portal to source
    forwardClicks(portal, source);
  }

  function init(){
    apply();
    const mo = new MutationObserver(() => apply());
    mo.observe(document.body, { childList:true, subtree:true, attributes:true, characterData:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
