// Amorvia HUD v9.6.3 — threshold labels + trend arrows (auto-bind)
(function(){
  'use strict';
  const el = (sel, root=document)=> root.querySelector(sel);
  const cE = (tag, cls)=>{ const n=document.createElement(tag); if (cls) n.className=cls; return n; };
  const clamp01 = v => Math.max(0, Math.min(1, Number(v)||0));
  const pct = v => Math.round(clamp01(v/100)*100);

  function icon(pathD){
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
    const p = document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d', pathD); p.setAttribute('fill','currentColor');
    svg.appendChild(p); return svg;
  }

  const ICONS = {
    trust:   'M12 21C12 21 4 14.5 4 9.5C4 7 6 5 8.5 5C10 5 11.5 5.8 12 7C12.5 5.8 14 5 15.5 5C18 5 20 7 20 9.5C20 14.5 12 21 12 21Z',
    tension: 'M12 2L2 22H22L12 2ZM12 16A2 2 0 1 1 12 12A2 2 0 0 1 12 16Z',
    stress:  'M12 3C7 3 3 7 3 12C3 17 7 21 12 21C17 21 21 17 21 12C21 7 17 3 12 3ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z'
  };

  function makeCard(key, label){
    const card = cE('div','hud-card');
    const row = cE('div','hud-row');
    const badge = cE('div','hud-badge');
    badge.appendChild(icon(ICONS[key]));
    const span = cE('span'); span.textContent = label;
    badge.appendChild(span);

    const right = cE('div');
    right.style.display='flex';
    right.style.flexDirection='column';
    right.style.alignItems='flex-end';
    right.style.gap='.1rem';

    const val = cE('div','hud-val'); val.id = 'hud-'+key+'-val'; val.textContent = '0%';
    const sub = cE('div','hud-sub'); sub.innerHTML = '<span class="label">—</span><span class="trend">·</span>';
    right.appendChild(val); right.appendChild(sub);

    row.appendChild(badge); row.appendChild(right);

    const meter = cE('div','meter '+key); meter.setAttribute('role','progressbar');
    meter.setAttribute('aria-valuemin','0'); meter.setAttribute('aria-valuemax','100');
    meter.setAttribute('aria-label', label);
    const bar = cE('div','bar'); bar.style.width='0%';
    meter.appendChild(bar);

    card.appendChild(row); card.appendChild(meter);
    return { card, meter, bar, val, sub };
  }

  function ensureHud(){
    let host = el('#hud');
    if (!host) return null;
    if (!host.__hudBuilt){
      const trust = makeCard('trust','Trust');
      const tension = makeCard('tension','Tension');
      const stress = makeCard('stress','Child Stress');

      host.innerHTML='';
      host.appendChild(trust.card);
      host.appendChild(tension.card);
      host.appendChild(stress.card);

      host.__hudRefs = { trust, tension, stress };
      host.__prevVals = { trust:undefined, tension:undefined, stress:undefined };
      host.__hudBuilt = true;
    }
    return host;
  }

  function thresholdLabel(key, v){
    if (v >= 67) return 'High';
    if (v >= 34) return 'Moderate';
    return 'Low';
  }

  function trendSymbol(delta){
    if (delta > 1) return '▲ +' + delta;
    if (delta < -1) return '▼ ' + delta;
    return '▷ 0';
  }

  function render(state){
    const host = ensureHud();
    if (!host) return;
    const refs = host.__hudRefs;
    const prev = host.__prevVals;

    const trust = pct(state.trust ?? 0);
    const tension = pct(state.tension ?? 0);
    const stress = pct(state.childStress ?? state.stress ?? 0);

    const sets = [
      ['trust', trust],
      ['tension', tension],
      ['stress', stress]
    ];

    for (const [k, v] of sets){
      const r = refs[k];
      r.bar.style.width = v + '%';
      r.meter.setAttribute('aria-valuenow', String(v));
      r.val.textContent = v + '%';

      const label = thresholdLabel(k, v);
      const delta = (prev[k] == null) ? 0 : v - prev[k];
      const trend = trendSymbol(Math.round(delta));
      r.sub.querySelector('.label').textContent = label;
      r.sub.querySelector('.trend').textContent = trend;
      prev[k] = v;
    }

    try { window.amorviaTrackHud && window.amorviaTrackHud({ trust, tension, childStress: stress }); } catch {}
  }

  window.amorviaHudRender = render;

  window.amorviaHudBindEngine = function(engine){
    if (!engine) return false;
    const candidate = engine.updateHud || engine.setHud || engine.hud;
    if (typeof engine.updateHud === 'function' && !engine.updateHud.__hudWrapped){
      const orig = engine.updateHud;
      engine.updateHud = function(...args){
        try { render(args[0] || {}); } catch {}
        return orig.apply(this, args);
      };
      engine.updateHud.__hudWrapped = true;
      return true;
    } else if (typeof candidate === 'function' && !candidate.__hudWrapped){
      const orig = candidate;
      const bound = function(...args){
        try { render(args[0] || {}); } catch {}
        return orig.apply(this, args);
      };
      bound.__hudWrapped = true;
      if (engine.updateHud == null) engine.updateHud = bound; else engine.setHud = bound;
      return true;
    }
    return false;
  };

  function autoBind(){
    const eng = window.Amorvia || window.amorviaEngine;
    if (eng && window.amorviaHudBindEngine) { window.amorviaHudBindEngine(eng); }
    else { setTimeout(autoBind, 200); }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    ensureHud();
    autoBind();
  });
})();