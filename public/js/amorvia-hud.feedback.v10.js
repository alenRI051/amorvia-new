/* Amorvia HUD v10 — Feedback-only pills
   - Shows after choice
   - Center baseline (50%)
   - Positive fills right, negative fills left
   - Fades out after 5s

   API:
     window.AmorviaHUD10Feedback.show({ trust:+1, tension:-2, childStress:+1 }, { label?: "Choice" })
*/

(function () {
  "use strict";

  const CONFIG = {
    hideAfterMs: 5000,
    // How much delta maps to full half-pill.
    // Example: if maxAbsDelta=4, then +/-4 fills to edge; +/-2 fills half.
    maxAbsDelta: 4,
    mountSelectorCandidates: [
      "#dialogWrap",
      ".dialogWrap",
      "#dialogContainer",
      ".dialog-container",
      "#main .dialog",
      "#main"
    ],
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function isObj(x){ return x && typeof x === "object"; }

  function findMount() {
    for (const sel of CONFIG.mountSelectorCandidates) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return document.body;
  }

  function createDOM() {
    const wrap = document.createElement("div");
    wrap.className = "amor-hud10-wrap amor-hud10-anim amor-hud10-hidden";
    wrap.setAttribute("data-hud10", "feedback");

    wrap.innerHTML = `
      <div class="amor-hud10-title">
        <div class="left">Impact</div>
        <div class="right" data-hud10-sub>After your choice</div>
      </div>

      ${rowHTML("Trust", "trust")}
      ${rowHTML("Tension", "tension")}
      ${rowHTML("Child", "childStress")}
    `;

    return wrap;
  }

  function rowHTML(label, key) {
    return `
      <div class="amor-hud10-row" data-hud10-row="${key}">
        <div class="amor-hud10-label">${label}</div>
        <div class="amor-hud10-pill" role="img" aria-label="${label} change">
          <span class="amor-hud10-mid"></span>
          <span class="amor-hud10-fill neg" data-hud10-fill-neg="${key}"></span>
          <span class="amor-hud10-fill pos" data-hud10-fill-pos="${key}"></span>
        </div>
        <div class="amor-hud10-delta" data-hud10-delta="${key}">0</div>
      </div>
    `;
  }

  function pctFromDelta(delta) {
    // returns percent for one side (0..50)
    const p = (Math.abs(delta) / CONFIG.maxAbsDelta) * 50;
    return clamp(p, 0, 50);
  }

  function formatDelta(n) {
    const v = Number(n || 0);
    if (!Number.isFinite(v) || v === 0) return "0";
    return (v > 0 ? "+" : "") + v;
  }

  class HUD10Feedback {
    constructor() {
      this.el = null;
      this.hideTimer = null;
      this.mounted = false;
    }

    ensureMounted() {
      if (this.mounted && this.el && document.contains(this.el)) return;

      this.el = createDOM();

      // Mount right under the dialog container (or best candidate)
      const mount = findMount();

      // Prefer: insert after the dialog container if possible
      // If mount is the dialog container itself, append inside it at the end.
      // This keeps it visually "under" the dialog area.
      if (mount && mount !== document.body) {
        // If mount is a wrapper, insert after first dialog card if present
        mount.appendChild(this.el);
      } else {
        document.body.appendChild(this.el);
      }

      this.mounted = true;
    }

    show(deltas, opts = {}) {
      if (!isObj(deltas)) return;

      this.ensureMounted();

      // Set subtitle
      const sub = this.el.querySelector("[data-hud10-sub]");
      if (sub) sub.textContent = opts.label ? String(opts.label) : "After your choice";

      // Update rows
      const keys = ["trust", "tension", "childStress"];
      for (const key of keys) {
        const d = Number(deltas[key] || 0);
        const negFill = this.el.querySelector(`[data-hud10-fill-neg="${key}"]`);
        const posFill = this.el.querySelector(`[data-hud10-fill-pos="${key}"]`);
        const deltaText = this.el.querySelector(`[data-hud10-delta="${key}"]`);

        const p = pctFromDelta(d);

        if (negFill) negFill.style.width = d < 0 ? `${p}%` : "0%";
        if (posFill) posFill.style.width = d > 0 ? `${p}%` : "0%";
        if (deltaText) deltaText.textContent = formatDelta(d);
      }

      // Show
      this.el.classList.remove("amor-hud10-hidden");
      this.el.classList.add("amor-hud10-visible");

      // Reset timer
      if (this.hideTimer) window.clearTimeout(this.hideTimer);
      this.hideTimer = window.setTimeout(() => this.hide(), CONFIG.hideAfterMs);
    }

    hide() {
      if (!this.el) return;
      this.el.classList.remove("amor-hud10-visible");
      this.el.classList.add("amor-hud10-hidden");
    }
  }

  // Expose global API
  const instance = new HUD10Feedback();
  window.AmorviaHUD10Feedback = instance;

  // Optional: allow manual quick test from console
  // window.AmorviaHUD10Feedback.show({trust:+2,tension:-1,childStress:+1})
})();
