Amorvia Vercel + Metrics Bundle
===============================

Files included:
- vercel.json — updated with correct headers:
  * /data/*.json -> no-store (fresh each request)
  * /css|/js|/assets -> immutable long cache
  * /sw.js -> no-cache
- js/metrics.js — no-op stub to stop 404s (logs to console if ?debug=metrics)

Usage:
1. Unzip at repo root (overwrites vercel.json, creates js/metrics.js).
2. Commit & push:
   git add vercel.json js/metrics.js
   git commit -m "chore: add vercel headers + metrics stub"
   git push

3. Deploy and test:
   https://amorvia.eu/?nosw=1&devcache=0

Now JSONs won’t cache, and /js/metrics.js will resolve without error.
