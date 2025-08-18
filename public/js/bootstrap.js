// Performance-tuned bootstrap
const bgImg = document.getElementById('bgImg');
if (bgImg) bgImg.src = '/assets/backgrounds/room.svg';

const warm = () => fetch('/data/index.json', { cache: 'no-store' }).catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 1500 }); else setTimeout(warm, 1500);

let loaded=false;
const loadApp=()=>{ if(loaded) return; loaded=true; import('/js/app.js').then(m=>m.init?.()).catch(err=>console.error('Failed to start app:',err)); };
['click','keydown','pointerdown'].forEach(evt=>window.addEventListener(evt,loadApp,{once:true}));
if('requestIdleCallback' in window){ requestIdleCallback(loadApp,{timeout:2000}); } else { setTimeout(loadApp,2000); }
