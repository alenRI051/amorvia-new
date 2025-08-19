Amorvia SW Refresh Patch
Date: 2025-08-19

Files
- public/sw.js                (VERSION = 'v0.5-2025-08-19')
- public/sw-register.js       (registers /sw.js?v=2025-08-19.2)
- vercel.json                 (adds no-cache header for /sw.js)

Install
1) Copy public/sw.js and public/sw-register.js into your project (overwrite).
2) Ensure vercel.json includes the /sw.js no-cache header (merge or replace).
3) Deploy. Users will be prompted to refresh when the new SW is ready.

Next deploy
- Bump VERSION in sw.js and BUILD in sw-register.js.
