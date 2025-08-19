Amorvia Fullstack Beta — 2025-08-19

Includes:
- public/data/*.v2.json (5 beta scenarios + 2 extras) + v2-index.json (beta active)
- public/sw.js + public/sw-register.js (VERSION v0.5-2025-08-19; BUILD 2025-08-19.2)
- api/track.js (lightweight metrics endpoint)
- public/js/metrics.js (ESM, also sets window.AmorviaMetrics)
- public/js/metrics-autowire.js (wraps common engine methods)
- vercel.json (rewrites + headers, incl. /sw.js no-cache)
- public/index.metrics.snippet.html (script tags to include)

Deploy:
1) Merge 'public/' and 'api/' into your project root.
2) Ensure 'vercel.json' merges or replaces your config as needed.
3) In your HTML, either import metrics in app.v2.js (ESM) or add:
   <script type="module" src="/js/metrics.js"></script>
   <script type="module" src="/js/metrics-autowire.js"></script>
4) Deploy. Then watch Vercel → Deployments → Function Logs for [metrics] lines.
5) Future deploys: bump VERSION in sw.js and BUILD in sw-register.js to force SW update.
