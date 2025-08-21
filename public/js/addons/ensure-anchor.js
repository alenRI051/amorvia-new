// /public/js/addons/ensure-anchor.js
(function(){
  function ensureAnchor(){
    if (document.getElementById('scenarioListV2')) return;

    const sel = document.getElementById('scenarioPicker');
    const anchor = document.createElement('div');
    anchor.id = 'scenarioListV2';
    anchor.className = 'list v2-only';
    anchor.setAttribute('aria-label','Scenarios');

    if (sel) {
      sel.insertAdjacentElement('afterend', anchor);
    } else {
      // fallback (still v2-only if possible)
      const host =
        document.querySelector('aside.card.panel .v2-only') ||
        document.querySelector('.v2-only') ||
        document.body;
      host.appendChild(anchor);
    }

    document.dispatchEvent(new CustomEvent('amorvia:anchor-ready'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureAnchor);
  else ensureAnchor();
})();

