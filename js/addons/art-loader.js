(function(){
  const bgSel = document.getElementById('bgSelect');
  const lSel = document.getElementById('leftSelect');
  const rSel = document.getElementById('rightSelect');
  const bg = document.getElementById('bgImg');
  const li = document.getElementById('leftImg');
  const ri = document.getElementById('rightImg');
  function upd(){ if(bgSel && bg) bg.src = bgSel.value; if(lSel && li) li.src = lSel.value; if(rSel && ri) ri.src = rSel.value; }
  [bgSel,lSel,rSel].forEach(s => s && s.addEventListener('change', upd));
  upd();
})();