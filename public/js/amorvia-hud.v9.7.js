
// Amorvia HUD v9.7.2 – Always 3 Meters
// - Builds on v9.7.1 auto-map
// - Always renders Trust, Tension, Child Stress (defaults to 0% when missing)
// - Upgrades engine-provided .meter divs and keeps layout stable
(function () {
  const SEL_HUD = '#hud';

  const ORDER = [
    { key: 'trust',       label: 'Trust' },
    { key: 'tension',     label: 'Tension' },
    { key: 'childStress', label: 'Child Stress' }
  ];

  const KEY_ALIASES = {
    trust: ['trust'],
    tension: ['tension', 'stress'],
    childStress: ['childstress', 'child_stress', 'child stress', 'kidstress']
  };

  const q  = (s, r=document) => r.querySelector(s);
  const qa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const clamp = n => Math.max(0, Math.min(100, Math.round(Number(n)||0)));

  function extractMetersFromString(str) {
    const lower = String(str||'').toLowerCase();
    const out = { trust:null, tension:null, childStress:null };

    // Try labeled tokens first
    function find(aliases) {
      for (const a of aliases) {
        const re = new RegExp(a.replace(/[-/\^$*+?.()|[\]{}]/g,'\\$&') + '\\s*[:=]?\\s*([0-9]{1,3})');
        const m = lower.match(re);
        if (m) return clamp(m[1]);
      }
      return null;
    }
    out.trust       = find(KEY_ALIASES.trust);
    out.tension     = find(KEY_ALIASES.tension);
    out.childStress = find(KEY_ALIASES.childStress);

    // Fallback: first three numbers in order (trust, tension, childStress)
    if (out.trust==null && out.tension==null && out.childStress==null) {
      const nums = (lower.match(/([0-9]{1,3})/g) || []).map(n => clamp(n)).slice(0,3);
      if (nums.length) {
        if (nums[0] != null) out.trust = nums[0];
        if (nums[1] != null) out.tension = nums[1];
        if (nums[2] != null) out.childStress = nums[2];
      }
    }

    // NEW: default any missing values to 0 to guarantee 3 meters
    if (out.trust == null) out.trust = 0;
    if (out.tension == null) out.tension = 0;
    if (out.childStress == null) out.childStress = 0;

    return out;
  }

  function ensureAria(hud) {
    hud.classList.add('hud');
    hud.setAttribute('role','status');
    hud.setAttribute('aria-live','polite');
  }

  function ensureStructure(m, item) {
    if (!m.getAttribute('data-key')) m.setAttribute('data-key', item.key);
    if (!m.getAttribute('data-label')) m.setAttribute('data-label', item.label);
    if (!m.querySelector('.label')) {
      const label = document.createElement('div');
      label.className = 'label';
      label.innerHTML = `<span>${item.label}</span><span class="value">0%</span>`;
      m.prepend(label);
    } else {
      // ensure there's a .value span
      const lbl = m.querySelector('.label');
      if (!lbl.querySelector('.value')) {
        const v = document.createElement('span');
        v.className = 'value'; v.textContent = '0%';
        lbl.appendChild(v);
      }
    }
    if (!m.querySelector('.track')) {
      const track = document.createElement('div'); track.className='track';
      const fill = document.createElement('div');  fill.className='fill'; fill.style.width='0%';
      track.appendChild(fill); m.appendChild(track);
    }
  }

  function renderMeters(hud, values) {
    ensureAria(hud);

    // If there are existing .meter nodes (engine-provided), upgrade them to 3
    let existing = qa('.meter', hud);
    if (existing.length) {
      // Ensure we have exactly 3 meter nodes in correct order
      if (existing.length < 3) {
        for (let i = existing.length; i < 3; i++) {
          const m = document.createElement('div'); m.className = 'meter';
          hud.appendChild(m);
        }
        existing = qa('.meter', hud);
      } else if (existing.length > 3) {
        existing.slice(3).forEach(n => n.remove());
        existing = qa('.meter', hud);
      }

      ORDER.forEach((item, i) => {
        const m = existing[i];
        ensureStructure(m, item);
        const v = values[item.key];
        const fill = m.querySelector('.fill');
        const val  = m.querySelector('.value');
        if (fill) fill.style.width = clamp(v) + '%';
        if (val)  val.textContent = clamp(v) + '%';
      });
      return true;
    }

    // Fresh render (always 3)
    hud.innerHTML = '';
    ORDER.forEach(item => {
      const v = values[item.key];
      const meter = document.createElement('div');
      meter.className = 'meter';
      meter.setAttribute('data-key', item.key);
      meter.setAttribute('data-label', item.label);

      const labelEl = document.createElement('div');
      labelEl.className = 'label';
      labelEl.innerHTML = `<span>${item.label}</span><span class="value">${clamp(v)}%</span>`;

      const track = document.createElement('div'); track.className='track';
      const fill  = document.createElement('div'); fill.className='fill'; fill.style.width = clamp(v) + '%';
      track.appendChild(fill);

      meter.appendChild(labelEl);
      meter.appendChild(track);
      hud.appendChild(meter);
    });
    return true;
  }

  function amorviaHudRender() {
    const hud = q(SEL_HUD);
    if (!hud) return false;
    const raw = (hud.innerText || hud.textContent || '').trim();
    const values = extractMetersFromString(raw);
    return renderMeters(hud, values);
  }
  window.amorviaHudRender = amorviaHudRender;

  function attachObserver() {
    const hud = q(SEL_HUD);
    if (!hud) return;
    let t;
    const obs = new MutationObserver(() => { clearTimeout(t); t = setTimeout(amorviaHudRender, 50); });
    obs.observe(hud, { childList:true, subtree:true, characterData:true });
  }

  const start = () => { amorviaHudRender(); attachObserver(); };
  if (document.readyState === 'complete' || document.readyState === 'interactive') start();
  else document.addEventListener('DOMContentLoaded', start, { once:true });
})();
