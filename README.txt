Amorvia — Scenario v2 UI Wiring Pack
Generated: 2025-08-18

New page:
- public/v2.html  → standalone demo page for the v2 engine

Scripts:
- public/js/app.v2.js           → renders v2 nodes (lines, choices), HUD, keyboard shortcuts
- public/js/engine/scenarioEngine.js  → the tiny engine (included for convenience)

Styles:
- public/css/ui.css (appended)  → HUD + choices styles appended safely

Data:
- public/data/co-parenting-with-bipolar-partner.v2.json  → example v2 scenario
- public/schema/scenario.v2.schema.json                  → schema

How to try it:
1) Copy these files into your repo (preserve paths).
2) Deploy (or run locally).
3) Visit /v2.html — use number keys (1/2/3) to pick choices, "Restart Act" to reset.

Next steps (optional):
- Convert more scenarios to v2: create /public/data/<id>.v2.json following the schema.
- Add a v2 index (data/v2-index.json) and populate the picker dynamically.
- Add runtime caching for /data/*.v2.json in your service worker.
