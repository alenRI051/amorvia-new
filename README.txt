Amorvia — extras-tabs.js tweak — 2025-08-20

Changes included
- Reuse the already-declared EXTRA_IDS for filtering.
- Mount exactly at #scenarioList if present (replaces the anchor); otherwise append to the closest sidebar.
- Keeps CSP-safe CSS auto-injection of /css/addons.css.

Install
1) Copy to your project (preserve path):
   /public/js/addons/extras-tabs.js
2) Ensure you have the anchor in your left sidebar:
   <div id="scenarioList" class="list v2-only"></div>
3) Your bootstrap v2 branch should import the addon:
   await import('/js/addons/extras-tabs.js');
4) Deploy and reload once.

Sanity check
  await import('/js/addons/extras-tabs.js?t='+Date.now());
  document.querySelector('#labsTabs') !== null  // should be true
