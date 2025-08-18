Amorvia — Scenario v2 All-in-one Upgrade
Generated: 2025-08-18

Included
1) v2 index & auto-picker
   - public/data/v2-index.json
   - public/js/app.v2.js (auto-populates picker from v2-index.json)

2) Runtime cache for /data/*.v2.json (SW)
   - public/service-worker.js adds stale-while-revalidate for v2 JSON

3) Converted scenario (v1 → v2)
   - public/data/scene-different-rules.v2.json

4) CI validation (AJV)
   - .github/workflows/validate-v2.yml

Bonus (for convenience)
   - public/schema/scenario.v2.schema.json
   - public/js/engine/scenarioEngine.js

How to apply
1) Copy these files into your repo (preserve paths).
2) If you already have a customized service worker, merge the 'fetch' handler for '/data/*.v2.json' from this SW into yours (or replace if you prefer).
3) Deploy, then visit /v2.html and try both scenarios from the picker.
4) On your next PR, the CI will validate any *.v2.json against the schema automatically.

Notes
- The SW respects your existing sw-register.js guard (use '?nosw=1' to skip in Lighthouse/CI).
- Add more scenarios by dropping files into /public/data/<id>.v2.json and listing them in /public/data/v2-index.json.
