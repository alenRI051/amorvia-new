Amorvia — Service Worker Auto-Refresh Patch
Date: 2025-08-19

What this does
- Switches SW to **auto-refresh** (no prompt). When a new SW is ready, it activates immediately and the page reloads **once**.
- Bumps VERSION in sw.js to 'v0.6-2025-08-19' and BUILD in sw-register.js to '2025-08-19.3'.

Install
1) Replace your existing files:
   - public/sw.js
   - public/sw-register.js
2) Ensure vercel.json still has:
   {
     "headers": [{ "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }]
   }
3) Deploy.

Notes
- The register script guards against reload loops with sessionStorage.
- On future deploys, bump both VERSION (sw.js) and BUILD (sw-register.js).
