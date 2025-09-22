
// Amorvia HUD – Theme Toggle (v1)
// Adds a small theme selector into #topBar and persists in localStorage.
// Themes: "default" (current) and "classic" (bolder meters like earlier builds).

(function () {
  const NS = "amorvia";
  const KEY = `${NS}:hud:theme`;

  const q = (s, r=document)=>r.querySelector(s);
  const qa = (s, r=document)=>Array.from(r.querySelectorAll(s));

  function getTheme() {
    try { return localStorage.getItem(KEY) || "default"; } catch { return "default"; }
  }
  function setTheme(t) {
    try { localStorage.setItem(KEY, t); } catch {}
    applyTheme(t);
  }
  function applyTheme(t) {
    document.body.classList.toggle("hud-classic", t === "classic");
  }

  function mountSelector() {
    const host = q("#topBar") || q("[data-hud-toolbar]") || q(".hud-toolbar") || q(".toolbar") || q("header");
    if (!host || q('#hudThemeSelect', host)) return;
    const wrap = document.createElement("div");
    wrap.className = "row";
    wrap.style.gap = ".5rem";

    const label = document.createElement("label");
    label.className = "sr-only";
    label.htmlFor = "hudThemeSelect";
    label.textContent = "HUD theme";

    const select = document.createElement("select");
    select.id = "hudThemeSelect";
    select.className = "select";
    select.ariaLabel = "HUD theme";
    select.innerHTML = `
      <option value="default">HUD – Default</option>
      <option value="classic">HUD – Classic</option>
    `;
    select.value = getTheme();
    select.addEventListener("change", () => setTheme(select.value));

    // push to the end of topBar row
    wrap.appendChild(label);
    wrap.appendChild(select);
    host.appendChild(wrap);
  }

  function enhanceMeters() {
    // Convert simple meter markup into classic structure if needed
    // Expecting #hud > .meter elements; if not present, try to adapt from existing spans/divs.
    const hud = q("#hud");
    if (!hud) return;

    qa(".meter", hud).forEach(el => {
      if (el._classicWired) return;
      el._classicWired = true;

      // If already structured, skip
      const hasTrack = el.querySelector(".track");
      const key = (el.getAttribute("data-key") || "").toLowerCase();
      let labelEl = el.querySelector(".label");
      let valueEl = el.querySelector(".value");

      // Try to infer label/value if missing
      if (!labelEl) {
        labelEl = document.createElement("div");
        labelEl.className = "label";
        const name = el.getAttribute("data-label") || key || "Meter";
        labelEl.innerHTML = `<span>${name[0].toUpperCase()+name.slice(1)}</span><span class="value">–</span>`;
        el.prepend(labelEl);
        valueEl = labelEl.querySelector(".value");
      } else if (!valueEl) {
        valueEl = document.createElement("span");
        valueEl.className = "value";
        labelEl.appendChild(valueEl);
      }

      if (!hasTrack) {
        const track = document.createElement("div");
        track.className = "track";
        const fill = document.createElement("div");
        fill.className = "fill";
        track.appendChild(fill);
        el.appendChild(track);
      }
    });

    // Wire a simple observer to update numerical values if author updates width inline
    const observer = new MutationObserver(() => {
      qa(".meter", hud).forEach(el => {
        const fill = el.querySelector(".fill");
        const labelValue = el.querySelector(".value");
        if (fill && labelValue) {
          const w = fill.style.width || getComputedStyle(fill).width;
          // Attempt to derive %; if not possible, compute via client width
          let pct = 0;
          const track = el.querySelector(".track");
          if (track && fill) {
            pct = Math.round((fill.clientWidth / (track.clientWidth||1)) * 100);
          } else {
            // fallback parse
            const m = /([0-9]{1,3})%/.exec(fill.style.width);
            if (m) pct = parseInt(m[1], 10);
          }
          if (!isNaN(pct)) labelValue.textContent = pct + "%";
        }
      });
    });
    observer.observe(hud, { subtree: true, attributes: true, childList: true, attributeFilter: ["style", "class"] });
  }

  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    }
  }

  onReady(() => {
    applyTheme(getTheme());
    mountSelector();
    enhanceMeters();
  });
})();
