
// dom-fixes.v9.3.2.js — move scenario controls under title
(function(){
  function move() {
    const host = document.getElementById('titleAndList');
    if (!host) return;
    const picker = document.getElementById('scenarioPicker');
    const list   = document.getElementById('scenarioListV2');
    const btn    = document.getElementById('restartAct');
    if (!picker && !list && !btn) return;

    const wrap = document.createElement('div');
    wrap.className = 'card panel';
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = 'minmax(220px,1fr) auto';
    wrap.style.gap = '.5rem';
    wrap.style.alignItems = 'center';

    if (picker) wrap.appendChild(picker);
    if (btn) { btn.classList.add('mt0'); wrap.appendChild(btn); }
    host.appendChild(wrap);

    if (list) {
      list.style.marginTop = '.5rem';
      host.appendChild(list);
    }
  }
  (document.readyState === 'loading') ? document.addEventListener('DOMContentLoaded', move) : move();
})();
