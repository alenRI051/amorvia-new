Amorvia — v1/v2 Toggle Integration Pack
Generated: 2025-08-18

What this does
- Adds a **Mode** dropdown (Classic v1 / Branching v2) directly on /index.html.
- The selected mode is saved to localStorage and loaded on next visit.
- The page loads only the JS for the chosen mode (v1: /js/app.js, v2: /js/app.v2.js).
- Visual sections are shown/hidden per mode (v1: search/list/prev/next; v2: picker/HUD/choices).

Files
- public/index.html         → updated with the Mode select + v2 controls/containers
- public/js/bootstrap.js    → reads mode, sets body class, lazy-loads the correct app module
- public/css/ui.css         → appended mode helper classes
- public/js/app.v2.js       → v2 UI glue (included for convenience)
- public/js/engine/scenarioEngine.js  → engine
- public/schema/scenario.v2.schema.json → schema

How to use
1) Drop files into your repo (preserve paths). Keep your existing /js/app.js (v1).
2) Deploy. On /, pick **Mode → Branching v2** to try the v2 flow; **Mode → Classic v1** to go back.
3) The selection persists. Switching modes triggers a full reload to keep state clean.

Notes
- CSP remains strict (no inline styles/scripts).
- SW registration still respects your '?nosw=1' guard.
- If you have /data/v2-index.json present, app.v2.js will auto-populate the picker.
