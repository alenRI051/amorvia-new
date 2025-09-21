
// dom-fixes.v9.3.10.js — Scenario list "portal" to keep it under the title
(function(){
  const HOST_ID = 'titleAndList';
  const PORTAL_ID = 'scenarioListPortal';

  function findSourceList(){
    // Candidates: prefer v2 list
    const cands = [];
    const byId = document.getElementById('scenarioListV2');
    if (byId) cands.push(byId);
    cands.push(...document.querySelectorAll('.list.v2-only,[aria-label="Scenarios"].list,[aria-label="Scenarios"]'));
    // Exclude obvious v1 list
    return cands.find(el => el && el.id !== 'scenarioList') || null;
  }

  function ensurePortal(){
    const host = document.getElementById(HOST_ID);
    if (!host) return null;
    let portal = document.getElementById(PORTAL_ID);
    if (!portal) {
      portal = document.createElement('div');
      portal.id = PORTAL_ID;
      portal.className = 'list v2-only';
      portal.setAttribute('aria-label', 'Scenarios');
      portal.style.marginTop = '.5rem';
      host.appendChild(portal);
    }
    return portal;
  }

  function mirror(source, portal){
    if (!source || !portal) return;
    // Keep a weak map from source nodes to cloned nodes if needed; for now we mirror innerHTML
    portal.innerHTML = source.innerHTML;

    // Delegate clicks in the portal back to the original by matching text content + data attributes
    portal.addEventListener('click', function(e){
      const tgt = e.target.closest('button,a,[role="button"]');
      if (!tgt) return;
      // Try to find a matching button in source by text
      const txt = (tgt.textContent||'').trim();
      const all = source.querySelectorAll('button,a,[role="button"]');
      let match = null;
      for (const el of all) {
        if ((el.textContent||'').trim() === txt) { match = el; break; }
      }
      if (match) {
        e.preventDefault();
        match.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, composed:true }));
      }
    }, { passive: false });
  }

  function init(){
    const source = findSourceList();
    const portal = ensurePortal();
    if (!portal) return;

    if (source) {
      // Hide the original and mirror content initially
      source.style.display = 'none';
      mirror(source, portal);

      // Observe source changes and keep portal in sync
      const mo = new MutationObserver(() => mirror(source, portal));
      mo.observe(source, { childList:true, subtree:true, attributes:true, characterData:true });
    } else {
      // If source isn't found yet, poll briefly and install a body observer
      const look = setInterval(() => {
        const s = findSourceList();
        if (s) { clearInterval(look); s.style.display = 'none'; mirror(s, ensurePortal()); 
          const mo = new MutationObserver(() => mirror(s, ensurePortal()));
          mo.observe(s, { childList:true, subtree:true, attributes:true, characterData:true });
        }
      }, 200);
      setTimeout(() => clearInterval(look), 8000);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
