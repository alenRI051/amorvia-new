// Compact UI toggle: adds body.ui-compact and persists; triggers re-fit via resize
(function(){
  const LS = 'amorvia:ui:compact';

  function applyState() {
    const on = localStorage.getItem(LS) === '1';
    document.body.classList.toggle('ui-compact', on);
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }

  function mountToggle() {
    const host = document.querySelector('.stage .panel.toolbar.row') 
              || document.querySelector('.stage .panel.toolbar')
              || document.getElementById('topBar');
    if (!host || host.querySelector('#compactUiToggle')) return;

    const wrap = document.createElement('label');
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '.35rem';
    wrap.style.marginLeft = '.5rem';

    const cb = Object.assign(document.createElement('input'), { 
      type: 'checkbox',
      id: 'compactUiToggle'
    });
    cb.checked = localStorage.getItem(LS) === '1';
    cb.addEventListener('change', () => {
      localStorage.setItem(LS, cb.checked ? '1' : '0');
      applyState();
    });

    const txt = document.createElement('span');
    txt.textContent = 'Compact UI';

    wrap.appendChild(cb);
    wrap.appendChild(txt);
    host.appendChild(wrap);
  }

  document.addEventListener('DOMContentLoaded', () => {
    mountToggle();
    applyState();
  }, { once: true });
})();
