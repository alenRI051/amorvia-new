
// Amorvia HUD v9.7 – polish pack (JS)
// Features:
//  - High Contrast toggle with persistent localStorage
//  - Reset UI button (clears HUD prefs and reloads)
//  - Safe toolbar bootstrap if app toolbar missing
//  - Non-invasive: operates only in ".amorvia-hud" mode or auto-detects

(function () {
  const NS = "amorvia";
  const LS = {
    hc: `${NS}:a11y:highContrast`,
    mode: `${NS}:mode`,
    hud: `${NS}:hud`,
  };

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
    try {
      if (typeof value === "string") localStorage.setItem(key, value);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
  function delLS(prefix) {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(k => { if (k.startsWith(prefix)) localStorage.removeItem(k); });
    } catch {}
  }

  function applyHighContrast(enabled) {
    const b = document.body;
    if (!b) return;
    // Mark body with namespace for targeted CSS.
    if (!b.classList.contains("amorvia-hud")) b.classList.add("amorvia-hud");
    b.classList.toggle("hc", !!enabled);
    b.setAttribute("data-high-contrast", enabled ? "true" : "false");
    setLS(LS.hc, !!enabled);
  }

  function createToolbarIfMissing() {
    // Prefer an existing toolbar in host app
    let toolbar = document.querySelector("#hud-toolbar, .hud-toolbar, .amorvia-toolbar");
    if (toolbar) {
      toolbar.classList.add("amorvia-toolbar");
      return toolbar;
    }
    // Create minimal sticky toolbar
    toolbar = document.createElement("div");
    toolbar.className = "amorvia-toolbar";
    toolbar.setAttribute("role", "toolbar");
    document.body.prepend(toolbar);
    return toolbar;
  }

  function ensureButtons(toolbar) {
    // Avoid duplicating if buttons already exist
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

    // Spacer
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

    return { btnHC, btnReset };
  }

  function wireInteractions(btns) {
    const { btnHC, btnReset } = btns;
    // Init state from LS
    const savedHC = !!getLS(LS.hc, false);
    applyHighContrast(savedHC);
    btnHC.setAttribute("aria-pressed", savedHC ? "true" : "false");

    btnHC.addEventListener("click", () => {
      const now = !(document.body.classList.contains("hc"));
      applyHighContrast(now);
      btnHC.setAttribute("aria-pressed", now ? "true" : "false");
    });

    btnReset.addEventListener("click", () => {
      // Clear known Amorvia HUD/UI prefs
      delLS(`${NS}:a11y:`);
      delLS(`${NS}:hud`);
      // Keep mode unless you want a full reset; uncomment next line to nuke it as well.
      // delLS(`${NS}:mode`);
      // Reload to ensure a pristine UI
      location.reload();
    });
  }

  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    }
  }

  onReady(() => {
    const toolbar = createToolbarIfMissing();
    const btns = ensureButtons(toolbar);
    wireInteractions(btns);
  });
})();
