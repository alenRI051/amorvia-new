// Performance-tuned bootstrap
// 1) Set hero background as <img> (LCP)
// 2) Warm the scenarios list
// 3) Lazy-load the main app

// 1) Hero image as LCP
const bgImg = document.getElementById('bgImg');
if (bgImg) bgImg.src = '/assets/backgrounds/room.svg';

// 2) Warm index.json quietly
const warm = () => fetch('/data/index.json', { cache: 'no-store' }).catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 1500 }); else setTimeout(warm, 1500);

// 3) Lazy-load app on first interaction / idle
let loaded=false;
const loadApp=()=>{ if(loaded) return; loaded=true; import('/js/app.js').then(m=>m.init?.()).catch(err=>console.error('Failed to start app:',err)); };
['click','keydown','pointerdown'].forEach(evt=>window.addEventListener(evt,loadApp,{once:true}));
if('requestIdleCallback' in window){ requestIdleCallback(loadApp,{timeout:2000}); } else { setTimeout(loadApp,2000); }
