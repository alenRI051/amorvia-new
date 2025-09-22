
// UI Scale Control Pack
// Adds a dropdown to adjust stage/HUD scaling, persisted in localStorage
(function () {
  const KEY = 'amorvia:ui:scale';
  const q = (s,r=document)=>r.querySelector(s);
  const SCALES = { '90%':0.9, '100%':1, '110%':1.1, '125%':1.25, '150%':1.5 };

  function applyScale(s=1) {
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
    sel.value = localStorage.getItem(KEY) || '100%';
    sel.addEventListener('change', () => {
      localStorage.setItem(KEY, sel.value);
      applyScale(SCALES[sel.value]);
    });
    wrap.appendChild(label); wrap.appendChild(sel);
    host.appendChild(wrap);
  }

  function init() {
    mountSelector();
    applyScale(SCALES[localStorage.getItem(KEY) || '100%']);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init, { once:true });
})();
