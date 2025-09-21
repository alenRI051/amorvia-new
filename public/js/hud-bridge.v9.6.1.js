
// hud-bridge.v9.6.1.js — route metrics to HUD and remove legacy text lines
(function(){
  'use strict';
  const $ = (s, el=document)=> el.querySelector(s);

  // Mark HUD as active for CSS hooks
  document.documentElement.setAttribute('data-hud-active','1');

  // 1) Forward engine updates into the visual HUD
  function bindEngine(){
    const eng = window.Amorvia || window.amorviaEngine;
    if (!eng) { setTimeout(bindEngine, 200); return; }
    if (window.amorviaHudBindEngine){
      try { window.amorviaHudBindEngine(eng); } catch {}
    }
    // As a safety net, wrap updateHud to always render HUD
    const fn = eng && (eng.updateHud || eng.setHud);
    if (typeof fn === 'function' && !fn.__hudForward){
      const orig = fn;
      const wrapped = function(...args){
        try { window.amorviaHudRender && window.amorviaHudRender(args[0]||{}); } catch {}
        return orig.apply(this, args);
      };
      wrapped.__hudForward = true;
      if (eng.updateHud) eng.updateHud = wrapped; else eng.setHud = wrapped;
    }
  }
  bindEngine();

  // 2) Remove 'trust: N', 'tension: N', 'childStress: N' text from #dialog
  const rxLine = /^\s*(trust|tension|child\s*stress|childStress)\s*[:=]\s*\d+\s*$/i;
  const rxInline = /(?:^|>)\s*(trust|tension|child\s*stress|childStress)\s*[:=]\s*\d+\s*(?:<br\s*\/?>)?/gi;

  function cleanDialog(el){
    if (!el) return;
    const html = el.innerHTML;
    // Fast path: if nothing matches, skip
    if (!/(trust|tension|child\s*stress|childStress)\s*[:=]\s*\d+/.test(html)) return;
    // Split into lines on <br> boundaries, remove metric-only lines, then collapse extra <br>
    const parts = html.split(/<br\s*\/?>(?![^]*<br)/i); // conservative split
    const filtered = html
      .split(/<br\s*\/?>(?=\s*|)/i)
      .filter(line => !rxLine.test(line.replace(/<[^>]+>/g,'')))
      .join('<br>');
    // Also strip any inline remnants
    const cleaned = filtered.replace(rxInline, '');
    if (cleaned !== html) el.innerHTML = cleaned.replace(/(?:<br>\s*){2,}/g,'<br>');
  }

  function observeDialog(){
    const host = $('#dialog');
    if (!host) { setTimeout(observeDialog, 300); return; }
    const mo = new MutationObserver(() => cleanDialog(host));
    mo.observe(host, { childList:true, subtree:true, characterData:true });
    // initial pass
    cleanDialog(host);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', observeDialog) : observeDialog();
})();
