
Amorvia Fix Bundle — 2025-08-22T18:34:34

Includes:
- api/track.ts (Edge) -> /api/track returns 204
- public/js/compat/v2-to-graph.js + ensure-graph-hook.js
- public/js/bootstrap.js (imports hook after app.v2.js)
- public/js/metrics.js
- public/data/v2-index.json + one scenario example with schema/version

Apply:
1) Remove any /api/track.js; keep api/track.ts at repo root.
2) Copy /public/js/* into your site; ensure bootstrap loads.
3) Ensure your real scenarios have "schema":"scenario.v2","version":2 and index has "scenario.v2.index".
4) Deploy and test: /api/track -> 204, v2 scenarios load fine.
