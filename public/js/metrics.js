(function (global) {
  const ENDPOINT = '/api/track';
  const SID_KEY = 'amorvia:sid';
  const MODE_KEY = 'amorvia:mode';
  function sid(){ let s=localStorage.getItem(SID_KEY); if(!s){ s=crypto.randomUUID(); localStorage.setItem(SID_KEY,s);} return s; }
  function ctx(extra){ const mode=localStorage.getItem(MODE_KEY)||'v1'; return { sid:sid(), mode, url:location.pathname, tz:Intl.DateTimeFormat().resolvedOptions().timeZone, ...extra }; }
  function beacon(body){
    try{ if(navigator.sendBeacon){ const blob = new Blob([JSON.stringify(body)],{type:'application/json'}); return navigator.sendBeacon(ENDPOINT, blob);} }catch{}
    return fetch(ENDPOINT,{method:'POST', headers:{'Content-Type':'application/json'}, keepalive:true, body:JSON.stringify(body)}).catch(()=>{});
  }
  function track(name,data={},extraCtx={}){
    const ALLOWED=new Set(['scenario_start','choice_made','line_next','act_end','save_slot','load_slot','app_init']);
    if(!ALLOWED.has(name)) return false;
    try{ return beacon({name,data,ctx:ctx(extraCtx)});}catch{ return false;}
  }
  global.AmorviaMetrics = {
    track,
    appInit(){ track('app_init'); },
    scenarioStart(id){ track('scenario_start',{id}); },
    choiceMade(sid,act,node,index,label){ track('choice_made',{scenarioId:sid,actId:act,nodeId:node,index,label}); },
    lineNext(sid,act,from){ track('line_next',{scenarioId:sid,actId:act,nodeId:from}); },
    actEnd(sid,act,deltas){ track('act_end',{scenarioId:sid,actId:act,deltas}); },
    saveSlot(name){ track('save_slot',{name}); },
    loadSlot(name){ track('load_slot',{name}); }
  };
  try{ global.AmorviaMetrics.appInit(); }catch{}
})(window);