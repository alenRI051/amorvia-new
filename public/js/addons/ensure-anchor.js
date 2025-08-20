
/**
 * ensure-anchor.js — creates the #scenarioList mount point if it's missing.
 * Runs on DOMContentLoaded. CSP-safe, no inline styles.
 */
(function(){
  function ensureAnchor(){
    if (document.getElementById('scenarioList')) return;

    // Find a sensible left sidebar container
    const host =
      document.querySelector('aside.card.panel') ||
      document.querySelector('aside.sidebar') ||
      document.querySelector('aside') ||
      document.querySelector('.sidebar,.left,.left-pane,.panel') ||
      document.body;

    const anchor = document.createElement('div');
    anchor.id = 'scenarioList';
    anchor.className = 'list v2-only';
    // place near top for sidebars, otherwise prepend to body
    if (host === document.body) {
      document.body.insertBefore(anchor, document.body.firstChild || null);
    } else {
      host.appendChild(anchor);
    }
    document.dispatchEvent(new CustomEvent('amorvia:anchor-ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureAnchor);
  } else {
    ensureAnchor();
  }
})();
