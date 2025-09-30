
// Auto UI Scale + Stage Fit (Full Fix 6) — JS-only
(function(){
  const vh = () => Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);

  function enforceCanvasCap(){
    const canvas = document.querySelector('.stage .canvas');
    if (!canvas) return;
    const hVar = getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim();
    const hPx = parseFloat(hVar) || 0;
    const vhCap = Math.floor(vh() * 0.50); // 50vh
    const cap = Math.min(hPx || 9999, vhCap || 9999);

    canvas.style.setProperty('height', cap + 'px', 'important');
    canvas.style.setProperty('max-height', cap + 'px', 'important');
    canvas.style.setProperty('min-height', cap + 'px', 'important');
    canvas.style.setProperty('overflow', 'hidden', 'important');
  }

  const init = () => { enforceCanvasCap(); };
  document.addEventListener('DOMContentLoaded', init, { once:true });
  window.addEventListener('resize', enforceCanvasCap);
})();
