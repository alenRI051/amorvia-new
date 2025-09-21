
// dom-fixes.v9.3.9.js — rehome scenario picker/list reliably
(function(){
  function findList() {
    // Prefer v2 list
    const cand = [
      document.getElementById('scenarioListV2'),
      document.querySelector('#titleAndList .list.v2-only'),
      // any list with aria-label Scenarios that is *not* the v1 list
      ...document.querySelectorAll('[aria-label="Scenarios"]')
    ].flat().filter(Boolean);

    // Filter out v1 sidebar (#scenarioList)
    const out = cand.find(el => el.id !== 'scenarioList' && el.classList.contains('v2-only') || el.closest('#titleAndList'));
    return out || cand.find(el => el.id !== 'scenarioList');
  }

  function findPicker(){ return document.getElementById('scenarioPicker') || document.querySelector('select[aria-label="Scenario picker"]'); }
  function findRestart(){ return document.getElementById('restartAct') || Array.from(document.querySelectorAll('button')).find(b => /restart\s*act/i.test(b.textContent)); }

  function rehome() {
    const host = document.getElementById('titleAndList');
    if (!host) return;

    // Ensure row container
    let row = host.querySelector(':scope > .row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'row';
      row.style.gap = '.5rem';
      row.style.alignItems = 'center';
      host.prepend(row);
    }

    const picker = findPicker();
    const restart = findRestart();
    const list = findList();

    if (picker && picker.parentElement !== row) row.appendChild(picker);
    if (restart && restart.parentElement !== row) row.appendChild(restart);
    if (list && list.parentElement !== host) {
      list.style.marginTop = '.5rem';
      host.appendChild(list);
    }
  }

  function init() {
    rehome();
    const mo = new MutationObserver(() => rehome());
    mo.observe(document.body, { childList: true, subtree: true });
  }

  (document.readyState === 'loading') ? document.addEventListener('DOMContentLoaded', init) : init();
})();
