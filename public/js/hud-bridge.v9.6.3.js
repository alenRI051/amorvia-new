// hud-bridge.v9.6.3.js — stronger cleanup + HUD re-enforcer
(function(){
  'use strict';
  const $ = (s, el=document)=> el.querySelector(s);

  // Keep last known HUD values
  let lastVals = { trust:0, tension:0, childStress:0 };

  function cleanDialog(el){
    if (!el) return;
    let html = el.innerHTML;
    if (!html) return;

    // Strip out lines with trust/tension/childStress
    const cleaned = html.replace(/(?:trust|tension|child\s*stress|childStress)\s*[:=]\s*\d+\s*<br?>?/gi, '');
    if (cleaned !== html) {
      el.innerHTML = cleaned.replace(/(?:<br>\s*){2,}/g,'<br>');
    }

    // Always re-render HUD with last known values
    try {
      if (window.amorviaHudRender) {
        window.amorviaHudRender(lastVals);
      }
    } catch(e){ console.warn('[HUD bridge] re-render failed', e); }
  }

  function observeDialog(){
    const host = $('#dialog');
    if (!host) { setTimeout(observeDialog, 300); return; }
    const mo = new MutationObserver(() => cleanDialog(host));
    mo.observe(host, { childList:true, subtree:true, characterData:true });
    cleanDialog(host);
  }

  // Wrap HUD renderer to track last values
  const orig = window.amorviaHudRender;
  window.amorviaHudRender = function(state){
    lastVals = {
      trust: state.trust ?? lastVals.trust,
      tension: state.tension ?? lastVals.tension,
      childStress: state.childStress ?? state.stress ?? lastVals.childStress
    };
    if (orig) return orig.apply(this, arguments);
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', observeDialog)
    : observeDialog();
})();
