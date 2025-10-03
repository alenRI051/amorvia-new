/* Amorvia Diagnostics Hotkey (Alt+J) */
(function(){
  async function inspectScenario(id){
    if(!id){ console.warn('[AmorviaDiag] No scenario id.'); return; }
    const url = `/data/${id}.v2.json?cb=`+Date.now();
    try{
      const j = await (await fetch(url)).json();
      const a0 = Array.isArray(j.acts) ? j.acts[0] : null;
      console.group(`[AmorviaDiag] ${id}`);
      console.log('Top-level keys:', Object.keys(j));
      console.log('Entry fields:', j.startAct, j.start, j.startNode, j.entryNode);
      if(a0){
        console.log('Act0 keys:', Object.keys(a0));
        const stepsIsObj = a0.steps && typeof a0.steps === 'object' && !Array.isArray(a0.steps);
        console.log('steps is object?', !!stepsIsObj);
        if(stepsIsObj) console.log('steps keys:', Object.keys(a0.steps).slice(0,10));
      }
      console.groupEnd();
    }catch(e){ console.error('[AmorviaDiag] Failed', url, e); }
  }
  function currentScenarioId(){
    const sel = document.getElementById('scenarioPicker');
    if(sel && sel.value) return sel.value;
    try{ const id = localStorage.getItem('amorvia:lastScenario'); if(id) return id; }catch{}
    return null;
  }
  window.addEventListener('keydown', e=>{
    if(e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key==='j'||e.key==='J')){
      inspectScenario(currentScenarioId());
    }
  }, {passive:true});
  console.info('[AmorviaDiag] Alt+J diagnostics ready');
})();
