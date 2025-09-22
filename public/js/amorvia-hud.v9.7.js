
// Amorvia HUD v9.7 – Polish Pack (JS)
// Features:
//  • Renders accessible, responsive meters in #hud (3-col grid → 1-col on mobile)
//  • Auto-scrubs legacy tokens (trust50 / tension20 / childStress10, with or without ":" or spaces)
//  • Smooth, reduced-motion-aware animations
//  • Announces updates via ARIA (role="status" on #hud)

(function () {
  const SEL_HUD = '#hud';

  // Parse helpers
  const KEY_ALIASES = {
    trust: ['trust'],
    tension: ['tension', 'stress'],
    childStress: ['childstress', 'child_stress', 'child stress', 'kidstress']
  };

  const q  = (s, r=document) => r.querySelector(s);
  const qa = (s, r=document) => Array.from(r.querySelectorAll(s));

  const clampPct = n => Math.max(0, Math.min(100, Math.round(Number(n)||0)));

  function extractMetersFromString(str) {
    const lower = String(str).toLowerCase();
    const out = { trust:null, tension:null, childStress:null };

    function find(aliases) {
      for (const a of aliases) {
        const re = new RegExp(a.replace(/[-/\^$*+?.()|[\]{}]/g, '\\$&') + '\s*[:=]?\s*([0-9]{1,3})');
        const m = lower.match(re);
        if (m) return clampPct(m[1]);
      }
      return null;
    }
    out.trust       = find(KEY_ALIASES.trust);
    out.tension     = find(KEY_ALIASES.tension);
    out.childStress = find(KEY_ALIASES.childStress);
    return out;
  }

  // Render meters (create or update in place)
  function renderMeters(hud, meters) {
    if (!hud) return false;

    // Ensure ARIA + class
    hud.classList.add('hud');
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');

    const has = hud.querySelector('.meter');
    if (!has) {
      // Fresh render
      hud.innerHTML = '';
      const cfg = [
        { key: 'trust',       label: 'Trust' },
        { key: 'tension',     label: 'Tension' },
        { key: 'childStress', label: 'Child Stress' }
      ];

      for (const { key, label } of cfg) {
        const v = meters[key];
        if (v == null) continue;

        const meter = document.createElement('div');
        meter.className = 'meter';
        meter.setAttribute('data-key', key);
        meter.setAttribute('data-label', label);

        const labelEl = document.createElement('div');
        labelEl.className = 'label';
        labelEl.innerHTML = `<span>${label}</span><span class="value">${v}%</span>`;

        const track = document.createElement('div');
        track.className = 'track';

        const fill = document.createElement('div');
        fill.className = 'fill';
        fill.style.width = v + '%';

        track.appendChild(fill);
        meter.appendChild(labelEl);
        meter.appendChild(track);
        hud.appendChild(meter);
      }

      return true;
    } else {
      // Update in place
      const map = {
        trust:       { fill: hud.querySelector('.meter[data-key="trust"] .fill'),
                       val:  hud.querySelector('.meter[data-key="trust"] .value') },
        tension:     { fill: hud.querySelector('.meter[data-key="tension"] .fill'),
                       val:  hud.querySelector('.meter[data-key="tension"] .value') },
        childStress: { fill: hud.querySelector('.meter[data-key="childStress"] .fill, .meter[data-key="childstress"] .fill'),
                       val:  hud.querySelector('.meter[data-key="childStress"] .value, .meter[data-key="childstress"] .value') }
      };
      for (const k of Object.keys(map)) {
        const v = meters[k];
        if (v == null) continue;
        if (map[k].fill) map[k].fill.style.width = v + '%';
        if (map[k].val)  map[k].val.textContent = v + '%';
      }
      return true;
    }
  }

  // Public API (so you can force a render if needed)
  function amorviaHudRender() {
    const hud = q(SEL_HUD);
    if (!hud) return false;

    // Prefer innerText (keeps line breaks) as the legacy engine wrote plain text
    const raw = (hud.innerText || hud.textContent || '').trim();
    if (!raw) return false;

    const meters = extractMetersFromString(raw);
    if (meters.trust == null && meters.tension == null && meters.childStress == null) {
      // Nothing to render; leave #hud as-is
      return false;
    }
    return renderMeters(hud, meters);
  }
  window.amorviaHudRender = amorviaHudRender;

  // Watch for changes in #hud and auto-render
  function attachObserver() {
    const hud = q(SEL_HUD);
    if (!hud) return;

    let t;
    const obs = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(amorviaHudRender, 50);
    });
    obs.observe(hud, { childList: true, subtree: true, characterData: true });
  }

  // Boot once DOM is ready; also try one eager pass for already-present content
  const start = () => { amorviaHudRender(); attachObserver(); };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();
