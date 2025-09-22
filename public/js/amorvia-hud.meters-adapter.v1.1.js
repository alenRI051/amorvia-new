
// Amorvia HUD – Meters Adapter v1.1
// - Robust mutation watcher (reconnects, debounced)
// - Global API: window.AmorviaAdaptHud() to force re-run
// - Parses raw HUD text and renders classic .meter components

(function () {
  const NS = "AmorviaMetersAdapter";
  const SEL_HUD = "#hud";
  let observer = null;
  let debounceTimer = null;

  const q = (s, r=document)=>r.querySelector(s);
  const qa = (s, r=document)=>Array.from(r.querySelectorAll(s));

  const KEY_ALIASES = {
    trust: ["trust"],
    tension: ["tension", "stress"],
    childStress: ["childstress", "child_stress", "child stress", "kidstress"]
  };

  function parsePct(num) {
    const n = Math.max(0, Math.min(100, Number(num)||0));
    return Math.round(n);
  }

  function detectRaw(hud) {
    if (!hud) return "";
    // prefer innerText (preserves line breaks), fallback to textContent
    const t = (hud.innerText || hud.textContent || "").trim();
    return t;
  }

  function extractMeters(str) {
    const lower = String(str).toLowerCase();
    const out = { trust:null, tension:null, childStress:null };

    function find(aliases) {
      for (const a of aliases) {
        const re = new RegExp(a.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\s*[:=]?\s*([0-9]{1,3})");
        const m = lower.match(re);
        if (m) return parsePct(m[1]);
      }
      return null;
    }
    out.trust = find(KEY_ALIASES.trust);
    out.tension = find(KEY_ALIASES.tension);
    out.childStress = find(KEY_ALIASES.childStress);
    return out;
  }

  function ensureHudFlex(hud){
    hud.classList.add("hud");
    hud.style.display = "flex";
    hud.style.gap = "12px";
  }

  function renderMeters(hud, meters) {
    // If already structured meters exist, update widths/values instead of nuking DOM
    const hasMeters = hud.querySelector(".meter");
    if (hasMeters) {
      const map = {
        trust: hud.querySelector('.meter[data-key="trust"] .fill'),
        tension: hud.querySelector('.meter[data-key="tension"] .fill'),
        childStress: hud.querySelector('.meter[data-key="childStress"] .fill, .meter[data-key="childstress"] .fill')
      };
      const mapVal = {
        trust: hud.querySelector('.meter[data-key="trust"] .value'),
        tension: hud.querySelector('.meter[data-key="tension"] .value'),
        childStress: hud.querySelector('.meter[data-key="childStress"] .value, .meter[data-key="childstress"] .value')
      };
      for (const k of Object.keys(map)) {
        const v = meters[k];
        if (v==null) continue;
        if (map[k]) map[k].style.width = v + "%";
        if (mapVal[k]) mapVal[k].textContent = v + "%";
      }
      return;
    }

    // Fresh render
    hud.innerHTML = "";
    ensureHudFlex(hud);
    const cfg = [
      { key: "trust", label: "Trust" },
      { key: "tension", label: "Tension" },
      { key: "childStress", label: "Child Stress" }
    ];
    for (const {key,label} of cfg) {
      const v = meters[key];
      if (v==null) continue;
      const meter = document.createElement("div");
      meter.className = "meter";
      meter.setAttribute("data-key", key);
      meter.setAttribute("data-label", label);

      const labelEl = document.createElement("div");
      labelEl.className = "label";
      labelEl.innerHTML = `<span>${label}</span><span class="value">${v}%</span>`;

      const track = document.createElement("div");
      track.className = "track";
      const fill = document.createElement("div");
      fill.className = "fill";
      fill.style.width = v + "%";
      track.appendChild(fill);

      meter.appendChild(labelEl);
      meter.appendChild(track);
      hud.appendChild(meter);
    }
  }

  function adaptOnce() {
    const hud = q(SEL_HUD);
    if (!hud) return false;
    const raw = detectRaw(hud);
    if (!raw) return false;
    const meters = extractMeters(raw);
    if (meters.trust==null && meters.tension==null && meters.childStress==null) return false;
    renderMeters(hud, meters);
    return true;
  }

  function debouncedAdapt() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(adaptOnce, 50);
  }

  function watchHud() {
    const hud = q(SEL_HUD);
    if (!hud) return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(debouncedAdapt);
    observer.observe(hud, { childList:true, subtree:true, characterData:true });
  }

  function init() {
    // Try immediately; if not ready, watch DOM for #hud arrival
    if (!q(SEL_HUD)) {
      const ro = new MutationObserver(() => {
        if (q(SEL_HUD)) {
          ro.disconnect();
          watchHud();
          debouncedAdapt();
        }
      });
      ro.observe(document.documentElement, { childList:true, subtree:true });
      // Safety stop after 15s
      setTimeout(() => ro.disconnect(), 15000);
    } else {
      watchHud();
      debouncedAdapt();
    }
  }

  // Expose global API for manual trigger
  window.AmorviaAdaptHud = function AmorviaAdaptHud() {
    watchHud();
    return adaptOnce();
  };

  // Autostart when DOM ready/interactive
  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  }
})();
