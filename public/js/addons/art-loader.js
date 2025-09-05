
// Simple image loader for background and characters
(function(){
  function byId(id){ return document.getElementById(id); }
  function bind(selectId, imgId){
    const sel = byId(selectId);
    const img = byId(imgId);
    if (!sel || !img) return;
    function apply(){ const v = sel.value; if (img.tagName === 'IMG') img.src = v; else if (img) img.style.backgroundImage = `url(${v})`; }
    sel.addEventListener('change', apply);
    apply();
  }
  function init(){
    bind('bgSelect', 'bgImg');
    bind('leftSelect', 'leftImg');
    bind('rightSelect', 'rightImg');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
