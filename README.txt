Amorvia: Valid vercel.json + metrics stub
========================================

Files included:
- vercel.json      — strict JSON, parses on Vercel
- js/metrics.js    — safe no-op stub so /js/metrics.js never 404s

Apply:
1) Unzip at repo root:
   unzip -o amorvia-vercel-fixed.zip -d .
2) Commit & push:
   git add vercel.json js/metrics.js
   git commit -m "fix: valid vercel.json + metrics stub"
   git push
3) Redeploy on Vercel.
4) Test: https://amorvia.eu/?nosw=1&devcache=0&debug=metrics

You should see no JSON parse errors, no 404 for /js/metrics.js, and fresh /data/*.json.
