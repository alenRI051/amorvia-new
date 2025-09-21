
/**
 * Amorvia bootstrap (baseline)
 * - Maintains v1/v2 mode classes
 * - Loads app.v2.js (or app.js) after first interaction / idle
 * - Provides image fallbacks so the page looks correct before JS boot
 */
(function() {
  const getMode = () => localStorage.getItem('amorvia:mode') || 'v2';
  const setMode = (m) => localStorage.setItem('amorvia:mode', m);

  function applyModeToDOM(mode) {
    const isV2 = mode === 'v2';
    document.body.classList.toggle('mode-v2', isV2);
    document.body.classList.toggle('mode-v1', !isV2);
    document.querySelectorAll('.v2-only').forEach(el => { el.hidden = !isV2; el.setAttribute('aria-hidden', String(!isV2)); });
    document.querySelectorAll('.v1-only').forEach(el => { el.hidden = isV2;  el.setAttribute('aria-hidden', String(isV2));  });
  }

  async function loadChosenApp() {
    const mode = getMode();
    const sig = String(Date.now());
    try {
      if (mode === 'v2') {
        await import(`/js/app.v2.js?sig=${sig}`);
        try { await import(`/js/addons/extras-tabs.js?sig=${sig}`); } catch {}
      } else {
        await import(`/js/app.js?sig=${sig}`);
      }
    } catch (err) {
      console.error('[Amorvia] Failed to start app:', err);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Ensure default art is visible in case engine is slow
    const bgImg   = document.getElementById('bgImg');
    const leftImg = document.getElementById('leftImg');
    const rightImg= document.getElementById('rightImg');
    if (bgImg   && !bgImg.src)   bgImg.src   = '/assets/backgrounds/room.svg';
    if (leftImg && !leftImg.src) leftImg.src = '/assets/characters/male_casual.svg';
    if (rightImg&& !rightImg.src)rightImg.src= '/assets/characters/female_casual.svg';

    // Mode wiring
    applyModeToDOM(getMode());
    const modeSel = document.getElementById('modeSelect');
    if (modeSel) {
      modeSel.value = getMode();
      modeSel.addEventListener('change', () => { setMode(modeSel.value); location.reload(); });
    }

    // Defer engine load to first interaction / idle
    const start = () => { if (start._started) return; start._started = true; loadChosenApp(); };
    ['click','keydown','pointerdown'].forEach(evt => window.addEventListener(evt, start, { once: true }));
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2000 }); else setTimeout(start, 1200);
  });
})();
