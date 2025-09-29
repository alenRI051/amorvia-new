// Auto UI Scale + Stage Fit (Full Fix 5)
(function(){
  const KEY = 'amorvia:ui:scale';
  const q = (s,r=document)=>r.querySelector(s);
  const SCALES = { '75%':0.75, '90%':0.9, '100%':1, '110%':1.1, '125%':1.25, '150%':1.5 };

  const vh = () => Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);

  function detectStageMaxH(h = vh()) {
    if (h >= 1000) return 600;
    if (h >= 900)  return 520;
    if (h >= 800)  return 430;
    if (h >= 700)  return 400;
    return 380;
  }

  function parseQueryScale(){
    try{ const m = location.search.match(/[?&]uiscale=([0-9]{2,3})%/i); return m ? `${m[1]}%` : null; }catch{ return null; }
  }

  function getDefaultScaleKey(){
    try{ const stored = localStorage.getItem(KEY); if (stored && SCALES[stored]) return stored; }catch{}
    const url = parseQueryScale(); if (url && SCALES[url]) return url;
    const bodyAttr = document.body?.getAttribute('data-ui-scale'); if (bodyAttr && SCALES[bodyAttr]) return bodyAttr;
    const meta = q('meta[name="amorvia-ui-scale"]')?.content; if (meta && SCALES[meta]) return meta;
    return vh() >= 850 ? '100%' : '90%';
  }

  function currentScaleKey(){
    const sel = document.getElementById('uiScaleSelect');
    if (sel && SCALES[sel.value]) return sel.value;
    try{ const stored = localStorage.getItem(KEY); if (stored && SCALES[stored]) return stored; }catch{}
    return getDefaultScaleKey();
  }

  function setStageMaxH(px){
    document.documentElement.style.setProperty('--stage-max-h', (px|0) + 'px');
  }

  function enforceCanvasCap(){
    const canvas = document.querySelector('.stage .canvas');
    if (!canvas) return;
    const hVar = getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim();
    const hPx = parseFloat(hVar) || 0;
    const vhCap = Math.floor(vh() * 0.50); // 50vh
    const cap = Math.min(hPx || 9999, vhCap || 9999);
    canvas.style.setProperty('height', cap + 'px', 'important');
    canvas.style.setProperty('max-height', cap + 'px', 'important');
    canvas.style.setProperty('overflow', 'hidden', 'important');
  }

  function applyScaleKey(key){
    const s = SCALES[key] ?? 1;
    const stage = q('.stage');
    const hud = document.getElementById('hud');
    if (stage){
      stage.style.setProperty('--ui-scale', s);
      stage.style.transform = `scale(${s})`;
      stage.style.transformOrigin = 'top center';
      const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim();
      const basePx = parseFloat(cssVar) || 0;
      stage.style.minHeight = basePx ? Math.round(basePx * s) + 'px' : '';
    }
    if (hud){
      hud.style.fontSize = `calc(1rem * ${Math.min(1, s)})`;
    }
    try{ localStorage.setItem(KEY, key); }catch{}
    enforceCanvasCap();
  }

  function mountSelector(){
    const host = q('.panel.toolbar.row') || q('#topBar');
    if (!host || q('#uiScaleSelect', host)) return;
    const wrap = document.createElement('div');
    wrap.className = 'row'; wrap.style.gap = '.5rem';
    const label = Object.assign(document.createElement('label'), { className:'sr-only', htmlFor:'uiScaleSelect', textContent:'UI scale' });
    const sel = Object.assign(document.createElement('select'), { id:'uiScaleSelect', className:'select', ariaLabel:'UI scale' });
    sel.innerHTML = Object.keys(SCALES).map(k=>`<option value="${k}">Scale ${k}</option>`).join('');
    sel.value = getDefaultScaleKey();
    sel.addEventListener('change', () => applyScaleKey(sel.value));
    wrap.appendChild(label); wrap.appendChild(sel); host.appendChild(wrap);
  }

  window.setAmorviaUiScale = function(key){
    if (!SCALES[key]) { console.warn('Unknown scale key:', key); return; }
    const sel = document.getElementById('uiScaleSelect');
    if (sel) sel.value = key;
    applyScaleKey(key);
  };

  function init(){
    setStageMaxH(detectStageMaxH());
    mountSelector();
    applyScaleKey(currentScaleKey());
    enforceCanvasCap();
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        setStageMaxH(detectStageMaxH());
        applyScaleKey(currentScaleKey());
        enforceCanvasCap();
      }, 100);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init, { once:true });
})();

