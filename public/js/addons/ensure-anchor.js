
/**
 * ensure-anchor.js — ensures a v2 anchor exists
 * Creates <div id="scenarioListV2" class="list v2-only"> if missing.
 */
(function(){
  function ensureAnchor(){
    if (document.getElementById('scenarioListV2')) return;
    const host =
      document.querySelector('aside.card.panel .v2-only') ||
      document.querySelector('.v2-only') ||
      document.querySelector('aside.card.panel') ||
      document.querySelector('aside.sidebar') ||
      document.querySelector('aside') ||
      document.querySelector('.sidebar,.left,.left-pane,.panel') ||
      document.body;

    const anchor = document.createElement('div');
    anchor.id = 'scenarioListV2';
    anchor.className = 'list v2-only';
    if (host.firstChild) host.insertBefore(anchor, host.firstChild.nextSibling || null);
    else host.appendChild(anchor);
    document.dispatchEvent(new CustomEvent('amorvia:anchor-ready'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureAnchor);
  else ensureAnchor();
})();
