// hud-bridge.v9.6.8.js
// Bridges legacy inline tokens (trust/tension/childStress) to the new HUD and removes them from dialog.
(function(){
  'use strict';

  const TOKEN_RX = /\b(trust|tension|child\s*stress|childStress)\s*[:=]?\s*(\d{1,3})\b/gi;

  function parseMetrics(text){
    const out = {};
    text.replace(TOKEN_RX, (_, k, v) => {
      const key = (k.toLowerCase().replace(/\s+/g,'') === 'childstress') ? 'childStress' : k.toLowerCase();
      const n = Math.max(0, Math.min(100, parseInt(v,10)));
      if (key === 'trust') out.trust = n;
      else if (key === 'tension') out.tension = n;
      else out.childStress = n;
      return '';
    });
    return out;
  }

  // Remove tokens from text nodes without disturbing other markup
  function scrubDialogTokens(root){
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const tn of nodes){
      if (TOKEN_RX.test(tn.nodeValue)) {
        tn.nodeValue = tn.nodeValue.replace(TOKEN_RX, '').replace(/\s{2,}/g,' ');
      }
    }
  }

  function ensureHudIsVisible(){
    const hud = document.getElementById('hud');
    if (!hud) return;
    hud.style.display = (getComputedStyle(hud).display === 'none') ? 'grid' : getComputedStyle(hud).display;
  }

  function handleDialogChange(){
    const dialog = document.getElementById('dialog');
    if (!dialog) return;

    const text = dialog.textContent || '';
    const metrics = parseMetrics(text);
    if (Object.keys(metrics).length && typeof window.amorviaHudRender === 'function'){
      try { window.amorviaHudRender(metrics); } catch {}
      // scrub tokens after rendering
      scrubDialogTokens(dialog);
    }
    ensureHudIsVisible();
  }

  function init(){
    const dialog = document.getElementById('dialog');
    if (!dialog) { setTimeout(init, 250); return; }
    // Run once on start (in case content already present)
    handleDialogChange();
    // Observe for new changes
    const mo = new MutationObserver(handleDialogChange);
    mo.observe(dialog, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();