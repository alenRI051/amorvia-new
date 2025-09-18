/**
 * Amorvia bootstrap (v6)
 * - Restores dynamic app loader (v1/v2)
 * - Keeps safe image fallbacks without optional-chaining assignment
 * - Leaves SW registration to sw-register.js (already guarded)
 */
(function() {
  const getMode = () => localStorage.getItem('amorvia:mode') || 'v2';
  const setMode = (m) => localStorage.setItem('amorvia:mode', m);

  // Apply mode classes and hide/show v1/v2 sections
  function applyModeToDOM(mode) {
    const isV2 = mode === 'v2';
    document.body.classList.toggle('mode-v2', isV2);
    document.body.classList.toggle('mode-v1', !isV2);
    document.querySelectorAll('.v2-only').forEach(el => { el.hidden = !isV2; el.setAttribute('aria-hidden', String(!isV2)); });
    document.querySelectorAll('.v1-only').forEach(el => { el.hidden = isV2;  el.setAttribute('aria-hidden', String(isV2));  });
  }

  async function loadChosenApp() {
    try {
      const mode = getMode();
      const sig = String(Date.now());
      if (mode === 'v2') {
        await import(`/js/app.v2.js?sig=${sig}`);
        // Optional: load extras after main app is ready
        try { await import(`/js/addons/extras-tabs.js?sig=${sig}`); } catch {}
      } else {
        await import(`/js/app.js?sig=${sig}`);
      }
    } catch(err) {
      console.error('[Amorvia] Failed to start app:', err);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Ensure image fallbacks exist even if app fails to load
    const bgImg   = document.getElementById('bgImg');
    const leftImg = document.getElementById('leftImg');
    const rightImg= document.getElementById('rightImg');
    if (bgImg)   bgImg.src   = '/assets/backgrounds/room.svg';
    if (leftImg) leftImg.src = '/assets/characters/male_casual.svg';
    if (rightImg)rightImg.src= '/assets/characters/female_casual.svg';

    // Apply mode to DOM
    applyModeToDOM(getMode());

    // Mode selector wiring
    const modeSel = document.getElementById('modeSelect');
    if (modeSel) {
      modeSel.value = getMode();
      modeSel.addEventListener('change', () => {
        setMode(modeSel.value);
        location.reload();
      });
    }

    // Defer loading main app until first interaction or idle
    const start = () => {
      if (start._started) return;
      start._started = true;
      loadChosenApp();
    };

    ['click','keydown','pointerdown'].forEach(evt =>
      window.addEventListener(evt, start, { once: true })
    );

    if ('requestIdleCallback' in window) {
      requestIdleCallback(start, { timeout: 2000 });
    } else {
      setTimeout(start, 1200);
    }
  });
})();
