
// Amorvia HUD – Meters Adapter (v1)
// Turns plain text in #hud like "trust50", "tension20", "childstress10"
// (or "trust: 50", "tension 20") into structured .meter components that
// the Classic theme can style.
//
// Include AFTER the game renders, e.g. at end of body with defer.
// Safe to run multiple times; it will re-render when #hud changes.

(function () {
  const q = (s, r=document)=>r.querySelector(s);
  const qa = (s, r=document)=>Array.from(r.querySelectorAll(s));

  const KEY_ALIASES = {
    trust: ["trust"],
    tension: ["tension", "stress"],
    childStress: ["childstress", "child_stress", "child stress", "kidstress"]
  };

  function parseValue(str) {
    if (!str) return null;
    const m = String(str).match(/([0-9]{1,3})/);
    if (!m) return null;
    let v = Math.max(0, Math.min(100, parseInt(m[1], 10)));
    return v;
  }

  function detectRaw(hud) {
    // Gather text chunks from direct children and spans
    const texts = [];
    hud.childNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = n.textContent.trim();
        if (t) texts.push(t);
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const t = n.textContent.trim();
        if (t) texts.push(t);
      }
    });
    return texts.join(" ");
  }

  function extractMeters(str) {
    const out = {};
    const lower = str.toLowerCase();
    function findFor(key, aliases) {
      for (const a of aliases) {
        // match patterns: "trust50", "trust: 50", "trust 50"
        const re = new RegExp(a.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\s*[:=]?\s*([0-9]{1,3})");
        const m = lower.match(re);
        if (m) return parseInt(m[1], 10);
      }
      return null;
    }
    out.trust = findFor("trust", KEY_ALIASES.trust);
    out.tension = findFor("tension", KEY_ALIASES.tension);
    out.childStress = findFor("childstress", KEY_ALIASES.childStress);
    return out;
  }

  function renderMeters(hud, meters) {
    hud.innerHTML = ""; // clear
    const cfg = [
      { key: "trust", label: "Trust", color: "trust" },
      { key: "tension", label: "Tension", color: "tension" },
      { key: "childStress", label: "Child Stress", color: "childStress" }
    ];
    hud.classList.add("hud"); // ensure class
    hud.style.display = "flex";
    hud.style.gap = "12px";
    cfg.forEach(({key, label, color}) => {
      const v = meters[key];
      if (v == null) return;
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
      fill.style.width = Math.max(0, Math.min(100, v)) + "%";
      track.appendChild(fill);

      meter.appendChild(labelEl);
      meter.appendChild(track);
      hud.appendChild(meter);
    });
  }

  function adapt(hud) {
    if (!hud) return;
    // If we already have .meter elements, do nothing.
    if (hud.querySelector(".meter")) return;
    const raw = detectRaw(hud);
    if (!raw) return;
    const meters = extractMeters(raw);
    if (meters.trust == null && meters.tension == null && meters.childStress == null) return;
    renderMeters(hud, meters);
  }

  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    }
  }

  onReady(() => {
    const hud = q("#hud");
    adapt(hud);
    // watch for updates
    const obs = new MutationObserver(() => adapt(hud));
    if (hud) obs.observe(hud, { childList: true, subtree: true, characterData: true });
  });
})();
