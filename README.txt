Amorvia Index + Favicon Fix
===========================

This bundle contains:
- index.html (fixed): correct metrics path, no stray metrics-autowire, includes /js/metrics.js
- favicon.ico: placeholder icon so browsers stop 404'ing /favicon.ico

Steps:
1. Unzip at repo root (overwrites index.html, adds favicon.ico).
2. Commit & push:
   git add index.html favicon.ico
   git commit -m "fix: correct metrics path + add favicon.ico"
   git push
3. Redeploy and test: https://amorvia.eu/?nosw=1&devcache=0
   - Page should no longer be blank
   - No 404 for metrics.js or favicon.ico
