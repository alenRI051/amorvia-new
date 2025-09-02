\
(function(){
  function by(id){ return document.getElementById(id); }
  function init(){
    const bgSel = by('bgSelect'), leftSel = by('leftSelect'), rightSel = by('rightSelect');
    const bgImg = by('bgImg'), leftImg = by('leftImg'), rightImg = by('rightImg');
    function apply(){
      if (bgImg && bgSel) bgImg.src = bgSel.value;
      if (leftImg && leftSel) leftImg.src = leftSel.value;
      if (rightImg && rightSel) rightImg.src = rightSel.value;
    }
    [bgSel,leftSel,rightSel].forEach(sel=> sel && sel.addEventListener('change', apply));
    apply();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
