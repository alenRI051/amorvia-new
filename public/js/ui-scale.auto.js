function enforceCanvasCap(){
  const canvas = document.querySelector('.stage .canvas');
  if (!canvas) return;
  const hVar = getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim();
  const hPx = parseFloat(hVar) || 0;
  const vhCap = Math.floor(Math.max(window.innerHeight, document.documentElement.clientHeight) * 0.50);
  const cap = Math.min(hPx || 9999, vhCap || 9999);
  canvas.style.setProperty('height', cap + 'px', 'important');
  canvas.style.setProperty('max-height', cap + 'px', 'important');
  canvas.style.setProperty('min-height', cap + 'px', 'important');
  canvas.style.setProperty('overflow', 'hidden', 'important');
}
document.addEventListener('DOMContentLoaded', enforceCanvasCap);
window.addEventListener('resize', enforceCanvasCap);
