// Paint background fast and defer heavy app
const bg = document.getElementById('bg');
if (bg) {
  bg.style.backgroundImage = "url('./assets/backgrounds/room.svg')";
  bg.style.backgroundSize = "cover";
  bg.style.backgroundPosition = "center";
  bg.style.backgroundRepeat = "no-repeat";
}

let loaded=false;
const loadApp=()=>{ if(loaded) return; loaded=true; import('./app.js').then(m=>m.init?.()); };
['click','keydown','pointerdown'].forEach(evt=>window.addEventListener(evt,loadApp,{once:true}));
if('requestIdleCallback' in window){ requestIdleCallback(loadApp,{timeout:2000}); } else { setTimeout(loadApp,2000); }
