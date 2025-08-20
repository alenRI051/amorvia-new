Amorvia — Tabs + Anchor + Eager Bootstrap Bundle — 2025-08-20

This bundle ensures the Scenarios/Labs tabs are visible immediately after refresh:
- /js/addons/ensure-anchor.js creates #scenarioList if missing.
- /js/addons/extras-tabs.js mounts tabs (waits briefly for the anchor; falls back if needed).
- /js/bootstrap.js eagerly imports both when mode === 'v2', while keeping the heavy app lazy.

Install
1) Copy files to your project, preserving paths:
   - /public/js/bootstrap.js
   - /public/js/addons/ensure-anchor.js
   - /public/js/addons/extras-tabs.js
   - /public/css/addons.css   (theme for tabs; optional but recommended)

2) (Permanent HTML anchor recommended) In your left sidebar add:
   <!-- Amorvia: mount point for the Scenarios/Labs tabs addon -->
<div id="scenarioList" class="list v2-only"></div>

3) Deploy and reload once.

Sanity checks (Console)
   localStorage.getItem('amorvia:mode');                     // "v2"
   (await fetch('/js/addons/ensure-anchor.js')).status;      // 200
   (await fetch('/js/addons/extras-tabs.js')).status;        // 200
   document.querySelector('#labsTabs') !== null;             // true after reload

Notes
- Service Worker caching: during dev you may add '?t='+Date.now() to imports in bootstrap.js.
- The addons are CSP-safe, no inline styles or eval.
