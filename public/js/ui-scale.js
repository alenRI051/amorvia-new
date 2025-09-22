// UI Scale Control Pack v1.1 (default 90% with smart overrides)
(function () {
  const KEY = 'amorvia:ui:scale';
  const q = (s,r=document)=>r.querySelector(s);
  const SCALES = { '75%':0.75, '90%':0.9, '100%':1, '110%':1.1, '125%':1.25, '150%':1.5 };

  function parseQueryScale() {
    try {
      const m = location.search.match(/[?&]uiscale=([0-9]{2,3})%/i);
      return m ? `${m[1]}%` : null;
    } catch { return null; }
  }

  function getDefaultScaleKey() {
    // Priority: localStorage > URL ?uiscale= > body[data-ui-scale] > meta > '90%'
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
    return '90%';
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

  // Expose a tiny API for scripts/tests:
  window.setAmorviaUiScale = function setAmorviaUiScale(key) {
    if (!SCALES[key]) { console.warn('Unknown scale key:', key); return; }
    applyScaleKey(key);
    const sel = document.getElementById('uiScaleSelect');
    if (sel) sel.value = key;
  };

  function init() {
    mountSelector();
    applyScaleKey(getDefaultScaleKey());
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init, { once:true });
})();
