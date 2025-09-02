Amorvia BETA bundle — v0.6-2025-09-01

What this includes
- index.html (CSP-safe, no inline JS except build stamp)
- css/*  (base + addon tabs)
- js/bootstrap.js  (mode switch, loads v2 app + addons)
- js/app.v2.js     (robust engine autoload + compat loader)
- js/compat/v2-to-graph.js (ultra-robust converter)
- js/engine/scenarioEngine.js (small engine)
- js/addons/{extras-tabs,art-loader}.js
- sw.js + sw-register.js (offline, auto-refresh)
- data/v2-index.json + sample scenario .v2.json files

Install
1) Upload everything to your site root preserving folders.
2) Hard refresh. If a Service Worker is present, in DevTools console run:
   const reg = await navigator.serviceWorker.getRegistration(); await reg?.update(); location.reload();

Notes
- Replace any sample scenarios in /data with your full content.
- The converter will accept acts.steps OR acts.nodes (array or map).
- Extras/Labs tabs are injected into the left sidebar (id scenarioListV2).
