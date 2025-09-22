
// Amorvia HUD — v9.6.9 (polish)
// Adds minor UX polish (fade-in) and batches renders via rAF to keep animations smooth.
// Expects the strong-hook v9.6.9 script to already be present OR you can include this
// as a drop-in replacement (it contains the same strong hook).
(function(){
  'use strict';

  const TOKEN_RX = /\b(trust|tension|child\s*stress|childStress)\s*[:=]?\s*(\d{1,3})\b/gi;
  const clamp = (n)=> Math.max(0, Math.min(100, n|0));

  let rafId = 0, queued = null;
  function scheduleRender(next){
    queued = Object.assign(queued||{}, next||{});
    if (rafId) return;
    rafId = requestAnimationFrame(()=>{
      rafId = 0;
      const pay = queued||{}; queued = null;
      doRender(pay);
    });
  }

  function ensureHudContainer(){
    let hud = document.getElementById('hud');
    const panel = document.querySelector('.panel.dialog');
    if (!panel) return null;
    const titleRow = panel.querySelector('.row');
    if (!hud){
      hud = document.createElement('div');
      hud.id='hud'; hud.className='hud row'; hud.setAttribute('role','status');
      (titleRow || panel).insertAdjacentElement(titleRow?'afterend':'afterbegin', hud);
    }
    hud.style.display='grid';
    hud.classList.remove('v2-only');
    return hud;
  }
  function createCard(id,label,v){
    const card = document.createElement('div'); card.className='hud-card'; card.id=id;
    const row = document.createElement('div'); row.className='row';
    const l=document.createElement('span'); l.className='hud-label'; l.textContent=label;
    const r=document.createElement('span'); r.className='hud-value'; r.textContent=v+'%';
    row.append(l,r);
    const meter=document.createElement('div'); meter.className='hud-meter';
    const fill=document.createElement('div'); fill.className='hud-fill'; fill.style.width=v+'%';
    meter.append(fill); card.append(row,meter); return card;
  }
  function ensureHudStructure(){
    const hud = ensureHudContainer(); if (!hud) return null;
    const defs=[['hud-trust','Trust',50],['hud-tension','Tension',50],['hud-child','Child Stress',50]];
    for(const [id,label,def] of defs){ if(!document.getElementById(id)) hud.append(createCard(id,label,def)); }
    return hud;
  }
  function setBar(id,v){
    const val=document.querySelector(`#${id} .hud-value`);
    const fill=document.querySelector(`#${id} .hud-fill`);
    if(val) val.textContent=`${v}%`; if(fill) fill.style.width=`${v}%`;
  }
  function doRender({trust,tension,childStress}){
    ensureHudStructure();
    if (typeof trust==='number') setBar('hud-trust', clamp(trust));
    if (typeof tension==='number') setBar('hud-tension', clamp(tension));
    if (typeof childStress==='number') setBar('hud-child', clamp(childStress));
  }
  function render(m){ scheduleRender(m||{}); }
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
  function scrub(text){
    const metrics = parseMetrics(text||'');
    const clean = (text||'').replace(TOKEN_RX,'').replace(/\s{2,}/g,' ').trim();
    return {clean, metrics};
  }
  function applyScrubToNode(node){
    if (!node) return;
    if (node.nodeType===3){
      const s = scrub(node.nodeValue);
      if (s.clean !== node.nodeValue){ node.nodeValue = s.clean; render(s.metrics); }
      return;
    }
    if (node.nodeType===1){
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
      const texts=[]; while(walker.nextNode()) texts.push(walker.currentNode);
      let agg={};
      for(const t of texts){
        const s=scrub(t.nodeValue); if (s.clean!==t.nodeValue) t.nodeValue=s.clean;
        Object.assign(agg, s.metrics);
      }
      if (Object.keys(agg).length) render(agg);
    }
  }
  function patchDialogInsertion(dialog){
    if (!dialog || dialog.__hudPatched) return;
    dialog.__hudPatched = true;
    const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (desc && desc.set){
      const origSet = desc.set.bind(dialog);
      Object.defineProperty(dialog, 'innerHTML', {
        configurable: true,
        get: desc.get ? desc.get.bind(dialog) : undefined,
        set(v){
          const s = scrub(String(v));
          origSet(s.clean);
          if (Object.keys(s.metrics).length) render(s.metrics);
        }
      });
    }
    const wrap = (obj, name)=>{
      const fn = obj[name];
      if (typeof fn!=='function' || fn.__hudPatched) return;
      obj[name] = function(...args){
        for (let i=0;i<args.length;i++){
          if (typeof args[i]==='string'){
            const s = scrub(args[i]); args[i]=s.clean;
            if (Object.keys(s.metrics).length) render(s.metrics);
          }
        }
        const res = fn.apply(this, args);
        for (const n of this.childNodes) applyScrubToNode(n);
        return res;
      };
      obj[name].__hudPatched = true;
    };
    ['insertAdjacentHTML','append','prepend','replaceChildren'].forEach(m=>wrap(dialog, m));
    const mo = new MutationObserver(muts=>{
      for (const m of muts){
        m.addedNodes && m.addedNodes.forEach(applyScrubToNode);
        if (m.type==='characterData') applyScrubToNode(m.target);
      }
    });
    mo.observe(dialog,{childList:true,subtree:true,characterData:true});
  }
  function hookEngine(){
    const eng = window.Amorvia || window.amorviaEngine;
    const dialog = document.getElementById('dialog');
    ensureHudStructure();
    if (dialog) patchDialogInsertion(dialog);

    const wrapMethod = (obj, name)=>{
      const fn = obj && obj[name];
      if (typeof fn!=='function' || fn.__hudPatched) return;
      obj[name] = function(...args){
        for (let i=0;i<args.length;i++){
          if (typeof args[i]==='string'){
            const s = scrub(args[i]); args[i]=s.clean;
            if (Object.keys(s.metrics).length) render(s.metrics);
          }
        }
        return fn.apply(this,args);
      };
      obj[name].__hudPatched = true;
    };
    if (eng){
      ['say','print','write','append','addLine','addDialog','appendDialog','renderDialog','showText','setScene','showScene']
        .forEach(k=>wrapMethod(eng,k));
      ['ui','view','dialog'].forEach(k=> eng[k] && 
        ['say','print','write','append','addLine','addDialog','appendDialog','render','renderDialog','show']
        .forEach(n=> wrapMethod(eng[k], n))
      );
    } else {
      setTimeout(hookEngine, 200);
    }
  }
  function boot(){ ensureHudStructure(); hookEngine(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();