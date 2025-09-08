// art-wire.js — seeds and wires bg/left/right images with selects
(function () {
  function $(id){ return document.getElementById(id); }
  function applyArt(){
    const bgSel=$('bgSelect'), leftSel=$('leftSelect'), rightSel=$('rightSelect');
    const bgImg=$('bgImg'), leftImg=$('leftImg'), rightImg=$('rightImg');
    if(bgSel && bgImg && bgSel.value) bgImg.src = bgSel.value;
    if(leftSel && leftImg && leftSel.value) leftImg.src = leftSel.value;
    if(rightSel && rightImg && rightSel.value) rightImg.src = rightSel.value;
  }
  function wire(){
    ['bgSelect','leftSelect','rightSelect'].forEach(id=>{
      const el=$(id); if(!el) return;
      el.addEventListener('change', applyArt);
    });
    applyArt();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once:true });
  } else {
    wire();
  }
})();
