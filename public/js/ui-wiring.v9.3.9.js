
// ui-wiring.v9.3.9.js — robust handlers for High contrast, Reset UI, Restart Act
(function(){
  const ROOT = document.documentElement;
  function track(t,p){ try{ window.amorviaTrack?.(t,p); }catch{} }

  function applyContrast(on){
    if (on) ROOT.setAttribute('data-contrast','1');
    else ROOT.removeAttribute('data-contrast');
    const btn = document.getElementById('highContrastBtn') || document.querySelector('[data-action="high-contrast"]');
    if (btn) btn.setAttribute('aria-pressed', String(!!on));
    try { localStorage.setItem('amorvia:contrast', on ? '1' : '0'); } catch {}
  }
  // init state
  applyContrast((localStorage.getItem('amorvia:contrast')||'0') === '1');

  function resetUI(){
    try{ localStorage.clear(); sessionStorage.clear(); }catch{}
    if (window.Amorvia?.reset) { try { window.Amorvia.reset(); } catch {} }
    track('ui_reset',{});
    location.reload();
  }
  function restartAct(){
    let restarted=false;
    try{
      if(window.Amorvia?.restartAct){ window.Amorvia.restartAct(); restarted=true; }
      else if(window.amorviaEngine?.restartAct){ window.amorviaEngine.restartAct(); restarted=true; }
    }catch(e){}
    if(!restarted){
      if(location.hash){ const h=location.hash; location.hash=''; setTimeout(()=>location.hash=h,0); }
      else location.reload();
    }
    track('restart_act',{restarted});
  }

  // Delegate clicks so we don't depend on exact IDs
  document.addEventListener('click', (e)=>{
    const el = e.target.closest('button, [role="button"]'); if(!el) return;
    const text = (el.textContent||'').trim();
    if (el.id === 'highContrastBtn' || el.dataset.action === 'high-contrast' || /high\s*contrast/i.test(text)) {
      e.preventDefault(); applyContrast(!ROOT.hasAttribute('data-contrast')); track('toggle_contrast',{ value: ROOT.hasAttribute('data-contrast') ? 1 : 0 });
    } else if (el.id === 'resetUiBtn' || el.dataset.action === 'reset-ui' || /reset\s*ui/i.test(text)) {
      e.preventDefault(); resetUI();
    } else if (el.id === 'restartAct' || el.dataset.action === 'restart-act' || /restart\s*act/i.test(text)) {
      e.preventDefault(); restartAct();
    }
  });

  // Keyboard shortcuts (H, R, Shift+R)
  window.addEventListener('keydown', (e)=>{
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.isComposing) return;
    if (e.key === 'h' || e.key === 'H') { e.preventDefault(); applyContrast(!ROOT.hasAttribute('data-contrast')); return; }
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); e.shiftKey ? resetUI() : restartAct(); }
  });
})();
