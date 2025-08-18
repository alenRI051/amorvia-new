/* Amorvia bootstrap - char/bg wiring, relative imports, health logs (ASCII) */
(function(){
  function $(id){ return document.getElementById(id); }

  var bgImg = $('bgImg');
  var leftImg = $('leftImg');
  var rightImg = $('rightImg');
  var bgSel = $('bgSelect');
  var leftSel = $('leftSelect');
  var rightSel = $('rightSelect');

  function applyCharAndBg(){
    if (bgImg && bgSel && bgSel.value) bgImg.src = bgSel.value;
    if (leftImg && leftSel && leftSel.value) leftImg.src = leftSel.value;
    if (rightImg && rightSel && rightSel.value) rightImg.src = rightSel.value;
  }
  ['change'].forEach(function(evt){
    if (bgSel) bgSel.addEventListener(evt, applyCharAndBg);
    if (leftSel) leftSel.addEventListener(evt, applyCharAndBg);
    if (rightSel) rightSel.addEventListener(evt, applyCharAndBg);
  });
  applyCharAndBg();

  function getMode(){ return localStorage.getItem('amorvia:mode') || 'v2'; }
  function setMode(m){ try{ localStorage.setItem('amorvia:mode', m); }catch{} }

  function applyModeToDOM(mode){
    document.body.classList.remove('mode-v1','mode-v2');
    document.body.classList.add(mode === 'v2' ? 'mode-v2' : 'mode-v1');
    document.querySelectorAll('.v1-only').forEach(function(el){ var on = mode === 'v1'; el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); });
    document.querySelectorAll('.v2-only').forEach(function(el){ var on = mode === 'v2'; el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); });
  }

  var modeSel = $('modeSelect');
  if (modeSel) {
    var initial = getMode();
    modeSel.value = initial;
    applyModeToDOM(initial);
    modeSel.addEventListener('change', function(){
      setMode(modeSel.value);
      location.reload();
    });
  } else {
    applyModeToDOM(getMode());
  }

  // Health check - log if modules are served as HTML
  (async function(){
    try {
      const urls = ['/js/app.v2.js','/js/engine/scenarioEngine.js','/js/app.js'];
      for (const u of urls) {
        const r = await fetch(u, { cache: 'no-store' });
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('javascript') && !ct.includes('module')) {
          console.warn('[health] Non-JS content-type for', u, '=>', ct, r.status);
        }
      }
    } catch (e) { /* ignore */ }
  })();

  var loaded = false;
  async function loadChosenApp(){
    if (loaded) return;
    loaded = true;
    var mode = getMode();
    var url = mode === 'v2' ? './app.v2.js' : './app.js';
    try{
      console.debug('[bootstrap] importing', url, 'mode=', mode);
      var m = await import(url);
      if (mode === 'v1' && m && typeof m.init === 'function') m.init();
    }catch(e){
      console.error('Failed to start app. Module:', url, 'Mode:', mode, e);
    }
  }

  ['click','keydown','pointerdown'].forEach(function(evt){
    window.addEventListener(evt, loadChosenApp, { once: true });
  });
  if ('requestIdleCallback' in window) requestIdleCallback(loadChosenApp, { timeout: 2000 });
  else setTimeout(loadChosenApp, 2000);
})();