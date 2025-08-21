
Amorvia Patch — schema/version + metrics endpoint

WHAT
- Adds "schema":"scenario.v2" and "version":2 to every scenario JSON in /public/data/*.v2.json
- Adds "schema":"scenario.v2.index","version":2 to /public/data/v2-index.json
- Provides /public/js/metrics.js exporting { track } (client helper)
- Provides /api/track.js that returns 204 (no body) — safe for Vercel

HOW
1) Copy /public/data/*.v2.json and /public/data/v2-index.json into your deployment (replace existing files).
2) Place /api/track.js at the REPO ROOT (NOT under /public) if you use Vercel.
3) If your app imports './metrics.js' and called 'track', it will now resolve.
   If not yet imported, you can also safely ignore this file.

VERIFY
- Open a scenario: engine error "Unsupported scenario version" should be gone.
- Open /api/track in browser: should return 204 No Content.
- In console: import('/js/metrics.js').then(m => m.track('ping'))
