// Amorvia HUD Combined — v9.6.8 (overwrite edition)
(function(){
  'use strict';
  const clamp = (n)=> Math.max(0, Math.min(100, n|0));
  const TOKEN_RX = /\b(trust|tension|child\s*stress|childStress)\s*[:=]?\s*(\d{1,3})\b/gi;

  function ensureHudContainer(){
    let hud = document.getElementById('hud');
    const panel = document.querySelector('.panel.dialog');
    if (!panel) return null;
    const titleRow = panel.querySelector('.row');
    if (!hud){
      hud = document.createElement('div');
      hud.id = 'hud';
      hud.setAttribute('role','status');
      hud.className = 'hud row';
      if (titleRow && titleRow.parentElement){
        titleRow.insertAdjacentElement('afterend', hud);
      } else {
        panel.insertAdjacentElement('afterbegin', hud);
      }
    }
    hud.style.display = 'grid';
    hud.classList.remove('v2-only');
    return hud;
  }

  function createCard(id, label, v){
    const card = document.createElement('div');
    card.className = 'hud-card'; card.id = id;
    const row = document.createElement('div');
    row.className = 'row';
    const l = document.createElement('span'); l.textContent = label;
    const r = document.createElement('span'); r.className='hud-value'; r.textContent = v+'%';
    row.append(l,r);
    const meter = document.createElement('div'); meter.className='hud-meter';
    const fill = document.createElement('div'); fill.className='hud-fill'; fill.style.width = v+'%';
    meter.append(fill);
    card.append(row, meter);
    return card;
  }

  function ensureHudStructure(){
    const hud = ensureHudContainer(); if (!hud) return null;
    const defs = [['hud-trust','Trust',50],['hud-tension','Tension',50],['hud-child','Child Stress',50]];
    for (const [id,label,def] of defs){
      if (!document.getElementById(id)) hud.append(createCard(id,label,def));
    }
    return hud;
  }

  function setBar(id, v){
    const val = document.querySelector(`#${id} .hud-value`);
    const fill = document.querySelector(`#${id} .hud-fill`);
    if (val) val.textContent = `${v}%`;
    if (fill) fill.style.width = `${v}%`;
  }
  function render({trust,tension,childStress}){
    ensureHudStructure();
    if (typeof trust==='number') setBar('hud-trust', clamp(trust));
    if (typeof tension==='number') setBar('hud-tension', clamp(tension));
    if (typeof childStress==='number') setBar('hud-child', clamp(childStress));
  }
  window.amorviaHudRender = render;

  function parseMetrics(text){
    const out = {};
    text.replace(TOKEN_RX, (_,k,v)=>{
      const key = (k.toLowerCase().replace(/\s+/g,'')==='childstress')?'childStress':k.toLowerCase();
      const n = clamp(parseInt(v,10));
      if (key==='trust') out.trust=n; else if (key==='tension') out.tension=n; else out.childStress=n;
      return '';
    });
    return out;
  }
  function scrubDialogTokens(root){
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const tn of nodes){
      if (TOKEN_RX.test(tn.nodeValue)) tn.nodeValue = tn.nodeValue.replace(TOKEN_RX,'').replace(/\s{2,}/g,' ');
    }
  }
  function wrapMethod(obj, name){
    const fn = obj && obj[name];
    if (typeof fn!=='function' || fn.__hudPatched) return;
    obj[name] = function(...args){
      for (let i=0;i<2;i++){
        if (typeof args[i]==='string'){
          const m = parseMetrics(args[i]);
          if (Object.keys(m).length) render(m);
          args[i] = args[i].replace(TOKEN_RX,'').replace(/\s{2,}/g,' ');
        }
      }
      return fn.apply(this,args);
    };
    obj[name].__hudPatched = true;
  }
  function hookEngine(){
    const eng = window.Amorvia || window.amorviaEngine;
    if (!eng){ setTimeout(hookEngine, 200); return; }
    ['say','print','write','append','addLine','addDialog','appendDialog','renderDialog','showText','setScene','showScene']
      .forEach((k)=> wrapMethod(eng,k));
    ['ui','view','dialog'].forEach((k)=> eng[k] && 
      ['say','print','write','append','addLine','addDialog','appendDialog','render','renderDialog','show']
      .forEach((n)=> wrapMethod(eng[k], n))
    );
    const dialog = document.getElementById('dialog');
    if (dialog){
      const m = parseMetrics(dialog.textContent||''); if (Object.keys(m).length) render(m);
      scrubDialogTokens(dialog);
      const mo = new MutationObserver(()=>{
        const text = dialog.textContent||''; const mx = parseMetrics(text);
        if (Object.keys(mx).length) render(mx);
        scrubDialogTokens(dialog);
      });
      mo.observe(dialog,{childList:true,subtree:true,characterData:true});
    }
  }

  function boot(){
    ensureHudStructure(); hookEngine();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();