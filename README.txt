Amorvia — V2 Anchor + Tabs Patch — 2025-08-21

Files
- /public/js/addons/extras-tabs.js     (prefers #scenarioListV2, replaces anchor, CSS auto-inject)
- /public/js/addons/ensure-anchor.js   (creates #scenarioListV2 if missing)
- /public/snippets/scenarioListV2-anchor.html

Install
1) Copy the JS files into your project (preserve paths).
2) (Recommended) Add this under the v2 Scenario select in your sidebar:
   <!-- Amorvia: mount point for the Scenarios/Labs tabs addon (v2) -->
<div id="scenarioListV2" class="list v2-only" aria-label="Scenarios"></div>
3) Ensure your bootstrap eagerly imports:
   import('/js/addons/ensure-anchor.js').finally(() => import('/js/addons/extras-tabs.js'));

Checks
   (await fetch('/js/addons/extras-tabs.js')).status   // 200
   document.getElementById('scenarioListV2') !== null  // true after reload
   document.querySelector('#labsTabs') !== null        // tabs visible
