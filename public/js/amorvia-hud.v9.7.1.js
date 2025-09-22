
// Amorvia HUD v9.7.1 – patch pack (JS)
// Change: NO fallback toolbar. Only mounts into existing #hud-toolbar / .hud-toolbar.
// Prevents duplicate "High Contrast" / "Reset UI" buttons.

(function () {
  const NS = "amorvia";
  const LS = {
    hc: `${NS}:a11y:highContrast`,
    mode: `${NS}:mode`,
    hud: `${NS}:hud`,
  };

  const q = (sel) => document.querySelector(sel);

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
      Object.keys(localStorage).forEach(k => { if (k.startsWith(prefix)) localStorage.removeItem(k); });
    } catch {}
  }

  function applyHighContrast(enabled) {
    const b = document.body;
    if (!b) return;
    if (!b.classList.contains("amorvia-hud")) b.classList.add("amorvia-hud");
    b.classList.toggle("hc", !!enabled);
    b.setAttribute("data-high-contrast", enabled ? "true" : "false");
    setLS(LS.hc, !!enabled);
  }

  function getHostToolbar() {
    const toolbar = q("#hud-toolbar") || q(".hud-toolbar");
    if (!toolbar) return null;
    toolbar.classList.add("amorvia-toolbar");
    return toolbar;
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
      // delLS(`${NS}:mode`); // uncomment if you want full reset
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
    const toolbar = getHostToolbar();
    if (!toolbar) return; // Do nothing if the app doesn't expose a toolbar
    const btns = ensureButtons(toolbar);
    wireInteractions(btns);
  });
})();
