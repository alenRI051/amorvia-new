
/* Amorvia bootstrap + extras/labs + art */
const bgImg = document.getElementById('bgImg');
if (bgImg) bgImg.src = '/assets/backgrounds/room.svg';

const getMode = () => localStorage.getItem('amorvia:mode') || 'v2';
const setMode = (m) => localStorage.setItem('amorvia:mode', m);

function applyModeToDOM(mode) {
  document.body.classList.remove('mode-v1','mode-v2');
  document.body.classList.add(mode === 'v2' ? 'mode-v2' : 'mode-v1');
  document.querySelectorAll('.v1-only').forEach(el => {
    const on = mode === 'v1';
    el.hidden = !on;
    el.setAttribute('aria-hidden', String(!on));
  });
  document.querySelectorAll('.v2-only').forEach(el => {
    const on = mode === 'v2';
    el.hidden = !on;
    el.setAttribute('aria-hidden', String(!on));
  });
}

const modeSel = document.getElementById('modeSelect');
if (modeSel) {
  modeSel.value = getMode();
  applyModeToDOM(modeSel.value);
  modeSel.addEventListener('change', () => { setMode(modeSel.value); location.reload(); });
} else {
  applyModeToDOM(getMode());
}

let loaded = false;
async function loadChosenApp() {
  if (loaded) return;
  loaded = true;
  const mode = getMode();
  try {
    if (mode === 'v2') {
      // 1) Load the v2 app
      const app = await import('/js/app.v2.js');

      // 2) Load addons (Extras tabs + Art loader)
      await Promise.allSettled([
        import('/js/addons/extras-tabs.js'),
        import('/js/addons/art-loader.js'),
      ]);

      // 3) Start the app
      app?.init?.();
    } else {
      const m = await import('/js/app.js');
      m?.init?.();
    }
  } catch (e) {
    console.error('Failed to start app:', e);
  }
}

// Prime on first interaction or idle
['click','keydown','pointerdown'].forEach(evt =>
  window.addEventListener(evt, loadChosenApp, { once: true })
);
if ('requestIdleCallback' in window) {
  requestIdleCallback(loadChosenApp, { timeout: 2000 });
} else {
  setTimeout(loadChosenApp, 2000);
}
