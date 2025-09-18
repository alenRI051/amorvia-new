/* Amorvia bootstrap + extras */

// Background + characters init
const bgImg   = document.getElementById('bgImg');
const leftImg = document.getElementById('leftImg');
const rightImg= document.getElementById('rightImg');

if (bgImg)   bgImg.src   = '/assets/backgrounds/room.svg';
if (leftImg) leftImg.src = '/assets/characters/male_casual.svg';
if (rightImg)rightImg.src= '/assets/characters/female_casual.svg';

// Mode handling
const getMode = () => localStorage.getItem('amorvia:mode') || 'v2';
const setMode = (m) => localStorage.setItem('amorvia:mode', m);

function applyModeToDOM(mode){
  document.querySelectorAll('.v1-only').forEach(el => { const on = (mode === 'v1'); el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); });
  document.querySelectorAll('.v2-only').forEach(el => { const on = (mode === 'v2'); el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); });
}

const modeSel = document.getElementById('modeSelect');
if (modeSel){
  modeSel.value = getMode();
  applyModeToDOM(modeSel.value);
  modeSel.addEventListener('change', ()=>{ setMode(modeSel.value); location.reload(); });
}else{
  applyModeToDOM(getMode());
}

// Lazy-load scenario engine
let loaded=false;
async function loadChosenApp(){
  if (loaded) return; loaded=true;
  try{
    const mode = getMode();
    if (mode === 'v2'){
      await import('/js/app.v2.js?sig='+Date.now());
      await Promise.allSettled([ import('/js/addons/extras-tabs.js?sig='+Date.now()) ]);
    } else {
      await import('/js/app.js?sig='+Date.now());
    }
  }catch(e){ console.error('Failed to start app:', e); }
}
['click','keydown','pointerdown'].forEach(evt=>window.addEventListener(evt,loadChosenApp,{once:true}));
if ('requestIdleCallback' in window) requestIdleCallback(loadChosenApp,{timeout:2000}); else setTimeout(loadChosenApp,2000);
