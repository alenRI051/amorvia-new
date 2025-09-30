
/*! Amorvia Dev Tools QA v1.0 */
(function () {
  function vh(){return Math.max(window.innerHeight||0, document.documentElement.clientHeight||0);}
  function enforce(){
    const c=document.querySelector('.stage .canvas'); if(!c) return false;
    const hVar=getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim();
    const hPx=parseFloat(hVar)||0; const vhCap=Math.floor(vh()*0.50); const cap=Math.min(hPx||9999, vhCap||9999);
    c.style.setProperty('height',cap+'px','important'); c.style.setProperty('max-height',cap+'px','important'); c.style.setProperty('min-height',cap+'px','important');
    c.style.setProperty('overflow','hidden','important'); return true;
  }
  function print(){
    const s=document.querySelector('.stage'); const c=document.querySelector('.stage .canvas'); if(!c){console.warn('[AmorviaQA] Canvas not found.'); return false;}
    const cs=getComputedStyle(c); console.table({
      ts:new Date().toLocaleTimeString(),
      viewportH:Math.max(innerHeight,document.documentElement.clientHeight),
      '--stage-max-h':getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim(),
      'inline.height':c.style.height||'(none)','inline.maxHeight':c.style.maxHeight||'(none)','inline.minHeight':c.style.minHeight||'(none)',
      'cs.height':cs.height,'cs.minHeight':cs.minHeight,'cs.maxHeight':cs.maxHeight,'clientHeight':c.clientHeight,'stage.minHeight':s?.style.minHeight||'(none)',
    }); return true;
  }
  window.AmorviaQA={print,enforce};
  window.addEventListener('keydown',(e)=>{ if(e.altKey&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&e.code==='KeyD'){e.preventDefault();print();} else
    if(e.altKey&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&e.code==='KeyR'){e.preventDefault();enforce();print();}});
  setTimeout(()=>console.log('%c[AmorviaQA] Ready. Alt+D = diagnostics, Alt+R = re-apply cap','color:#10b981'),0);
})();
