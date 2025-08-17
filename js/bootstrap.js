// Paint WebP background (fallback to SVG on error)
const bg = document.getElementById('bg');
if (bg) {
  const test = new Image();
  test.onload = () => {
    bg.style.backgroundImage = "url('./assets/backgrounds/room.webp')";
    bg.style.backgroundSize = "cover";
    bg.style.backgroundPosition = "center";
    bg.style.backgroundRepeat = "no-repeat";
  };
  test.onerror = () => {
    bg.style.backgroundImage = "url('./assets/backgrounds/room.svg')";
    bg.style.backgroundSize = "cover";
    bg.style.backgroundPosition = "center";
    bg.style.backgroundRepeat = "no-repeat";
  };
  test.src = './assets/backgrounds/room.webp';
}

const next = document.getElementById('nextBtn');
const prev = document.getElementById('prevBtn');

let loaded = false;
const loadApp = () => {
  if (loaded) return;
  loaded = true;
  import('./app.js').then(m => m.init?.()).catch(()=>{});
};

[next, prev].forEach(btn => btn?.addEventListener('click', loadApp, { once:true }));

if ('requestIdleCallback' in window) {
  requestIdleCallback(loadApp, { timeout: 2000 });
} else {
  setTimeout(loadApp, 2000);
}
