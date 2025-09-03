Amorvia Metrics Path Fix + Favicon Redirect
==========================================

This patch fixes the bad '/is/metrics.js' path by replacing it with an
autowire that injects the correct '/js/metrics.js'. It also redirects
'/favicon.ico' to '/favicon.png' to eliminate the 404.

Files:
- metrics-autowire.js           (drop at repo root; include via <script src="/metrics-autowire.js" defer></script>)
- js/metrics.js                 (no‑op stub, safe to load)
- vercel.json                   (adds redirect /favicon.ico -> /favicon.png, keeps data no-store etc.)

Steps:
1) Unzip to repo root (overwrite vercel.json if prompted).
2) Ensure index.html includes (near end of body):
   <script src="/metrics-autowire.js" defer></script>
   (Remove any older autowire that pointed to '/is/metrics.js'.)
3) Commit & deploy.
4) Test: https://amorvia.eu/?nosw=1&devcache=0&debug=metrics
   - Network: /metrics-autowire.js 200, /js/metrics.js 200
   - Console: "[metrics] autowire injected /js/metrics.js"
   - /favicon.ico should 308/301 -> /favicon.png
