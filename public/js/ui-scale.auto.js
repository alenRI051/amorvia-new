// Auto UI Scale + Stage Fit (Full Fix 6 + Fit-Page)
(function () {
  const LS_FIT = 'amorvia:ui:fit';
  const vh = () => Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);

  // -------- utilities
  const q  = (s, r = document) => r.querySelector(s);
  const qs = (s, r = document) => Array.from(r.querySelectorAll(s));
  const px = (v) => (v ? parseFloat(v) || 0 : 0);

  const outerHeight = (el) => {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cs   = getComputedStyle(el);
    return rect.height + px(cs.marginTop) + px(cs.marginBottom);
  };

  // -------- cap enforcement (fullfix6)
  function enforceCanvasCap(capPx) {
    const canvas = q('.stage .canvas');
    if (!canvas) return;

    // If no explicit cap passed, use the normal fullfix6 cap (min of CSS var and 50vh)
    if (capPx == null) {
      const varPx = px(getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim());
      const fifty = Math.floor(vh() * 0.50);
      capPx = Math.min(varPx || 9999, fifty || 9999);
    }

    // Inline styles win over most cascades
    canvas.style.setProperty('height', capPx + 'px', 'important');
    canvas.style.setProperty('max-height', capPx + 'px', 'important');
    canvas.style.setProperty('min-height', capPx + 'px', 'important');
    canvas.style.setProperty('overflow', 'hidden', 'important');
  }

  // -------- fit page logic (shrinks canvas only when needed)
  function computeFitCap() {
    const canvas = q('.stage .canvas');
    if (!canvas) return null;

    // Baseline cap from fullfix6
    const varPx = px(getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim());
    const fifty = Math.floor(vh() * 0.50);
    const baseCap = Math.min(varPx || 9999, fifty || 9999);

    // What else is on the page?
    const topBar   = q('#topBar');
    const title    = q('#titleAndList');
    const toolbar  = q('.stage .panel.toolbar, .stage .panel.toolbar.row') || q('.stage .panel.toolbar.row');
    const dialog   = q('.stage .panel.dialog');

    const used = outerHeight(topBar) + outerHeight(title) + outerHeight(toolbar) + outerHeight(dialog);
    const pagePaddingAllowance = 16; // a little breathing room

    const availableForCanvas = Math.floor(vh() - used - pagePaddingAllowance);

    // Don’t let it go ridiculously small:
    const MIN_CANVAS = 260; // you can raise/lower this
    const fitCap = Math.max(MIN_CANVAS, Math.min(baseCap, availableForCanvas));

    return fitCap;
  }

  function applyFitIfEnabled() {
    const enabled = localStorage.getItem(LS_FIT) === '1';
    if (!enabled) {
      enforceCanvasCap(); // just the normal cap
      return;
    }
    const fitCap = computeFitCap();
    if (fitCap && isFinite(fitCap)) {
      enforceCanvasCap(fitCap);
    } else {
      enforceCanvasCap(); // fallback
    }
  }

  // -------- toggle UI in toolbar
  function mountFitToggle() {
    const host = q('.stage .panel.toolbar.row') || q('.stage .panel.toolbar') || q('#topBar');
    if (!host || q('#fitPageToggle', host)) return;

    const wrap = document.createElement('label');
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '.35rem';
    wrap.style.marginLeft = '.5rem';

    const cb = Object.assign(document.createElement('input'), { type: 'checkbox', id: 'fitPageToggle' });
    cb.checked = localStorage.getItem(LS_FIT) === '1';
    cb.addEventListener('change', () => {
      localStorage.setItem(LS_FIT, cb.checked ? '1' : '0');
      // Apply immediately
      requestAnimationFrame(applyFitIfEnabled);
    });

    const txt = document.createElement('span');
    txt.textContent = 'Fit page';

    wrap.appendChild(cb);
    wrap.appendChild(txt);
    host.appendChild(wrap);
  }

  // -------- observe dialog height changes to re-fit when content grows/shrinks
  function observeDialog() {
    const dialog = q('.stage .panel.dialog');
    if (!dialog || window.__amorviaFitObserver) return;
    const ro = new ResizeObserver(() => applyFitIfEnabled());
    ro.observe(dialog);
    window.__amorviaFitObserver = ro;
  }

  // -------- init
  function init() {
    mountFitToggle();
    observeDialog();
    applyFitIfEnabled();
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
  window.addEventListener('resize', () => applyFitIfEnabled());
})();
