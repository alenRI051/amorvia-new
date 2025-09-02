
// Ensures there's an anchor element for the Scenarios/Labs tabs in the v2 sidebar.
(function(){
  function ensure(){
    const existing = document.getElementById('scenarioListV2');
    if (existing) return;
    const pick = document.getElementById('scenarioPicker');
    if (!pick) return;
    // Insert after the picker
    const host = pick.parentElement || pick.closest('aside') || document.body;
    const div = document.createElement('div');
    div.id = 'scenarioListV2';
    div.className = 'list v2-only';
    div.setAttribute('aria-label','Scenarios');
    host.insertBefore(div, pick.nextSibling);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure);
  else ensure();
})();
