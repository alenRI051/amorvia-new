Amorvia — Extras Tabs (wait-for-anchor) — 2025-08-20

Install
1) Copy to your project (preserve path):
   /public/js/addons/extras-tabs.js

2) (Recommended) Ensure this anchor exists in your left sidebar:
   <div id="scenarioList" class="list v2-only"></div>

3) Import the addon in your v2 bootstrap:
   await import('/js/addons/extras-tabs.js');

Sanity check (DevTools Console)
   await import('/js/addons/extras-tabs.js?t='+Date.now());
   document.querySelector('#labsTabs') !== null
