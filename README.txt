Amorvia Scenario v2 — Schema + Tiny Engine
Generated: 2025-08-18

Files
- public/schema/scenario.v2.schema.json
- public/js/engine/scenarioEngine.js
- public/data/example-co-parenting.v2.json

How to use
1) Put your v2 scenario JSONs in /public/data/<id>.v2.json following the schema.
2) In your UI, import the engine:
   import { ScenarioEngine, formatDeltas } from '/js/engine/scenarioEngine.js';
3) Load & start:
   const eng = new ScenarioEngine();
   const s = await eng.fetchById('co-parenting-with-bipolar-partner');
   eng.loadScenario(s);
   eng.subscribe(state => { /* re-render UI here */ });
   eng.startAct('a1');
4) Advance:
   const node = eng.currentNode();
   if (node.type === 'line') eng.lineNext();
   if (node.type === 'choice') eng.choose(0); // or 1,2... index of selection
5) Show summary:
   formatDeltas(eng.deltas());

Validate in CI (ajv)
- npm i -D ajv ajv-cli
- npx ajv -s public/schema/scenario.v2.schema.json -d public/data/*.v2.json

Notes
- JSON Schema can't enforce that "next"/"to" reference existing node ids; the engine will throw if a link is broken.
- Use the "meters" root object to set starting values/labels per scenario; otherwise defaults are used.
