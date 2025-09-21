
// ui-toggles.js (v9.3)
(function() {
  const ROOT = document.documentElement;
  const STORAGE = 'amorvia:ui';
  const state = JSON.parse(localStorage.getItem(STORAGE) || '{}');
  function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
  function applyContrast(){ if (state.contrast === 1) ROOT.setAttribute('data-contrast','1'); else ROOT.removeAttribute('data-contrast'); }
  function resetUI(){
    localStorage.clear(); sessionStorage.clear();
    if (window.Amorvia?.reset) { try { window.Amorvia.reset(); } catch {} }
    if (window.amorviaTrack) window.amorviaTrack('ui_reset', {});
    location.reload();
  }
  function restartAct(){
    try {
      if (window.Amorvia?.restartAct) window.Amorvia.restartAct();
      else if (window.amorviaEngine?.restartAct) window.amorviaEngine.restartAct();
      else console.warn('[Amorvia] restartAct not found');
      if (window.amorviaTrack) window.amorviaTrack('restart_act', {});
    } catch(e) { console.warn('[Amorvia] restartAct error', e); }
  }
  function onReady(){
    const c=document.getElementById('btn-high-contrast'), r=document.getElementById('btn-reset-ui'), s=document.getElementById('btn-restart-act');
    if (c) c.addEventListener('click', () => { state.contrast = state.contrast === 1 ? 0 : 1; save(); applyContrast(); if (window.amorviaTrack) window.amorviaTrack('toggle_contrast', { value: state.contrast }); });
    if (r) r.addEventListener('click', resetUI);
    if (s) s.addEventListener('click', restartAct);
    applyContrast();
    const RESET_EVERY_LOAD = false; if (RESET_EVERY_LOAD) resetUI();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady); else onReady();
})();
