
Amorvia Patch — Engine compatibility + Edge metrics endpoint

FILES
- public/js/compat/v2-to-graph.js
    Exports:
      toGraph(v2)     -> converts scenario.v2 (acts/steps/choices) into graph {startId,nodes}
      ensureGraph(doc)-> returns doc if already graph; otherwise converts v2

HOW TO WIRE (example)
  // wherever you load a scenario JSON for scenarioEngine:
  import { ensureGraph } from '/js/compat/v2-to-graph.js';
  const doc = await fetch(`/data/${id}.v2.json`, { cache: 'no-cache' }).then(r=>r.json());
  const graphDoc = ensureGraph(doc);
  // Then pass graphDoc to your engine:
  ScenarioEngine.loadScenario(graphDoc);
  ScenarioEngine.startAct?.(0)  // if your API uses acts
  // or ScenarioEngine.start(graphDoc.startId)

METRICS (avoid 500)
- Place api/track.ts at repo root. This is an Edge Function returning 204.
- Remove/rename any previous /api/track.js to avoid conflicts.
- Test: curl -i https://<your-domain>/api/track  -> HTTP/1.1 204 No Content

