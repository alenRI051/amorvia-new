// hud-init.v9.6.2.js — ensure HUD is visible from scenario start
(function(){
  'use strict';
  function nowHud(engine){
    // Try to read current values if engine exposes them
    try {
      if (engine && engine.hud && typeof engine.hud === 'object') return engine.hud;
      if (engine && engine.state && typeof engine.state === 'object') {
        const s = engine.state;
        const pick = (k)=> (typeof s[k] === 'number' ? s[k] : undefined);
        return {
          trust: pick('trust') ?? 0,
          tension: pick('tension') ?? 0,
          childStress: pick('childStress') ?? pick('stress') ?? 0
        };
      }
    } catch {}
    return { trust: 0, tension: 0, childStress: 0 };
  }

  function showInitial(engine){
    if (!window.amorviaHudRender) return;
    const vals = nowHud(engine);
    try { window.amorviaHudRender(vals); } catch {}
  }

  function bind(){
    const eng = window.Amorvia || window.amorviaEngine;
    if (!eng || !window.amorviaHudRender) { setTimeout(bind, 200); return; }

    // Show immediately
    showInitial(eng);

    // Also show on restartAct / first scene
    const patch = (obj, fnName)=>{
      const fn = obj && obj[fnName];
      if (typeof fn !== 'function' || fn.__hudInitWrapped) return;
      obj[fnName] = function(...args){
        try { showInitial(obj); } catch {}
        return fn.apply(this, args);
      };
      obj[fnName].__hudInitWrapped = true;
    };
    patch(eng, 'restartAct');
    patch(eng, 'setScene');
    patch(eng, 'showScene');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
