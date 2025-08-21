Amorvia — Full BETA bundle (beta-2025-08-21)

Included
- index.html (v1 + v2 UIs, v2 anchor ready)
- css: styles.css, ui.patch.css, addons.css
- js: bootstrap (version-locked), app.v2.js, app.js (v1 stub)
- addons: ensure-anchor.js, extras-tabs.js (insert-after + reparent), art-loader.js
- data: v2-index.json + scenario docs (9 scenarios)
- PWA: version.json, sw-register.js, service-worker.js, manifest.json, favicon.png
- assets: backgrounds/room.svg, characters/{male,female}_casual.svg
- vercel.json (no-cache for bootstrap/addons/sw, immutable for assets/css)
- api/track.js (204 stub)

Deploy
1) Upload the contents of /public (and /api + vercel.json if using Vercel) to your root.
2) Bump /public/version.json "version" each release.
3) Normal reload picks up new JS; tabs visible without Ctrl+F5.

Smoke test
- Load /. DevTools console:
  window.__AMORVIA_VERSION__                // -> "beta-2025-08-21"
  !!document.querySelector('#labsTabs')     // -> true
  fetch('/api/track', {method:'POST'})    // -> 204
