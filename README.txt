Amorvia v2 loader bundle
========================

Included:
- js/compat/v2-to-graph.js
    • toGraph(doc): convert v2 acts/nodes → flat graph
    • ensureGraph(doc): return doc if already graph-like, else convert

How your loader should use it (matches your snippet):
----------------------------------------------------
    import { ensureGraph } from '/js/compat/v2-to-graph.js';

    const raw = await fetch(`/data/${id}.v2.json`, { cache: 'no-store' }).then(r => r.json());
    const graph = ensureGraph(raw);
    const E = await getEngine();
    E.loadScenario?.(graph);
    E.start?.(graph.startId);

Optional engine tweak (initialize meters):
-----------------------------------------
In js/engine/scenarioEngine.js, inside loadScenario(graph) add:
    this.state.meters = { ...(graph.meters || {}) };

This will show initial meter values immediately in the HUD if your doc defines them.
