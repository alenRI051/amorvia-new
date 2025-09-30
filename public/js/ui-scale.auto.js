
// Auto UI Scale + Stage Fit (Full Fix 6 + Fit-Page, overflow-aware)
(function () {
  const LS_FIT = 'amorvia:ui:fit';
  const vh = () => Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
  const q  = (s, r = document) => r.querySelector(s);
  const px = (v) => (v ? parseFloat(v) || 0 : 0);

  const outerH = (el) => {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cs   = getComputedStyle(el);
    return rect.height + (parseFloat(cs.marginTop)||0) + (parseFloat(cs.marginBottom)||0);
  };

  function enforceCanvasCap(capPx) {
    const canvas = q('.stage .canvas');
    if (!canvas) return;
    if (capPx == null) {
      const varPx = px(getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim());
      const fifty = Math.floor(vh() * 0.50);
      capPx = Math.min(varPx || 9999, fifty || 9999);
    }
    canvas.style.setProperty('height',     capPx + 'px', 'important');
    canvas.style.setProperty('max-height', capPx + 'px', 'important');
    canvas.style.setProperty('min-height', capPx + 'px', 'important');
    canvas.style.setProperty('overflow', 'hidden', 'important');
  }

  function computeFitCap() {
    const canvas  = q('.stage .canvas');
    if (!canvas) return null;

    const varPx   = px(getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim());
    const fifty   = Math.floor(vh() * 0.50);
    const baseCap = Math.min(varPx || 9999, fifty || 9999);

    const topBar  = q('#topBar');
    const title   = q('#titleAndList');
    const toolbar = q('.stage .panel.toolbar.row') || q('.stage .panel.toolbar');
    const dialog  = q('.stage .panel.dialog');

    const used    = outerH(topBar) + outerH(title) + outerH(toolbar) + outerH(dialog);
    const safety  = 12;
    const available = Math.floor(vh() - used - safety);
    const MIN_CANVAS = 220;
    return Math.max(MIN_CANVAS, Math.min(baseCap, available));
  }

  function overflowAwareFit(initialCap) {
    const canvas = q('.stage .canvas');
    if (!canvas) return;
    let cap = initialCap;
    enforceCanvasCap(cap);

    const docH   = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const ovf    = docH - vh();
    if (ovf > 0) {
      const buffer = 8;
      const MIN_CANVAS = 220;
      cap = Math.max(MIN_CANVAS, cap - (ovf + buffer));
      enforceCanvasCap(cap);
      requestAnimationFrame(() => {
        const docH2 = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        const ovf2  = docH2 - vh();
        if (ovf2 > 0) {
          const cap2 = Math.max(MIN_CANVAS, cap - (ovf2 + buffer));
          enforceCanvasCap(cap2);
        }
      });
    }
  }

  function applyFitIfEnabled() {
    const enabled = localStorage.getItem(LS_FIT) === '1';
    if (!enabled) { enforceCanvasCap(); return; }
    const firstPass = computeFitCap();
    if (firstPass && isFinite(firstPass)) overflowAwareFit(firstPass);
    else enforceCanvasCap();
  }

  function mountFitToggle() {
    const host = q('.stage .panel.toolbar.row') || q('.stage .panel.toolbar') || q('#topBar');
    if (!host || q('#fitPageToggle', host)) return;
    const wrap = document.createElement('label');
    wrap.style.display='inline-flex'; wrap.style.alignItems='center'; wrap.style.gap='.35rem'; wrap.style.marginLeft='.5rem';
    const cb = Object.assign(document.createElement('input'), { type:'checkbox', id:'fitPageToggle' });
    cb.checked = localStorage.getItem(LS_FIT) === '1';
    cb.addEventListener('change', () => { localStorage.setItem(LS_FIT, cb.checked ? '1' : '0'); requestAnimationFrame(applyFitIfEnabled); });
    const txt = document.createElement('span'); txt.textContent='Fit page';
    wrap.appendChild(cb); wrap.appendChild(txt); host.appendChild(wrap);
  }

  function observeDialog() {
    const dialog = q('.stage .panel.dialog');
    if (!dialog || window.__amorviaFitObserver) return;
    const ro = new ResizeObserver(() => applyFitIfEnabled());
    ro.observe(dialog); window.__amorviaFitObserver = ro;
  }

  function init() { mountFitToggle(); observeDialog(); applyFitIfEnabled(); }
  document.addEventListener('DOMContentLoaded', init, { once:true });
  window.addEventListener('resize', () => applyFitIfEnabled());
})();
