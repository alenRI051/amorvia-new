
(function(){
  function apply(){
    const bg = document.getElementById('bgImg');
    const left = document.getElementById('leftImg');
    const right = document.getElementById('rightImg');
    const bgSel = document.getElementById('bgSelect');
    const lSel = document.getElementById('leftSelect');
    const rSel = document.getElementById('rightSelect');
    if (bg && bgSel) bg.src = bgSel.value;
    if (left && lSel) left.src = lSel.value;
    if (right && rSel) right.src = rSel.value;
  }
  ['change','input'].forEach(evt => {
    ['bgSelect','leftSelect','rightSelect'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(evt, apply);
    });
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
