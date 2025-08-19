Amorvia Release (Beta + Metrics) — 2025-08-19

Includes:
- public/data/*.v2.json (placeholders for structure) + v2-index.json (beta active)
- Service Worker: public/sw.js + public/sw-register.js
- Metrics: api/track.js (server) + public/js/metrics.js (client)
- vercel.json (rewrites + headers, incl. /sw.js no-cache)
- public/index.metrics.snippet.html (where to place metrics script tag)

Install:
1) Merge 'public/' and 'api/' into your project (preserve your existing index.html).
2) Ensure 'vercel.json' merges in the rewrites+headers shown here.
3) Add this tag to your HTML:
   <script src="/js/metrics.js" defer></script>
4) Deploy. Then check Vercel → Deployments → Function Logs for lines starting with [metrics].

Notes:
- Replace placeholder scenario files with your real content as needed (this package focuses on wiring).
- Next SW deploy: bump VERSION in sw.js and BUILD in sw-register.js.
