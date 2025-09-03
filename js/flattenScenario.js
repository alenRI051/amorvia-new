// flattenScenario.js
export function flattenScenario(v2) {
  const nodes = {};
  let firstId = null;
  for (const act of (v2.acts || [])) {
    for (const n of (act.nodes || [])) {
      if (!firstId) firstId = n.id;
      nodes[n.id] = n;
    }
  }
  return {
    title: v2.title || "Scenario",
    variables: v2.variables || {},
    nodes,
    startId: v2.startId || firstId || Object.keys(nodes)[0]
  };
}
