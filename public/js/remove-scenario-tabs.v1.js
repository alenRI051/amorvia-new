// Remove scenario "chips" row and "Scenarios / Labs" tabs if present
(function () {
  function removeNode(n){ if (n && n.parentNode) n.parentNode.removeChild(n); }
  function isTabLabel(el){
    const t = (el.textContent || '').trim().toLowerCase();
    return t === 'scenarios' || t === 'labs';
  }

  function run() {
    const title = document.getElementById('titleAndList');
    if (!title) return;

    const chips = title.querySelector('[aria-label="Scenarios"], #scenarioList, .scenario-tabs, .list.scenarios');
    removeNode(chips);

    const rows = Array.from(title.querySelectorAll('.row, .tabs, [role="tablist"]'));
    const tabRow = rows.find(r => Array.from(r.children).some(isTabLabel));
    removeNode(tabRow);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') run();
  else document.addEventListener('DOMContentLoaded', run, { once:true });
})();
