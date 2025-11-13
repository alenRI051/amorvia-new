// amorvia-hud.v9.7.js
// v9.7.3-anim – compact chip HUD + pulse on change
// ------------------------------------------------------------------
// Oslanja se na engine.state.meters = { trust, tension, childStress } (0-100)
// Prikazuje 3 "chip" metra unutar postojeceg <div id="hud"> u dialog panelu.

window.AmorviaHUD = (() => {
  let rootEl = null;
  let chips = {};
  let lastValues = {
    trust: null,
    tension: null,
    childStress: null,
  };

  function ensureRoot() {
    if (rootEl && rootEl.isConnected) return rootEl;

    const host = document.getElementById("hud") || document.body;
    rootEl = host.querySelector("[data-hud-root]");
    if (!rootEl) {
      rootEl = document.createElement("div");
      rootEl.className = "amor-hud-root";
      rootEl.setAttribute("data-hud-root", "true");
      host.appendChild(rootEl);
    }
    return rootEl;
  }

  function createChip(key, labelText, extraClass) {
    const chip = document.createElement("div");
    chip.className = `amor-hud-chip ${extraClass || ""}`.trim();

    const label = document.createElement("span");
    label.className = "amor-hud-chip-label";
    label.textContent = labelText;

    const value = document.createElement("span");
    value.className = "amor-hud-chip-value";
    value.textContent = "--";

    const barShell = document.createElement("div");
    barShell.className = "amor-hud-bar-shell";

    const barFill = document.createElement("div");
    barFill.className = "amor-hud-bar-fill";
    barShell.appendChild(barFill);

    chip.appendChild(label);
    chip.appendChild(value);
    chip.appendChild(barShell);

    return {
      key,
      chip,
      label,
      value,
      barShell,
      barFill,
    };
  }

  function init() {
    const root = ensureRoot();
    root.innerHTML = "";
    chips = {};

    const trustChip = createChip("trust", "Trust", "amor-hud-chip--trust");
    const tensionChip = createChip("tension", "Tension", "amor-hud-chip--tension");
    const csChip = createChip("childStress", "Child", "amor-hud-chip--childStress");

    chips.trust = trustChip;
    chips.tension = tensionChip;
    chips.childStress = csChip;

    root.appendChild(trustChip.chip);
    root.appendChild(tensionChip.chip);
    root.appendChild(csChip.chip);
  }

  function clamp01(v) {
    if (typeof v !== "number" || Number.isNaN(v)) return 0;
    return Math.min(1, Math.max(0, v));
  }

  function applyPulseIfChanged(key, chipObj, newVal) {
    const oldVal = lastValues[key];
    lastValues[key] = newVal;

    if (oldVal === null || oldVal === newVal) return;

    const el = chipObj.chip;
    el.classList.remove("amor-hud-chip--pulse");
    // force reflow
    void el.offsetWidth;
    el.classList.add("amor-hud-chip--pulse");

    setTimeout(() => {
      el.classList.remove("amor-hud-chip--pulse");
    }, 600);
  }

  function updateOne(key, rawValue) {
    const chipObj = chips[key];
    if (!chipObj) return;

    const v = typeof rawValue === "number" ? rawValue : 0;
    const clamped01 = clamp01(v / 100);

    chipObj.value.textContent = `${Math.round(v)}%`;
    chipObj.barFill.style.transform = `scaleX(${clamped01})`;

    applyPulseIfChanged(key, chipObj, Math.round(v));
  }

  function update(meters = {}) {
    if (!rootEl || !rootEl.isConnected) {
      init();
    }
    updateOne("trust", meters.trust ?? 0);
    updateOne("tension", meters.tension ?? 0);
    updateOne("childStress", meters.childStress ?? 0);
  }

  return {
    init,
    update,
  };
})();

// Init HUD tek kad postoji #hud slot — retry dok ga engine ne rendera
function mountWhenReady() {
  const slot = document.getElementById("hud");
  if (!slot) {
    return setTimeout(mountWhenReady, 50);
  }
  if (window.AmorviaHUD) {
    window.AmorviaHUD.init();
  }
}
document.addEventListener("DOMContentLoaded", mountWhenReady);

