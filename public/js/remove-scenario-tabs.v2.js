
// Remove scenario tabs v2 (aggressive but safe)
(function(){
  function rm(n){ if(n && n.parentNode) n.parentNode.removeChild(n); }
  function run(){
    const t = document.getElementById('titleAndList'); if(!t) return;
    // Keep first child only
    Array.from(t.children).slice(1).forEach(rm);
    // Extra guards
    ['[aria-label="Scenarios"]','#scenarioList','.scenario-tabs','.list.scenarios',
     '[role="tablist"]','.tabs','.tabbar'].forEach(sel=> t.querySelectorAll(sel).forEach(rm));
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') run();
  else document.addEventListener('DOMContentLoaded', run, { once:true });
})();
