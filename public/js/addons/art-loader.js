
/* Amorvia Art Loader */
(function(){
  const LS_BG='amorvia:bg', LS_LEFT='amorvia:left', LS_RIGHT='amorvia:right';
  async function fetchJSON(url){ const r=await fetch(url,{cache:'no-cache'}); if(!r.ok) throw new Error(r.status); return r.json(); }
  function byId(id){ return document.getElementById(id); }
  function fillSelect(select, groups){
    if (!select) return; select.innerHTML='';
    groups.forEach(g=>{
      const og=document.createElement('optgroup'); og.label=g.title||g.id;
      const items=g.variants||[g];
      items.forEach(it=>{ const o=document.createElement('option'); o.value=it.src; o.textContent=it.title||it.id; og.appendChild(o); });
      select.appendChild(og);
    });
  }
  function setBG(url){ const bg=byId('bg'); if(bg) bg.style.backgroundImage=`url('${url}')`; localStorage.setItem(LS_BG,url); }
  function setLeft(url){ const img=byId('leftImg'); if(img) img.src=url; localStorage.setItem(LS_LEFT,url); }
  function setRight(url){ const img=byId('rightImg'); if(img) img.src=url; localStorage.setItem(LS_RIGHT,url); }
  function initFromStorage(bgSel,leftSel,rightSel){
    const bg=localStorage.getItem(LS_BG), l=localStorage.getItem(LS_LEFT), r=localStorage.getItem(LS_RIGHT);
    if(bg){ setBG(bg); if(bgSel) bgSel.value=bg; }
    if(l){ setLeft(l); if(leftSel) leftSel.value=l; }
    if(r){ setRight(r); if(rightSel) rightSel.value=r; }
  }
  async function init(){
    try{
      const [bgSel,leftSel,rightSel]=['bgSelect','leftSelect','rightSelect'].map(byId);
      if(!bgSel && !leftSel && !rightSel) return;
      const art=await fetchJSON('/data/art-index.json');
      fillSelect(bgSel,[{title:'Backgrounds',variants:art.backgrounds}]);
      fillSelect(leftSel,art.characters);
      fillSelect(rightSel,art.characters);
      if(bgSel && bgSel.options.length) setBG(bgSel.options[0].value);
      if(leftSel && leftSel.options.length) setLeft(leftSel.options[0].value);
      if(rightSel && rightSel.options.length) setRight(rightSel.options[1]?.value||rightSel.options[0].value);
      initFromStorage(bgSel,leftSel,rightSel);
      bgSel && bgSel.addEventListener('change',e=>setBG(e.target.value));
      leftSel && leftSel.addEventListener('change',e=>setLeft(e.target.value));
      rightSel && rightSel.addEventListener('change',e=>setRight(e.target.value));
      [bgSel?.value,leftSel?.value,rightSel?.value].filter(Boolean).forEach(u=>{ const i=new Image(); i.src=u; });
      window.dispatchEvent(new CustomEvent('amorvia:art-ready',{detail:{ok:true}}));
    }catch(e){ console.warn('art-loader failed:',e); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
