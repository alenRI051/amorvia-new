Amorvia — Cache-Bust Tabs Patch — 2025-08-21

Symptom
- Tabs missing on normal reload, appear after Ctrl+F5. Cause: your current Vercel headers mark JS as "immutable" for 1 year, so the browser serves stale JS until a hard refresh.

Fix (two layers)
1) **Import with version query** so URLs change on deploy (included bootstrap.js).
   - Set AV_ASSET_V once per release to any new string.
   - Eager imports:
       import('/js/addons/ensure-anchor.js?v='+AV_ASSET_V).finally(() =>
         import('/js/addons/extras-tabs.js?v='+AV_ASSET_V)
       );
   - App imports also use ?v= to keep everything in sync.

2) **Header overrides** (recommended) so addons and bootstrap are not immutable:
   - Merge vercel.headers.patch.json into your existing vercel.json (or use vercel.example.json as a base).
   - Specifically:
       /js/addons/(.*)  -> Cache-Control: no-cache
       /js/bootstrap.js -> Cache-Control: no-cache

Install
1) Replace /public/js/bootstrap.js with the file in this patch.
2) (Recommended) Update vercel.json headers using vercel.headers.patch.json.
3) Deploy. Normal reload should now show tabs without needing Ctrl+F5.

Notes
- For production, bump AV_ASSET_V on each release (e.g., 'beta-2025-08-21-02').
- If you already have a Service Worker with versioning, you can also mirror the same version value.
