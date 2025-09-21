
// dom-fixes.v9.3.8.js
// Ensures scenarioPicker + scenarioListV2 live under #titleAndList, even if engine re-renders them elsewhere.
(function(){
  function rehome() {
    const host = document.getElementById('titleAndList');
    if (!host) return;
    const picker = document.getElementById('scenarioPicker');
    const list   = document.getElementById('scenarioListV2');
    const restart = document.getElementById('restartAct');

    // Ensure row container exists (first child div.row)
    let row = host.querySelector(':scope > .row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'row';
      row.style.gap = '.5rem';
      row.style.alignItems = 'center';
      host.prepend(row);
    }

    if (picker && picker.parentElement !== row) row.appendChild(picker);
    if (restart && restart.parentElement !== row) row.appendChild(restart);

    if (list && list.parentElement !== host) {
      list.style.marginTop = '.5rem';
      host.appendChild(list);
    }
  }

  function init() {
    rehome();
    const mo = new MutationObserver((muts) => {
      // If list or picker are moved/added elsewhere, rehome again
      const moved = muts.some(m => Array.from(m.addedNodes).some(n =>
        n.id === 'scenarioListV2' || n.id === 'scenarioPicker' || n.id === 'restartAct'
      ));
      if (moved) rehome();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
