
// Amorvia HUD v9.7.1 – Polish Pack (auto-map)
// Enhancements:
//  • Parses classic tokens (trust50 / tension20 / childStress10) *or* first 3 numbers in #hud text
//  • If engine pre-renders empty .meter divs, assigns data-key/label in order and updates widths
//  • Public API: window.amorviaHudRender()
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
    return out;
  }

  function ensureAria(hud) {
    hud.classList.add('hud');
    hud.setAttribute('role','status');
    hud.setAttribute('aria-live','polite');
  }

  function assignKeysIfMissing(hud) {
    const meters = qa('.meter', hud);
    if (!meters.length) return;
    meters.forEach((m,i) => {
      const item = ORDER[i];
      if (!item) return;
      if (!m.getAttribute('data-key')) m.setAttribute('data-key', item.key);
      if (!m.getAttribute('data-label')) m.setAttribute('data-label', item.label);
      // Ensure internal structure (label/track/fill)
      if (!m.querySelector('.label')) {
        const label = document.createElement('div');
        label.className = 'label';
        label.innerHTML = `<span>${item.label}</span><span class="value">0%</span>`;
        m.prepend(label);
      }
      if (!m.querySelector('.track')) {
        const track = document.createElement('div'); track.className='track';
        const fill = document.createElement('div');  fill.className='fill'; fill.style.width='0%';
        track.appendChild(fill); m.appendChild(track);
      }
    });
  }

  function renderMeters(hud, values) {
    ensureAria(hud);

    // If there are existing .meter nodes (engine-provided), upgrade them
    const existing = qa('.meter', hud);
    if (existing.length) {
      assignKeysIfMissing(hud);
      ORDER.forEach(({key}, i) => {
        const m = existing[i];
        if (!m) return;
        const v = values[key];
        if (v==null) return;
        const fill = m.querySelector('.fill');
        const val  = m.querySelector('.value');
        if (fill) fill.style.width = v + '%';
        if (val)  val.textContent = v + '%';
      });
      return true;
    }

    // Fresh render from scratch
    hud.innerHTML = '';
    ORDER.forEach(({key,label}) => {
      const v = values[key];
      if (v==null) return;
      const meter = document.createElement('div');
      meter.className = 'meter';
      meter.setAttribute('data-key', key);
      meter.setAttribute('data-label', label);

      const labelEl = document.createElement('div');
      labelEl.className = 'label';
      labelEl.innerHTML = `<span>${label}</span><span class="value">${v}%</span>`;

      const track = document.createElement('div'); track.className='track';
      const fill  = document.createElement('div'); fill.className='fill'; fill.style.width = v + '%';
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

    // If nothing parsed but we have engine meters, still assign keys/labels
    const hasAny = values.trust!=null || values.tension!=null || values.childStress!=null;
    if (!hasAny && qa('.meter', hud).length) {
      assignKeysIfMissing(hud);
      return true;
    }
    if (!hasAny) return false;
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
