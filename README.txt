Amorvia — BETA Ready Delta Pack — 2025-08-21

This zip bundles the final v2 Scenarios/Labs tabs with anchor helpers and theme.

Files to copy (preserve paths):
- /public/js/addons/extras-tabs.js
- /public/js/addons/ensure-anchor.js
- /public/css/addons.css

Bootstrap (ensure eager import):
  import('/js/addons/ensure-anchor.js').finally(() =>
    import('/js/addons/extras-tabs.js')
  );

HTML (under the v2 Scenario select):
  <!-- Amorvia: mount point for the Scenarios/Labs tabs addon (v2) -->
  <div id="scenarioListV2" class="list v2-only" aria-label="Scenarios"></div>

Checks (Console):
  localStorage.getItem('amorvia:mode');            // "v2"
  !!document.querySelector('#labsTabs');           // true
  document.getElementById('scenarioListV2')
    ?.nextElementSibling?.classList.contains('av-wrap'); // true
