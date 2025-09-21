
// ui-toggles.v9.3.1.js — robust buttons + fallbacks
(function(){
  const ROOT = document.documentElement;
  const STORAGE = 'amorvia:ui';
  const state = JSON.parse(localStorage.getItem(STORAGE) || '{}');
  function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
  function applyContrast(){
    if (state.contrast === 1) ROOT.setAttribute('data-contrast','1');
    else ROOT.removeAttribute('data-contrast');
    const btn = document.querySelector('[data-action="high-contrast"], #btn-high-contrast');
    if (btn) btn.setAttribute('aria-pressed', String(state.contrast === 1));
  }
  function resetUI(){
    try { localStorage.clear(); sessionStorage.clear(); } catch{}
    if (window.Amorvia?.reset) { try { window.Amorvia.reset(); } catch{} }
    if (window.amorviaTrack) window.amorviaTrack('ui_reset', {});
    location.reload();
  }
  function restartAct(){
    let restarted = false;
    try {
      if (window.Amorvia?.restartAct) { window.Amorvia.restartAct(); restarted = true; }
      else if (window.amorviaEngine?.restartAct) { window.amorviaEngine.restartAct(); restarted = true; }
    } catch(e){}
    if (!restarted) {
      // Fallback: if hash looks like #act=..., re-apply it; otherwise just reload
      try {
        if (location.hash) { const h = location.hash; location.hash = ''; setTimeout(()=>location.hash = h, 0); }
        else { location.reload(); }
      } catch { location.reload(); }
    }
    if (window.amorviaTrack) window.amorviaTrack('restart_act', { restarted });
  }
  function onReady(){
    const q = (sel)=>document.querySelector(sel);
    const btnContrast = q('[data-action="high-contrast"]') || q('#btn-high-contrast');
    const btnReset = q('[data-action="reset-ui"]') || q('#btn-reset-ui');
    const btnRestart = q('[data-action="restart-act"]') || q('#btn-restart-act');
    if (btnContrast) btnContrast.addEventListener('click', ()=>{ state.contrast = state.contrast === 1 ? 0 : 1; save(); applyContrast(); if (window.amorviaTrack) window.amorviaTrack('toggle_contrast', { value: state.contrast }); });
    if (btnReset) btnReset.addEventListener('click', resetUI);
    if (btnRestart) btnRestart.addEventListener('click', restartAct);
    applyContrast();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady); else onReady();
})();
