Amorvia — Extras Toggle + Labs Tab Bundle — 2025-08-19

Includes:
- public/js/bootstrap.js  → loads v2 app and the extras/labs addon
- public/js/addons/extras-tabs.js  → builds "Scenarios" and "Labs" tabs in the sidebar, plus a "Show extras in main" checkbox
- public/data/v2-index.json  → beta scenarios + extras listed

Install:
1) Copy these files into your project (keep paths):
   - /public/js/bootstrap.js
   - /public/js/addons/extras-tabs.js
   - /public/data/v2-index.json
2) Deploy. With your auto-refresh SW, one reload will show the tabs.
3) Behavior:
   - "Scenarios" tab shows the 5 beta scenarios (optionally includes Extras if the checkbox is checked).
   - "Labs" tab always shows Extras.
   - Clicking an item dispatches 'amorvia:select-scenario' and attempts to call startScenarioById/startScenario if available.

Rollback:
- To disable the addon, revert bootstrap.js or delete /public/js/addons/extras-tabs.js.
