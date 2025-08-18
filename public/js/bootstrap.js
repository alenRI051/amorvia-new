// Paint background fast and defer the heavy app
const bg = document.getElementById('bg');
if (bg) {
  // root-relative avoids path issues on Vercel
  bg.style.backgroundImage = "url('/assets/backgrounds/room.svg')";
  bg.style.backgroundSize = "cover";
  bg.style.backgroundPosition = "center";
  bg.style.backgroundRepeat = "no-repeat";
}

// Opportunistically warm the scenarios list (non-blocking)
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => fetch('/data/index.json', { cache: 'no-store' }).catch(() => {}), { timeout: 1500 });
} else {
  setTimeout(() => fetch('/data/index.json', { cache: 'no-store' }).catch(() => {}), 1500);
}

// Lazy-load the app on first interaction / idle
let loaded = false;
const loadApp = () => {
  if (loaded) return;
  loaded = true;
  import('/js/app.js').then(m => m.init?.()).catch(err => {
    console.error('Failed to start app:', err);
  });
};
['click','keydown','pointerdown'].forEach(evt =>
  window.addEventListener(evt, loadApp, { once: true })
);
if ('requestIdleCallback' in window) {
  requestIdleCallback(loadApp, { timeout: 2000 });
} else {
  setTimeout(loadApp, 2000);
}
