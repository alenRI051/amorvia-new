// telemetry.v9.5.3.js — Auto-instrumentation for Amorvia
// Requires window.amorviaTrack(type, payload) (from track-client v9.5.1 or your own).
(function(){
  'use strict';
  if (!window.amorviaTrack) {
    console.warn('[telemetry] amorviaTrack not found; include /js/track-client.v9.5.1.js first.');
  }
  const track = (t, p) => { try { window.amorviaTrack && window.amorviaTrack(t, p); } catch(e){} };

  // de-dup simple
  const once = new Set();
  function trackOnce(key, t, p){ if (once.has(key)) return; once.add(key); track(t,p); }

  // navigation + visibility
  track('page_open', { path: location.pathname, ref: document.referrer || null });
  document.addEventListener('visibilitychange', ()=>{
    track('page_visibility', { hidden: document.hidden });
  });
  window.addEventListener('beforeunload', ()=>{
    track('page_close', { path: location.pathname, t: Date.now() });
  });

  // performance
  try {
    const [nav] = performance.getEntriesByType('navigation');
    if (nav) {
      track('perf_navigation', {
        type: nav.type,
        dom: Math.round(nav.domContentLoadedEventEnd),
        load: Math.round(nav.loadEventEnd),
        ttfb: Math.round(nav.responseStart),
      });
    }
  } catch {}

  // Helper to wrap engine methods if present
  function wrap(obj, fnName, eventName, mapArgs){
    if (!obj) return;
    const fn = obj[fnName];
    if (typeof fn !== 'function') return;
    if (fn.__wrapped) return;
    obj[fnName] = function(...args){
      try { track(eventName, mapArgs ? mapArgs(args) : { args }); } catch {}
      return fn.apply(this, args);
    };
    obj[fnName].__wrapped = true;
  }

  const eng = window.Amorvia || window.amorviaEngine || {};

  wrap(eng, 'restartAct', 'restart_act');
  wrap(eng, 'reset', 'ui_reset');
  wrap(eng, 'setMode', 'mode_change', (args)=>({ mode: args[0] }));
  wrap(eng, 'setScene', 'scene_change', (args)=>({ scene: args[0] }));
  wrap(eng, 'showScene', 'scene_show', (args)=>({ scene: args[0] }));
  wrap(eng, 'applyChoice', 'choice_apply', (args)=>({ choiceId: args[0] }));
  wrap(eng, 'updateHud', 'hud_update', (args)=>({ hud: args[0] }));

  // Generic UI controls
  function wireSelect(id, name){
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', ()=>track('ui_select', { control: name, value: el.value }));
  }
  wireSelect('bgSelect', 'background');
  wireSelect('leftSelect', 'leftCharacter');
  wireSelect('rightSelect', 'rightCharacter');
  wireSelect('modeSelect', 'mode');

  // Scenario picker
  (function(){
    const picker = document.getElementById('scenarioPicker');
    if (!picker) return;
    picker.addEventListener('change', ()=>{
      track('scenario_select', { value: picker.value, text: (picker.selectedOptions[0]||{}).text || null });
    });
  })();

  // Choice clicks (delegation)
  document.addEventListener('click', (e)=>{
    const btn = e.target && e.target.closest && e.target.closest('#choices button, #choices [role="button"]');
    if (!btn) return;
    const text = (btn.textContent || '').trim().slice(0, 120);
    const id = btn.getAttribute('data-id') || btn.id || null;
    track('choice_click', { id, text });
  });

  // Dialog continue / next
  document.addEventListener('click', (e)=>{
    const cont = e.target && e.target.closest && e.target.closest('a,button');
    if (!cont) return;
    const text = (cont.textContent||'').trim().toLowerCase();
    if (text === 'continue' || text === 'next') {
      track('dialog_continue', {});
    }
  });

  // HUD snapshot helper
  window.amorviaTrackHud = function(hud){ track('hud_snapshot', hud); };

  // HC/reset/restart buttons (extra telemetry)
  document.addEventListener('click', (e)=>{
    const el = e.target && e.target.closest && e.target.closest('button,[role="button"]');
    if (!el) return;
    const txt = (el.textContent||'').trim().toLowerCase();
    if (txt.includes('high contrast')) track('toggle_contrast_btn', {});
    if (txt.includes('reset ui')) track('reset_ui_btn', {});
    if (txt.includes('restart act')) track('restart_act_btn', {});
  });

  // Errors
  window.addEventListener('error', (e)=>{
    trackOnce('error-'+(e.message||'')+(e.lineno||''), 'js_error', {
      message: e.message, file: e.filename, line: e.lineno, col: e.colno
    });
  });
  window.addEventListener('unhandledrejection', (e)=>{
    const reason = e && e.reason;
    trackOnce('rej-'+(reason && reason.message || String(reason)), 'promise_rejection', {
      reason: reason && reason.message || String(reason)
    });
  });

})();