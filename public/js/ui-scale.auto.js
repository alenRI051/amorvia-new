
// Auto UI Scale + Stage Fit
// - Detects viewport height and sets a default stage height & scale
// - Honors localStorage / URL ?uiscale= / body[data-ui-scale] / meta override
// - Adds dropdown and exposes window.setAmorviaUiScale('%')
(function () {
  const KEY = 'amorvia:ui:scale';
  const q = (s,r=document)=>r.querySelector(s);
  const SCALES = { '75%':0.75, '90%':0.9, '100%':1, '110%':1.1, '125%':1.25, '150%':1.5 };

  function vh() { return Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0); }

  function detectStageMaxH(h = vh()) {
    // Auto-pick stage max height by viewport
    // >= 1000: 600px; 900-999: 520px; 800-899: 460px; 700-799: 420px; <700: 380px
    if (h >= 1000) return 600;
    if (h >= 900)  return 520;
    if (h >= 800)  return 430;
    if (h >= 700)  return 400;
    return 380;
  }

  function parseQueryScale() {
    try {
      const m = location.search.match(/[?&]uiscale=([0-9]{2,3})%/i);
      return m ? `${m[1]}%` : null;
    } catch { return null; }
  }

  function getDefaultScaleKey() {
    // Priority: localStorage > URL ?uiscale= > body[data-ui-scale] > meta > auto by height
    try {
      const stored = localStorage.getItem(KEY);
      if (stored && SCALES[stored]) return stored;
    } catch {}
    const url = parseQueryScale();
    if (url && SCALES[url]) return url;
    const bodyAttr = document.body?.getAttribute('data-ui-scale');
    if (bodyAttr && SCALES[bodyAttr]) return bodyAttr;
    const meta = q('meta[name="amorvia-ui-scale"]')?.content;
    if (meta && SCALES[meta]) return meta;

    // Auto: larger default on big screens, smaller on short screens
    const h = vh();
    if (h >= 1000) return '100%';
    if (h >= 850)  return '100%';
    if (h >= 750)  return '90%';
    return '90%';
  }

  function setStageMaxH(px) {
    document.documentElement.style.setProperty('--stage-max-h', px + 'px');
  }

  function applyScaleKey(key) {
    const s = SCALES[key] ?? 1;
    const stage = q('.stage');
    const hud = q('#hud');
    if (stage) {
      stage.style.setProperty('--ui-scale', s);
      stage.style.transform = `scale(${s})`;
      stage.style.transformOrigin = 'top center';
      // Reserve space so scaling doesn't collapse flow
      const rect = stage.getBoundingClientRect();
      stage.style.minHeight = (rect.height * s) + 'px';
    }
    if (hud) hud.style.fontSize = `calc(1rem * ${Math.min(1, s)})`;
    try { localStorage.setItem(KEY, key); } catch {}
  }

  function mountSelector() {
    const host = q('.panel.toolbar.row') || q('#topBar');
    if (!host || q('#uiScaleSelect', host)) return;
    const wrap = document.createElement('div');
    wrap.className = 'row'; wrap.style.gap = '.5rem';
    const label = Object.assign(document.createElement('label'), {
      className:'sr-only', htmlFor:'uiScaleSelect', textContent:'UI scale'
    });
    const sel = Object.assign(document.createElement('select'), {
      id:'uiScaleSelect', className:'select', ariaLabel:'UI scale'
    });
    sel.innerHTML = Object.keys(SCALES).map(k=>`<option value="${k}">Scale ${k}</option>`).join('');
    const current = getDefaultScaleKey();
    sel.value = current;
    sel.addEventListener('change', () => applyScaleKey(sel.value));
    wrap.appendChild(label); wrap.appendChild(sel);
    host.appendChild(wrap);
  }

  // Public API
  window.setAmorviaUiScale = function setAmorviaUiScale(key) {
    if (!SCALES[key]) { console.warn('Unknown scale key:', key); return; }
    applyScaleKey(key);
    const sel = document.getElementById('uiScaleSelect');
    if (sel) sel.value = key;
  };

  function init() {
    // Set stage height variable first
    setStageMaxH(detectStageMaxH());
    // Wire selector + apply chosen or auto scale
    mountSelector();
    applyScaleKey(getDefaultScaleKey());

    // Adjust on resize (debounced)
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => setStageMaxH(detectStageMaxH()), 100);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init, { once:true });
})();
