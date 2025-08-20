Amorvia — Eager Tabs Bootstrap Patch — 2025-08-20

What this does
- Eager-loads /js/addons/extras-tabs.js when mode === 'v2' so tabs appear immediately on refresh.
- Keeps the heavier v2 app and art-loader lazily loaded on user interaction or idle.

Install
1) Replace your /public/js/bootstrap.js with the one in this patch.
2) Ensure these files exist in your project:
   - /public/js/addons/extras-tabs.js
   - /public/js/addons/art-loader.js
   - (optional CSS for tabs: /public/css/addons.css — auto-injected by the addon)
3) Confirm your sidebar has the anchor:
   <div id="scenarioList" class="list v2-only"></div>
4) Deploy and reload once.

Dev tip (if SW caches old scripts):
- Temporarily change the eager import to: import('/js/addons/extras-tabs.js?t='+Date.now())

Smoke test (Console)
  document.querySelector('#labsTabs')?.id           // → "labsTabs"
  localStorage.getItem('amorvia:mode')              // → "v2"
