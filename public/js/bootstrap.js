\
// Bootstrap that can run v1 or v2 in-place

// Paint background early
const bgImg = document.getElementById('bgImg');
if (bgImg) bgImg.src = '/assets/backgrounds/room.svg';

// Helpers
const getMode = () => localStorage.getItem('amorvia:mode') || 'v1';
const setMode = (m) => localStorage.setItem('amorvia:mode', m);

// Apply body class + toggle visibility attrs
function applyModeToDOM(mode) {
  document.body.classList.remove('mode-v1','mode-v2');
  document.body.classList.add(mode === 'v2' ? 'mode-v2' : 'mode-v1');

  // Keep aria-hidden/hidden in sync for a11y
  const v1s = document.querySelectorAll('.v1-only');
  const v2s = document.querySelectorAll('.v2-only');
  v1s.forEach(el => { const on = mode === 'v1'; el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); });
  v2s.forEach(el => { const on = mode === 'v2'; el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); });
}

// Warm the data index quickly
const warm = () => fetch('/data/index.json', { cache: 'no-store' }).catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 1500 }); else setTimeout(warm, 1500);

// Load chosen app lazily
let loaded = false;
async function loadChosenApp() {
  if (loaded) return;
  loaded = true;
  const mode = getMode();
  try {
    if (mode === 'v2') {
      const m = await import('/js/app.v2.js');
      // app.v2.js self-initializes; no call needed
    } else {
      const m = await import('/js/app.js');
      if (m && typeof m.init === 'function') m.init();
    }
  } catch (err) {
    console.error('Failed to start app:', err);
  }
}

// Wire mode selector: change → save → reload (simplest teardown)
const modeSel = document.getElementById('modeSelect');
if (modeSel) {
  // Init value from storage
  modeSel.value = getMode();
  // Apply classes on first paint
  applyModeToDOM(modeSel.value);
  modeSel.addEventListener('change', (e) => {
    const next = modeSel.value;
    setMode(next);
    // Full reload keeps JS state clean across modes
    location.reload();
  });
} else {
  applyModeToDOM(getMode());
}

// Load app on first interaction or idle
['click','keydown','pointerdown'].forEach(evt => window.addEventListener(evt, loadChosenApp, { once: true }));
if ('requestIdleCallback' in window) { requestIdleCallback(loadChosenApp, { timeout: 2000 }); } else { setTimeout(loadChosenApp, 2000); }
