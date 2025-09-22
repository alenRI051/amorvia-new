
// Amorvia HUD v9.7.1e – JS Patch (global-dedupe + adopt existing)
(function () {
  const NS = "amorvia";
  const LS = {
    hc: `${NS}:a11y:highContrast`,
    mode: `${NS}:mode`,
    hud: `${NS}:hud`,
  };

  const SELECTORS = [
    '#topBar',                // explicit preference
    '[data-hud-toolbar]',
    '#hud-toolbar',
    '.hud-toolbar',
    '.toolbar',
    'header .toolbar',
    'header',
    '.topbar',
    '#topbar',
  ];

  const q = (sel, root=document) => root.querySelector(sel);
  const qa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function getLS(key, fallback=null) {
    try {
      const v = localStorage.getItem(key);
      if (v === null || v === undefined) return fallback;
      if (v === "true") return true;
      if (v === "false") return false;
      try { return JSON.parse(v); } catch { return v; }
    } catch { return fallback; }
  }
  function setLS(key, value) {
    try { localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value)); } catch {}
  }
  function delLS(prefix) {
    try { Object.keys(localStorage).forEach(k => { if (k.startsWith(prefix)) localStorage.removeItem(k); }); } catch {}
  }

  function applyHighContrast(enabled) {
    const b = document.body;
    if (!b) return;
    if (!b.classList.contains("amorvia-hud")) b.classList.add("amorvia-hud");
    b.classList.toggle("hc", !!enabled);
    b.setAttribute("data-high-contrast", enabled ? "true" : "false");
    setLS(LS.hc, !!enabled);
  }

  function matchesLabel(el, labels) {
    const txt = (el.textContent || '').trim().toLowerCase();
    const title = (el.getAttribute('title') || '').trim().toLowerCase();
    const id = (el.id || '').toLowerCase();
    return labels.some(l => txt === l || title === l || txt.includes(l) || id === l.replace(/\s+/g,''));
  }

  function findExistingGlobalControls() {
    // Prefer explicit IDs if present
    const btnHCById = q('#highContrastBtn');
    const btnResetById = q('#resetUiBtn');
    // Fallback by label search across document
    const btns = qa('button, a, [role="button"]');
    const btnHC = btnHCById || btns.find(b => matchesLabel(b, ['high contrast', 'contrast', 'hc']));
    const btnReset = btnResetById || btns.find(b => matchesLabel(b, ['reset ui', 'reset']));
    return { btnHC, btnReset };
  }

  function cleanupStrayBars(hostToolbar) {
    const bars = qa('body > div, body > nav, body > header');
    bars.forEach(el => {
      if (hostToolbar && (el === hostToolbar || hostToolbar.contains(el))) return;
      const btns = qa('button, a, [role="button"]', el);
      if (btns.length && btns.length <= 3) {
        const labels = btns.map(b => (b.textContent || '').trim().toLowerCase());
        const set = new Set(labels);
        const isDupeSet =
          (set.has('high contrast') || set.has('contrast')) &&
          (set.has('reset ui') || set.has('reset')) &&
          btns.length <= 3;
        if (isDupeSet) el.remove();
      }
    });
  }

  function ensureButtons(toolbar, existing) {
    let { btnHC, btnReset } = existing || {};
    // Only create if not already present anywhere
    if (!btnHC) {
      btnHC = toolbar.querySelector('[data-action="toggle-hc"]');
      if (!btnHC) {
        btnHC = document.createElement("button");
        btnHC.className = "button btn";
        btnHC.type = "button";
        btnHC.id = "highContrastBtn";
        btnHC.setAttribute("data-action", "toggle-hc");
        btnHC.setAttribute("aria-pressed", "false");
        btnHC.title = "High contrast";
        btnHC.textContent = "High contrast";
        toolbar.appendChild(btnHC);
      }
    }
    let spacer = toolbar.querySelector(".toolbar-spacer, .spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.className = "toolbar-spacer spacer";
      toolbar.appendChild(spacer);
    }
    if (!btnReset) {
      btnReset = toolbar.querySelector('[data-action="reset-ui"]');
      if (!btnReset) {
        btnReset = document.createElement("button");
        btnReset.className = "button btn";
        btnReset.type = "button";
        btnReset.id = "resetUiBtn";
        btnReset.setAttribute("data-action", "reset-ui");
        btnReset.title = "Reset UI";
        btnReset.textContent = "Reset UI";
        toolbar.appendChild(btnReset);
      }
    }
    toolbar.classList.add("amorvia-toolbar");
    return { btnHC, btnReset };
  }

  function wireInteractions(btns) {
    const { btnHC, btnReset } = btns;
    const savedHC = !!getLS(LS.hc, false);
    applyHighContrast(savedHC);
    if (btnHC) btnHC.setAttribute("aria-pressed", savedHC ? "true" : "false");

    if (btnHC && !btnHC._wired) {
      btnHC.addEventListener("click", () => {
        const now = !(document.body.classList.contains("hc"));
        applyHighContrast(now);
        btnHC.setAttribute("aria-pressed", now ? "true" : "false");
      });
      btnHC._wired = true;
    }

    if (btnReset && !btnReset._wired) {
      btnReset.addEventListener("click", () => {
        delLS(`${NS}:a11y:`);
        delLS(`${NS}:hud`);
        // delLS(`${NS}:mode`); // uncomment to also reset mode
        location.reload();
      });
      btnReset._wired = true;
    }
  }

  function pickBestToolbar() {
    // Prefer #topBar if present
    const topBar = q('#topBar');
    if (topBar) return topBar;
    for (const sel of SELECTORS) {
      const cands = qa(sel);
      if (cands.length) {
        // Pick first that has any controls
        const pick = cands.find(c => c.querySelector('select, button, .button, .btn')) || cands[0];
        return pick;
      }
    }
    return null;
  }

  function mount() {
    const existingGlobal = findExistingGlobalControls();
    const host = pickBestToolbar();
    if (!host && !existingGlobal.btnHC && !existingGlobal.btnReset) return; // nothing to do
    const btns = existingGlobal.btnHC || existingGlobal.btnReset
      ? existingGlobal
      : ensureButtons(host, existingGlobal);
    wireInteractions(btns);
    cleanupStrayBars(host);
  }

  function attemptMountWithObserver(timeoutMs=10000) {
    const tryMount = () => {
      mount();
      const haveHC = !!(q('#highContrastBtn') || qa('[data-action="toggle-hc"]').length);
      const haveReset = !!(q('#resetUiBtn') || qa('[data-action="reset-ui"]').length);
      return haveHC || haveReset;
    };
    if (tryMount()) return;
    const observer = new MutationObserver(() => {
      if (tryMount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), timeoutMs);
  }

  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    }
  }

  onReady(() => attemptMountWithObserver(12000));
})();
