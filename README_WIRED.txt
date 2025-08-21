
Amorvia Bundle — ensureGraph wired + Edge /api/track

FILES
- public/js/compat/v2-to-graph.js         -> converts scenario.v2 to a graph
- public/js/compat/ensure-graph-hook.js   -> monkey-patches loadScenarioById + listens to 'amorvia:select-scenario'
- public/js/bootstrap.example.js          -> example bootstrap that imports the hook after app.v2.js
- api/track.ts (Edge)                     -> /api/track returns 204

HOW TO APPLY
1) Copy 'public/js/compat/*' into your project.
2) Ensure the hook loads AFTER '/js/app.v2.js'.
   If your bootstrap already exists, just add:
      await import('/js/compat/ensure-graph-hook.js');
   Or replace your bootstrap with 'bootstrap.example.js' (rename to bootstrap.js).
3) Keep ONLY ONE metrics endpoint:
   - prefer Edge: keep '/api/track.ts' and delete any '/api/track.js'
4) Deploy.

VERIFY
- Open '/api/track' -> HTTP 204 No Content.
- Pick a scenario in v2 -> no 'Node not found: undefined'. Graph starts from Act 1 Step 1.
