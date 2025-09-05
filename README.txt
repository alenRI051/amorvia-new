Amorvia Deployment Fix
======================

This bundle contains:
- index.html (clean, no stray metrics-autowire, correct /js/metrics.js path)
- vercel.json (SPA rewrite that excludes static files, plus no-store on index.html)

Steps:
1. Unzip at repo root (overwrites index.html and vercel.json).
2. Commit & push:
   git add index.html vercel.json
   git commit -m "fix: clean index.html + vercel.json no-store for index"
   git push
3. Redeploy and test: https://amorvia.eu/?nosw=1&devcache=0
   - Network: /js/bootstrap.js and /js/metrics.js load correctly
   - Document (index.html) is always fresh (no CDN cache)
   - No blank page
