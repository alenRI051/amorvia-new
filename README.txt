Amorvia — Tabs Anchor Patch — 2025-08-20

What this fixes
- Ensures the Scenarios/Labs tabs have a reliable mount point in the left sidebar.
- Adds a more robust mount fallback in extras-tabs.js.
- Includes themed CSS for hover/active states.

Install
1) Add the anchor right under your Scenario select in the LEFT sidebar:
   File: public/snippets/scenarioList-anchor.html
   Snippet to paste:
   --------------------------------------------------
   <div id="scenarioList" class="list v2-only"></div>
   --------------------------------------------------

2) Copy these files into your project (preserve paths):
   - /public/js/addons/extras-tabs.js
   - /public/css/addons.css

3) Ensure your bootstrap loads the addon for v2:
   await import('/js/addons/extras-tabs.js');

4) Deploy and reload once. You should now see the Scenarios/Labs tabs and the "Show extras in main" checkbox.

Sanity check (DevTools Console)
   await import('/js/addons/extras-tabs.js?t='+Date.now());
   !!document.querySelector('#labsTabs');  // should be true
