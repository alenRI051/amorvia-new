
// Amorvia HUD v9.7.1c – JS Patch
// - Widens host toolbar detection (no HTML change needed)
// - Accepted selectors: [data-hud-toolbar], #hud-toolbar, .hud-toolbar, .toolbar, header .toolbar, header, .topbar, #topbar
// - Prefers the toolbar that contains scenario controls if multiple are found
// - Includes delayed mount (MutationObserver) + duplicate bar cleanup

(function () {
  const NS = "amorvia";
  const LS = {
    hc: `${NS}:a11y:highContrast`,
    mode: `${NS}:mode`,
    hud: `${NS}:hud`,
  };

  const SELECTORS = [
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

  function pickBestToolbar(candidates) {
    if (!candidates.length) return null;
    // Prefer one that contains scenario controls or scenario list/title
    const selectors = [
      'select[name="scenario"]',
      '#scenario-list', '.scenario-list',
      '#scenario-title', '.scenario-title',
      'select, button, .btn'
    ];
    for (const c of candidates) {
      for (const sel of selectors) {
        if (c.querySelector(sel)) return c;
      }
    }
    return candidates[0];
  }

  function findHostToolbar() {
    const found = SELECTORS.flatMap(sel => qa(sel)).filter(Boolean);
    const unique = Array.from(new Set(found));
    return pickBestToolbar(unique);
  }

  function cleanupStrayBars(hostToolbar) {
    const bars = qa('body > .amorvia-toolbar');
    bars.forEach(el => {
      if (hostToolbar && hostToolbar.contains(el)) return;
      if (el !== hostToolbar) el.remove();
    });
  }

  function ensureButtons(toolbar) {
    let btnHC = toolbar.querySelector('[data-action="toggle-hc"]');
    if (!btnHC) {
      btnHC = document.createElement("button");
      btnHC.className = "btn";
      btnHC.type = "button";
      btnHC.setAttribute("data-action", "toggle-hc");
      btnHC.setAttribute("aria-pressed", "false");
      btnHC.title = "High Contrast";
      btnHC.textContent = "High Contrast";
      toolbar.appendChild(btnHC);
    }
    let spacer = toolbar.querySelector(".toolbar-spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.className = "toolbar-spacer";
      toolbar.appendChild(spacer);
    }
    let btnReset = toolbar.querySelector('[data-action="reset-ui"]');
    if (!btnReset) {
      btnReset = document.createElement("button");
      btnReset.className = "btn";
      btnReset.type = "button";
      btnReset.setAttribute("data-action", "reset-ui");
      btnReset.title = "Reset UI";
      btnReset.textContent = "Reset UI";
      toolbar.appendChild(btnReset);
    }
    toolbar.classList.add("amorvia-toolbar");
    return { btnHC, btnReset };
  }

  function wireInteractions(btns) {
    const { btnHC, btnReset } = btns;
    const savedHC = !!getLS(LS.hc, false);
    applyHighContrast(savedHC);
    btnHC.setAttribute("aria-pressed", savedHC ? "true" : "false");

    btnHC.addEventListener("click", () => {
      const now = !(document.body.classList.contains("hc"));
      applyHighContrast(now);
      btnHC.setAttribute("aria-pressed", now ? "true" : "false");
    });

    btnReset.addEventListener("click", () => {
      delLS(`${NS}:a11y:`);
      delLS(`${NS}:hud`);
      // delLS(`${NS}:mode`); // uncomment for full reset including mode
      location.reload();
    });
  }

  function mountIntoToolbar(toolbar) {
    if (!toolbar) return;
    const btns = ensureButtons(toolbar);
    wireInteractions(btns);
    cleanupStrayBars(toolbar);
  }

  function attemptMountWithObserver(timeoutMs=6000) {
    const existing = findHostToolbar();
    if (existing) return mountIntoToolbar(existing);

    const observer = new MutationObserver(() => {
      const t = findHostToolbar();
      if (t) {
        observer.disconnect();
        mountIntoToolbar(t);
      }
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

  onReady(() => attemptMountWithObserver(8000));
})();
