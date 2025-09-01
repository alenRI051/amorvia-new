
Amorvia engine autoload patch — 20250822-193236

This version of /public/js/app.v2.js will try multiple likely paths for the engine:
- /js/engine/scenarioEngine.js
- /js/engine/scenario-engine.js
- /js/engine/ScenarioEngine.js
- /js/scenarioEngine.js
- /js/ScenarioEngine.js
- /engine/scenarioEngine.js
- /engine/ScenarioEngine.js
- /scenarioEngine.js

It attaches the found engine to window.ScenarioEngine for compatibility, then starts
the scenario after converting v2 → graph.

Apply:
1) Replace /public/js/app.v2.js with this one.
2) Hard refresh (Shift+Reload). If a SW is active:
   const reg = await navigator.serviceWorker.getRegistration(); await reg?.update();

Verify in console:
   await AmorviaV2.loadScenarioById('co-parenting-with-bipolar-partner');
   typeof ScenarioEngine   // should become "object" or "function"
