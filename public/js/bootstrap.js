\
// Bootstrap (relative-import fix)
// Ensures dynamic imports resolve relative to /js/, not /js/js/.
const bgImg = document.getElementById('bgImg');
if (bgImg) bgImg.src = '/assets/backgrounds/room.svg';

const getMode = () => localStorage.getItem('amorvia:mode') || 'v2';
const setMode = (m) => localStorage.setItem('amorvia:mode', m);

function applyModeToDOM(mode) {
  document.body.classList.remove('mode-v1','mode-v2');
  document.body.classList.add(mode === 'v2' ? 'mode-v2' : 'mode-v1');
  document.querySelectorAll('.v1-only').forEach(el => { const on = mode === 'v1'; el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); });
  document.querySelectorAll('.v2-only').forEach(el => { const on = mode === 'v2'; el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); });
}

const modeSel = document.getElementById('modeSelect');
if (modeSel) {
  const initial = getMode();
  modeSel.value = initial;
  applyModeToDOM(initial);
  modeSel.addEventListener('change', () => {
    setMode(modeSel.value);
    location.reload();
  });
} else {
  applyModeToDOM(getMode());
}

let loaded = false;
async function loadChosenApp() {
  if (loaded) return;
  loaded = true;
  const mode = getMode();
  // IMPORTANT: bootstrap.js lives at /js/bootstrap.js, so use './app*.js', NOT './js/app*.js'
  const url = mode === 'v2' ? './app.v2.js' : './app.js';
  try {
    console.debug('[bootstrap] importing', url, 'mode=', mode);
    const m = await import(url);
    if (mode === 'v1' && m?.init) m.init();
  } catch (e) {
    console.error('Failed to start app. Module:', url, 'Mode:', mode, e);
  }
}

['click','keydown','pointerdown'].forEach(evt => window.addEventListener(evt, loadChosenApp, { once: true }));
if ('requestIdleCallback' in window) requestIdleCallback(loadChosenApp, { timeout: 2000 });
else setTimeout(loadChosenApp, 2000);
