
// ui-toggles.v9.3.2.js — High contrast, Reset UI, Restart Act
(function(){
  const ROOT = document.documentElement;
  function track(t,p){ try{ window.amorviaTrack?.(t,p); }catch{} }

  function applyContrast(on) {
    if (on) ROOT.setAttribute('data-contrast','1');
    else ROOT.removeAttribute('data-contrast');
    const btn = document.getElementById('highContrastBtn');
    if (btn) btn.setAttribute('aria-pressed', String(!!on));
  }
  function toggleContrast() {
    const on = !ROOT.hasAttribute('data-contrast');
    applyContrast(on);
    localStorage.setItem('amorvia:contrast', on ? '1':'0');
    track('toggle_contrast',{ value:on?1:0 });
  }
  function resetUI(){
    try{ localStorage.clear(); sessionStorage.clear(); }catch{}
    if(window.Amorvia?.reset){ try{ window.Amorvia.reset(); }catch{} }
    track('ui_reset',{}); location.reload();
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
  function init(){
    applyContrast(localStorage.getItem('amorvia:contrast')==='1');
    document.getElementById('highContrastBtn')?.addEventListener('click',toggleContrast);
    document.getElementById('resetUiBtn')?.addEventListener('click',resetUI);
    document.getElementById('restartAct')?.addEventListener('click',restartAct);
  }
  (document.readyState==='loading')?document.addEventListener('DOMContentLoaded',init):init();
})();
