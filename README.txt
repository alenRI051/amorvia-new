Amorvia Release (Beta) — 2025-08-19

This package contains:
- public/data/*.v2.json  (5 beta scenarios + extras)
- public/data/v2-index.json  (beta list active)
- public/sw.js, public/sw-register.js
- vercel.json (rewrites + headers)

Deploy steps:
1) Copy the 'public/' folder into your project's root (merge/overwrite existing files).
2) Ensure your 'vercel.json' matches the provided file (or merge its headers/rewrites).
3) Deploy. Users will be prompted to refresh when the new SW is ready.
