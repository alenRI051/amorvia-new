
// Amorvia HUD v9.7.1d – JS Patch (dup-proof)
// - Only mount into host toolbar (broad detection from 9.7.1c)
// - If toolbar already contains any "High contrast/Contrast" or "Reset UI/Reset" control,
//   we DO NOT create our own buttons (prevents duplicates created by app code).
// - Also removes any top-level duplicate bars that only contain those two buttons.

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

  function matchesLabel(el, labels) {
    const txt = (el.textContent || '').trim().toLowerCase();
    const title = (el.getAttribute('title') || '').trim().toLowerCase();
    return labels.some(l => txt === l || title === l || txt.includes(l));
  }

  function hasExistingControls(toolbar) {
    const btns = qa('button, a, [role="button"]', toolbar);
    const hasHC = btns.some(b => matchesLabel(b, ['high contrast', 'contrast']));
    const hasReset = btns.some(b => matchesLabel(b, ['reset ui', 'reset']));
    return { hasHC, hasReset };
  }

  function cleanupStrayBars(hostToolbar) {
    // Remove any top-level bars that ONLY contain 2 buttons for HC/Reset
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

  function ensureButtons(toolbar) {
    const existing = hasExistingControls(toolbar);
    let btnHC = toolbar.querySelector('[data-action="toggle-hc"]');
    let btnReset = toolbar.querySelector('[data-action="reset-ui"]');

    if (!existing.hasHC && !btnHC) {
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
    if (!existing.hasReset && !btnReset) {
      btnReset = document.createElement("button");
      btnReset.className = "btn";
      btnReset.type = "button";
      btnReset.setAttribute("data-action", "reset-ui");
      btnReset.title = "Reset UI";
      btnReset.textContent = "Reset UI";
      toolbar.appendChild(btnReset);
    }
    toolbar.classList.add("amorvia-toolbar");
    return { btnHC: toolbar.querySelector('[data-action="toggle-hc"]'), btnReset: toolbar.querySelector('[data-action="reset-ui"]') };
  }

  function wireInteractions(btns) {
    const { btnHC, btnReset } = btns;
    const savedHC = !!getLS(LS.hc, false);
    applyHighContrast(savedHC);
    if (btnHC) btnHC.setAttribute("aria-pressed", savedHC ? "true" : "false");

    if (btnHC) btnHC.addEventListener("click", () => {
      const now = !(document.body.classList.contains("hc"));
      applyHighContrast(now);
      btnHC.setAttribute("aria-pressed", now ? "true" : "false");
    });

    if (btnReset) btnReset.addEventListener("click", () => {
      delLS(`${NS}:a11y:`);
      delLS(`${NS}:hud`);
      // delLS(`${NS}:mode`); // uncomment to also reset mode
      location.reload();
    });
  }

  function mountIntoToolbar(toolbar) {
    if (!toolbar) return;
    const btns = ensureButtons(toolbar);
    wireInteractions(btns);
    cleanupStrayBars(toolbar);
  }

  function attemptMountWithObserver(timeoutMs=8000) {
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

  onReady(() => attemptMountWithObserver(10000));
})();
